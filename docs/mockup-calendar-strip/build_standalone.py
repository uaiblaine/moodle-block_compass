#!/usr/bin/env python3
"""Build standalone HTML pages from the canvas artboards in this folder.

The .dc.html files are the design canvas's own format: a template with {{holes}}, <sc-for> and
<sc-if>, and a `class Component extends DCLogic` script, rendered by the canvas runtime. A browser
opening one from disk has no runtime, so this script rewrites each artboard into a page that runs
the same template and the same logic on Preact + htm (loaded from cdn.jsdelivr.net), with the
artboard's tweaks as a small floating panel.

Usage: python3 build_standalone.py   (writes html/<artboard>.html and html/index.html; an artboard
listed in canvas.json but absent from the folder is skipped)
Only the subset of the format these artboards use is supported: dotted-path holes, whole and
interpolated attribute holes, <sc-for list as>, <sc-if value>, and the hint-* attributes (dropped).
"""

import html as htmllib
import json
import pathlib
import re

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / 'html'
PREACT = 'https://cdn.jsdelivr.net/npm/preact@10.24.3/dist/preact.module.js'
HTM = 'https://cdn.jsdelivr.net/npm/htm@3.1.1/dist/htm.module.js'

TOKEN = re.compile(
    r'(?P<foropen><sc-for\s+list="\{\{\s*(?P<list>[^}]+?)\s*\}\}"\s+as="(?P<as>\w+)"\s*>)'
    r'|(?P<forclose></sc-for>)'
    r'|(?P<ifopen><sc-if\s+value="\{\{\s*(?P<cond>[^}]+?)\s*\}\}"\s*>)'
    r'|(?P<ifclose></sc-if>)'
    r'|(?P<attr>(?P<aname>[A-Za-z_:][-\w:.]*)="(?P<aval>[^"<>]*\{\{[^"<>]*)")'
    r'|(?P<hole>\{\{\s*(?P<path>[^}]+?)\s*\}\})'
)
HOLE = re.compile(r'\{\{\s*([^}]+?)\s*\}\}')


def expr(path, scope):
    """Turns a dotted lookup into a JS expression in the current loop scope."""
    path = path.strip()
    if path in ('true', 'false', 'null') or re.fullmatch(r'-?\d+(\.\d+)?', path):
        return path
    if path == '$index':
        return scope[-1][1] if scope else '0'
    root = path.split('.')[0]
    names = [s[0] for s in scope]
    return path if root in names else 'v.' + path


def convert_template(src):
    """Rewrites the artboard's markup into the body of an htm template."""
    src = re.sub(r'\s+hint-[\w-]+="[^"]*"', '', src)
    # htm is JSX-like: a void element must close itself or it swallows its siblings.
    src = re.sub(r'<(input|img|br|hr|wbr|source|col|embed)(\b[^<>]*?)(?<!/)>', r'<\1\2 />', src)
    src = src.replace('`', '\\`')
    out = []
    pos = 0
    scope = []  # (loop variable, index variable) per open <sc-for>.
    stack = []  # 'for' or 'if', to close each block correctly.
    for m in TOKEN.finditer(src):
        out.append(src[pos:m.start()])
        pos = m.end()
        if m.group('foropen'):
            idx = '__i%d' % len(scope)
            out.append('${(%s || []).map((%s, %s) => html`' % (expr(m.group('list'), scope), m.group('as'), idx))
            scope.append((m.group('as'), idx))
            stack.append('for')
        elif m.group('forclose'):
            assert stack.pop() == 'for'
            scope.pop()
            out.append('`)}')
        elif m.group('ifopen'):
            out.append('${(%s) ? html`' % expr(m.group('cond'), scope))
            stack.append('if')
        elif m.group('ifclose'):
            assert stack.pop() == 'if'
            out.append('` : null}')
        elif m.group('attr'):
            name, val = m.group('aname'), m.group('aval')
            whole = HOLE.fullmatch(val.strip())
            if whole:
                out.append('%s=${%s}' % (name, expr(whole.group(1), scope)))
            else:
                inner = HOLE.sub(lambda h: '${%s}' % expr(h.group(1), scope), val)
                out.append('%s=${`%s`}' % (name, inner))
        else:
            out.append('${%s}' % expr(m.group('path'), scope))
    out.append(src[pos:])
    assert not stack, 'unclosed block'
    return ''.join(out)


