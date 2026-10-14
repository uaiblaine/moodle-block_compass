// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * A minimal Chrome DevTools Protocol client for the screenshot capture: no dependency beyond
 * Node 22+ (global WebSocket, fetch).
 *
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {spawn} from 'node:child_process';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const CHROME = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Launch a headless Chrome and connect to its browser target.
 *
 * @returns {Promise<Browser>}
 */
export const launch = async() => {
    const profile = mkdtempSync(join(tmpdir(), 'compass-capture-'));
    const port = 9300 + Math.floor(Math.random() * 500);
    const child = spawn(CHROME, [
        '--headless=new',
        `--remote-debugging-port=${port}`,
        `--user-data-dir=${profile}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-extensions',
        '--hide-scrollbars',
        '--force-color-profile=srgb',
        '--font-render-hinting=none',
        '--lang=en-GB',
        'about:blank',
    ], {stdio: 'ignore'});
    let version = null;
    for (let i = 0; i < 100 && !version; i++) {
        await sleep(100);
        try {
            version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
        } catch {
            version = null;
        }
    }
    if (!version) {
        child.kill();
        throw new Error('Chrome did not start');
    }
    const browser = new Browser(version.webSocketDebuggerUrl, async() => {
        const exited = new Promise((resolve) => child.once('exit', resolve));
        child.kill();
        await exited;
        // Chrome's helpers may still be flushing the profile: a leftover temp directory is harmless.
        try {
            rmSync(profile, {recursive: true, force: true, maxRetries: 5, retryDelay: 200});
        } catch {
            // Left for the OS to clean.
        }
    });
    await browser.open();
    return browser;
};

/**
 * The browser connection: one socket, many flattened page sessions.
 */
class Browser {
    constructor(url, cleanup) {
        this.url = url;
        this.cleanup = cleanup;
        this.id = 0;
        this.pending = new Map();
        this.listeners = new Set();
    }

    open() {
        this.socket = new WebSocket(this.url);
        this.socket.onmessage = (message) => {
            const data = JSON.parse(message.data);
            if (data.id && this.pending.has(data.id)) {
                const {resolve, reject} = this.pending.get(data.id);
                this.pending.delete(data.id);
                if (data.error) {
                    reject(new Error(`${data.error.message} ${data.error.data || ''}`));
                } else {
                    resolve(data.result);
                }
            } else if (data.method) {
                this.listeners.forEach((listener) => listener(data));
            }
        };
        return new Promise((resolve) => {
            this.socket.onopen = resolve;
        });
    }

    send(method, params = {}, sessionId = undefined) {
        const id = ++this.id;
        this.socket.send(JSON.stringify({id, method, params, sessionId}));
        return new Promise((resolve, reject) => this.pending.set(id, {resolve, reject}));
    }

    async newPage() {
        const {targetId} = await this.send('Target.createTarget', {url: 'about:blank'});
        const {sessionId} = await this.send('Target.attachToTarget', {targetId, flatten: true});
        const page = new Page(this, sessionId, targetId);
        await page.send('Page.enable');
        await page.send('Runtime.enable');
        await page.send('Network.enable');
        return page;
    }

    async close() {
        this.socket.close();
        await this.cleanup();
    }
}

/**
 * One tab.
 */
class Page {
    constructor(browser, sessionId, targetId) {
        this.browser = browser;
        this.sessionId = sessionId;
        this.targetId = targetId;
        this.errors = [];
        browser.listeners.add((data) => {
            if (data.sessionId !== sessionId) {
                return;
            }
            if (data.method === 'Runtime.exceptionThrown') {
                this.errors.push(data.params.exceptionDetails.text);
            }
            if (data.method === 'Runtime.consoleAPICalled' && data.params.type === 'error') {
                this.errors.push(data.params.args.map((arg) => arg.value || arg.description).join(' '));
            }
        });
    }

    send(method, params = {}) {
        return this.browser.send(method, params, this.sessionId);
    }

    /**
     * Emulate a viewport.
     *
     * @param {number} width CSS pixels.
     * @param {number} height CSS pixels.
     * @param {boolean} mobile Phone emulation (touch, mobile viewport).
     */
    async viewport(width, height, mobile = false) {
        // Input events outside the real window are dropped: size the window as well as the emulation.
        const {windowId} = await this.browser.send('Browser.getWindowForTarget', {targetId: this.targetId});
        await this.browser.send('Browser.setWindowBounds', {windowId, bounds: {width: width + 40, height: height + 140}});
        await this.send('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 2, mobile});
        if (mobile) {
            await this.send('Emulation.setTouchEmulationEnabled', {enabled: true, maxTouchPoints: 5});
        }
    }

    /**
     * Grow the viewport to the page's full height, so that every element is on screen: lazy
     * images load, and pointer events reach elements that a scroll would otherwise have to find.
     *
     * @param {number} width CSS pixels.
     * @param {boolean} mobile Phone emulation.
     */
    async fit(width, mobile = false) {
        const height = await this.eval(`Math.max(document.documentElement.scrollHeight,
            (document.querySelector('#page') || document.body).scrollHeight + 70)`);
        await this.viewport(width, Math.min(Math.ceil(height), 8000), mobile);
        await sleep(400);
    }

    async cookie(origin, pair) {
        const [name, ...rest] = pair.split('=');
        await this.send('Network.setCookie', {name, value: rest.join('='), url: origin, httpOnly: true});
    }

    async goto(url) {
        const loaded = new Promise((resolve) => {
            const listener = (data) => {
                if (data.sessionId === this.sessionId && data.method === 'Page.loadEventFired') {
                    this.browser.listeners.delete(listener);
                    resolve();
                }
            };
            this.browser.listeners.add(listener);
        });
        await this.send('Page.navigate', {url});
        await loaded;
    }

    async eval(expression) {
        const result = await this.send('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true});
        if (result.exceptionDetails) {
            throw new Error(`${expression.slice(0, 120)}: ${result.exceptionDetails.exception?.description}`);
        }
        return result.result.value;
    }

    /**
     * Wait until an expression is truthy.
     *
     * @param {string} expression JavaScript.
     * @param {number} timeout Milliseconds.
     */
    async until(expression, timeout = 20000) {
        const end = Date.now() + timeout;
        while (Date.now() < end) {
            if (await this.eval(`!!(${expression})`)) {
                return;
            }
            await sleep(150);
        }
        throw new Error(`Timed out waiting for ${expression}`);
    }

    /**
     * The page-coordinates box of the first element matching a selector, or of several, united.
     *
     * @param {string|string[]} selectors CSS selectors.
     * @param {number} pad CSS pixels around.
     * @returns {Promise<{x:number,y:number,width:number,height:number}>}
     */
    async box(selectors, pad = 0) {
        const list = JSON.stringify([].concat(selectors));
        const box = await this.eval(`(() => {
            const rects = ${list}.map((s) => document.querySelector(s)).filter(Boolean)
                .map((e) => e.getBoundingClientRect());
            if (!rects.length) { return null; }
            const x = Math.min(...rects.map((r) => r.left)), y = Math.min(...rects.map((r) => r.top));
            const r = Math.max(...rects.map((r) => r.right)), b = Math.max(...rects.map((r) => r.bottom));
            return {x: x + scrollX, y: y + scrollY, width: r - x, height: b - y};
        })()`);
        if (!box) {
            throw new Error(`No element for ${list}`);
        }
        return {x: box.x - pad, y: box.y - pad, width: box.width + 2 * pad, height: box.height + 2 * pad};
    }

    /**
     * The viewport centre of an element, scrolled into view first.
     *
     * @param {string} selector CSS selector.
     */
    async centre(selector) {
        return this.eval(`(() => {
            const e = document.querySelector(${JSON.stringify(selector)});
            e.scrollIntoView({block: 'nearest', inline: 'nearest'});
            const r = e.getBoundingClientRect();
            return {x: r.left + r.width / 2, y: r.top + r.height / 2};
        })()`);
    }

    async hover(selector) {
        const {x, y} = await this.centre(selector);
        await this.send('Input.dispatchMouseEvent', {type: 'mouseMoved', x, y});
    }

    async click(selector) {
        const {x, y} = await this.centre(selector);
        await this.send('Input.dispatchMouseEvent', {type: 'mouseMoved', x, y});
        await this.send('Input.dispatchMouseEvent', {type: 'mousePressed', x, y, button: 'left', clickCount: 1});
        await this.send('Input.dispatchMouseEvent', {type: 'mouseReleased', x, y, button: 'left', clickCount: 1});
    }

    async tap(selector) {
        const {x, y} = await this.centre(selector);
        await this.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x, y}]});
        await this.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
    }

    async mouseAway() {
        await this.send('Input.dispatchMouseEvent', {type: 'mouseMoved', x: 1, y: 1});
    }

    /**
     * A PNG of a page region at the emulated device scale.
     *
     * @param {{x:number,y:number,width:number,height:number}} clip Page coordinates.
     * @returns {Promise<Buffer>}
     */
    async shot(clip) {
        const {data} = await this.send('Page.captureScreenshot', {
            format: 'png',
            captureBeyondViewport: false,
            clip: {...clip, scale: 1},
        });
        return Buffer.from(data, 'base64');
    }

    /**
     * A PNG of what the viewport shows, fixed elements where the screen has them.
     *
     * @returns {Promise<Buffer>}
     */
    async screen() {
        const {data} = await this.send('Page.captureScreenshot', {format: 'png'});
        return Buffer.from(data, 'base64');
    }

    async close() {
        await this.browser.send('Target.closeTarget', {targetId: this.targetId});
    }
}

export {sleep};