def build(dc):
    text = dc.read_text(encoding='utf-8')
    title = re.search(r'<title>(.*?)</title>', text, re.S).group(1).strip()
    helmet = re.search(r'<helmet>(.*?)</helmet>', text, re.S).group(1)
    body = re.search(r'</helmet>(.*?)</x-dc>', text, re.S).group(1)
    script = re.search(r'<script type="text/x-dc" data-dc-script data-props=(\'[^\']*\'|"[^"]*")>(.*?)</script>', text, re.S)
    props = json.loads(htmllib.unescape(script.group(1)[1:-1]))
    logic = script.group(2)
    defaults = {k: v.get('default') for k, v in props.items() if not k.startswith('$') and 'default' in v}
    tweaks = {k: v for k, v in props.items() if not k.startswith('$') and v.get('editor')}
    template = convert_template(body)
    page = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
{helmet}
<style>
.dcx-tweaks{{position:fixed;right:16px;bottom:16px;z-index:9999;background:#fff;color:#1d2125;border:1px solid #d5dade;
  border-radius:12px;padding:10px 12px;font:13px system-ui,sans-serif;box-shadow:0 10px 30px -12px rgba(0,0,0,.35);
  display:flex;flex-direction:column;gap:6px;min-width:190px}}
.dcx-tweaks b{{font-weight:600}}
.dcx-tweaks label{{display:flex;justify-content:space-between;align-items:center;gap:10px}}
.dcx-tweaks a{{color:#0f6cbf}}
</style>
</head>
<body>
<div id="dcx-root"></div>
<script type="module">
import {{ h, render, Component as PreactComponent }} from '{PREACT}';
import htm from '{HTM}';
const html = htm.bind(h);
class DCLogic extends PreactComponent {{}}
{logic}
Component.prototype.render = function () {{
  const v = this.renderVals();
  return html`{template}`;
}};
const TWEAKS = {json.dumps(tweaks)};
class Shell extends PreactComponent {{
  constructor(props) {{ super(props); this.state = {json.dumps(defaults)}; }}
  render() {{
    const rows = Object.entries(TWEAKS).map(([key, t]) => {{
      const set = (value) => this.setState({{ [key]: value }});
      if (t.editor === 'boolean') {{
        return html`<label>${{key}} <input type="checkbox" checked=${{!!this.state[key]}} onChange=${{(e) => set(e.target.checked)}} /></label>`;
      }}
      if (t.editor === 'enum') {{
        return html`<label>${{key}} <select value=${{this.state[key]}} onChange=${{(e) => set(e.target.value)}}>
          ${{t.options.map((o) => html`<option value=${{o}}>${{o}}</option>`)}}</select></label>`;
      }}
      if (t.editor === 'range' || t.editor === 'int') {{
        return html`<label>${{key}} <input type="number" min=${{t.min}} max=${{t.max}} step=${{t.step || 1}} value=${{this.state[key]}}
          onChange=${{(e) => set(Number(e.target.value))}} style="width: 80px" /></label>`;
      }}
      return null;
    }});
    return html`<${{Component}} ...${{this.state}} />${{rows.length ? html`<aside class="dcx-tweaks" aria-label="Mockup tweaks">
      <b>Tweaks</b>${{rows}}<a href="index.html">All artboards</a></aside>` : html`<aside class="dcx-tweaks"><a href="index.html">All artboards</a></aside>`}}`;
  }}
}}
render(html`<${{Shell}} />`, document.getElementById('dcx-root'));
</script>
</body>
</html>
'''
    return title, page


def main():
    OUT.mkdir(exist_ok=True)
    order = json.loads((HERE / 'canvas.json').read_text())['order']
    links = []
    for name in order:
        if not (HERE / name).exists():
            # A partial copy of the folder (a scratch directory) builds what it holds.
            continue
        title, page = build(HERE / name)
        target = name.replace('.dc.html', '.html').lower()
        (OUT / target).write_text(page, encoding='utf-8')
        links.append(f'<li><a href="{target}">{htmllib.escape(title)}</a></li>')
    (OUT / 'index.html').write_text(f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Compass calendar strip</title>
<style>body{{margin:0;padding:32px;font:16px system-ui,sans-serif;background:#f4f5f7;color:#1d2125}}a{{color:#0f6cbf}}</style>
</head><body><h1 style="font-size:22px">Compass calendar strip: mockups (ADR-014)</h1>
<p>Generated from the canvas artboards by <code>build_standalone.py</code>; Preact and htm load from cdn.jsdelivr.net.</p>
<ul>{''.join(links)}</ul></body></html>
''', encoding='utf-8')
    print('wrote', ', '.join(sorted(p.name for p in OUT.iterdir())))


if __name__ == '__main__':
    main()
