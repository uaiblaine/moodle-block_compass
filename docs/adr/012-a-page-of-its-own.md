# ADR-012: A page of its own, offered as the home page, and where the head hook listens

**Status:** Accepted (2026-09-11; proposed the same day)
**Date:** 2026-09-11
**Phase:** 10, with ADR-011, inside `v5.2-r1`
**Amends:** ADR-011 decision 2 (a second page for the preload hints; the presence check named
precisely); ADR-008 decision 3 (a third rung of the heading ladder)
**Supersedes:** nothing

## Context

Phase 9 shipped (`a0b650b`, `b8f728c`) and the maintainer, before Phase 10 (ADR-011) starts,
asked two things of it.

The first is a condition: the `modulepreload` hints must not be global — they must be written
only where the block exists. ADR-011 decision 2 already says so ("only when the Compass block is
present on that Dashboard"), but it says it as a requirement, not as a mechanism, and the
maintainer's question is whether the mechanism exists: can a head hook, which runs before the
body, know which blocks the body will hold?

The second is a surface: a page of the block's own, the way `block_feedback_tracker` has
`pages/teacher_dashboard.php`, that loads the block's content and nothing else — no block
regions, no other blocks, only the theme's navbar and footer — so the Dashboard's overhead is
not paid by a learner who came for the courses; and, if the platform allows it, offered as the
site's home page through Moodle's own `defaulthomepage` setting.

Both were answered by reading the 5.2 checkout (`~/dev/moodle-502/public`). What follows is what
it says.

### What the head hook can know

1. **Blocks are loaded before the head is written.** `core_renderer::header()` calls
   `$this->page->set_state(moodle_page::STATE_PRINTING_HEADER)`
   (`lib/classes/output/core_renderer.php:862`) before it resolves and renders the layout file
   (`:865, 867`). `moodle_page::set_state()` runs `starting_output()` on exactly that transition
   (`lib/pagelib.php:1150-1151`), and `starting_output()` calls `$this->blocks->load_blocks()`
   (`:1817`) and `create_all_block_instances()` (`:1824`). Only then does the layout file run,
   and only inside it does `standard_head_html()` dispatch
   `before_standard_head_html_generation` (`core_renderer.php:193-195`), after first ensuring
   every region's content is created (`:186-188`). So when the hook fires, the block manager
   holds the page's instances.
2. **`is_block_present()` reads them.** `block_manager::is_block_present($blockname)`
   (`lib/blocklib.php:247-263`) walks every region of `$birecordsbyregion`, the array
   `load_blocks()` filled, and answers whether an instance of that block is on the page — with
   the one exception of a theme-required block the theme no longer requires. The hook object
   carries the renderer as a public readonly property (`$hook->renderer`,
   `lib/classes/hook/output/before_standard_head_html_generation.php`), and `$PAGE` is global;
   the callback needs nothing else.
3. **The Dashboard's identity.** `my/index.php` sets `set_pagelayout('mydashboard')` (`:101`)
   and `set_pagetype('my-index')` (`:104`) — the pair ADR-011 decision 2 already checks.
4. **Core has no preload API.** No `modulepreload` occurs under `lib/` and
   `page_requirements_manager` offers nothing for it (ADR-011, fact 9); the hook is the vehicle.

So the answer to the first question is **yes, and it was never going to be global**: the check is
`$PAGE->blocks->is_block_present('compass')`, it is answered from loaded data, and it is the
guard decision 2 named. This record states the mechanism so the test can name it too — and adds
the one page where no check is needed, because the page is the block.

### What a page of its own can be

5. **The renderable needs no block instance.** `block_compass\output\block::export_for_template()`
   (`classes/output/block.php`) reads settings through `config`, strings, and the viewer's two
   preferences; it takes nothing from `block_base`, no `$this->instance`, no block context.
   `block_compass.php:102-103` only instantiates it and renders it through the core renderer.
   A page can do the same two lines.
6. **The stylesheet is scoped by one class.** Every rule in `styles.css` is written under
   `.block_compass` (the tokens on `.block_compass, .compass-dialogue`, `styles.css:8-9`), which
   core puts on the block's `<section>` through `block_base::html_attributes()`
   (`blocks/moodleblock.class.php:434-450`). Nothing selects on `.block`, `.card`,
   `data-block` or `data-instance-id`. A page reproduces the one class on a wrapper of its own and
   inherits every rule; it must **not** reproduce core's `block card mb-3` chrome, which is
   drawer furniture with an instance id behind it.
7. **The `base` layout is navbar, heading and footer, and nothing else.** Boost declares
   `'base' => ['file' => 'drawers.php', 'regions' => []]` (`theme/boost/config.php:40-43`).
   With no regions, `theme_config::setup_blocks()` registers none
   (`lib/classes/output/theme_config.php:2249-2253`), `load_blocks()` returns at "no block
   regions, no blocks" (`lib/blocklib.php:673-681`), `region_has_content('side-pre')` is false at
   its first line (`:373-375`), `addblockbutton()` returns `''` because `get_regions()` is empty
   (`core_renderer.php:4877-4909`), so `$hasblocks` is false in every mode (`drawers.php:50-51`)
   and the drawer never renders; `core_course_drawer()` returns `''` without a course
   (`course/lib.php:2871-2896`). The navbar (`{{> theme_boost/navbar }}`), the page heading through
   `full_header` (`drawers.mustache:142`) and the footer (`:179`) are unconditional. **Site-wide
   sticky blocks do not appear either**, because the region they would sit in does not exist —
   which is the difference from `standard` (`regions => ['side-pre']`), where a "Display
   throughout the entire site" block would, and where editing mode would draw the "Add a block"
   drawer. Classic's `base` has the same empty-regions contract (`theme/classic/config.php:34-37`),
   and so does Boost Union's (`moodle-theme_boost_union-502/config.php:59-62`; its additional-region
   feature is applied to the other layouts only, `:66-118`) — but Boost Union substitutes its own
   `layout/drawers.php`, which includes its furniture on every layout: back-to-top, footer buttons,
   footnote, info banners, smart menus. "Nothing else" is a statement about core Boost; on the
   fleet's theme the page is navbar, heading, content, footer and whatever that theme adds to
   every page.
8. **The secondary navigation costs nothing to switch off.** `_hassecondarynavigation` defaults to
   true (`lib/pagelib.php:413`); in a user context the `secondary` view has no case and stays
   empty (`lib/classes/navigation/views/secondary.php:212-247`), `more_menu` returns `[]` for
   no children and `drawers.php:110` turns that into `false`, so no tab bar renders anyway —
   but `$PAGE->set_secondary_navigation(false)` (`lib/pagelib.php:2443-2453`) skips building the
   view at all.
9. **Boost's page heading is an `<h1>`.** `full_header()` calls `context_header()` with no
   arguments (`core_renderer.php:4326`), whose `$headinglevel` defaults to 1 (`:4134`) and reaches
   the renderable at `:4261`; `context_header::export_for_template()` renders
   `$output->heading($headingtext, $this->headinglevel, 'h2 mb-0')`
   (`lib/classes/output/context_header.php:117`) into `full_header`. A block section under it belongs at `<h2>`; `heading.ts` today knows two rungs
   only — `h4`/`h5` under core's block `<h3>`, `h3`/`h4` with the title hidden (ADR-008,
   decision 3) — and neither lands one rung under an `<h1>`.
9b. **A user-context page draws the viewer's own picture and a Message button.** The same
   `context_header()` branches on `$context->contextlevel == CONTEXT_USER &&
   $this->page->pagetype !== 'my-index'` (`core_renderer.php:4151`; Boost's override at
   `theme/boost/classes/output/core_renderer.php:91` does the same, and Boost Union's
   `full_header` at `classes/output/core_renderer.php:542` still calls it with no arguments): it
   reads the user row (`:4156`), renders `user_picture($user, ['size' => 100])` because a viewer may
   see their own profile (`:4176`; `user/lib.php:1252-1254`), and, with messaging on and
   `moodle/site:sendmessage` held by the `user` archetype, a Message button (`:4179-4189`);
   `context_header.mustache:47-51, 60-74` draws both. The `base` layout declares no options, so the
   `nocontextheader` early return (`:4257`) never fires. `/my/courses.php` escapes this by declaring
   `set_pagetype('my-index')` on its own user context (`my/courses.php:72`); `/my/index.php` is the
   exemption itself. In the **system** context the header is the heading alone — and the system
   context's other cost, the administration tree in the secondary navigation
   (`secondary.php:236-245`), is exactly what `set_secondary_navigation(false)` skips (fact 8).
   The header's settings menu draws nothing there either: `context_header_settings_menu()` knows a
   course menu, a front-page menu and a user menu (`core_renderer.php:4352-4368`), none of which
   a system-context page of this type triggers.
10. **Core has no such page.** No `blocks/*/index.php` exists; the closest companions
    (`blocks/rss_client/viewfeed.php`, `blocks/completionstatus/details.php`, `blocks/lp/*.php`)
    are normal pages that set their own heading and render their own content under it, never the
    `core/block` section. `block_feedback_tracker/pages/teacher_dashboard.php` is the same shape:
    system context, `require_login()`, `set_pagelayout('admin')`, header, an AMD mount, footer;
    reached by URL, with one Behat scenario and no PHPUnit of the page itself (its data has its
    own tests). Nothing in its docs records why `admin`; its system-wide pages use it and its
    course-scoped ones use `incourse`.

### What Moodle offers for a home page

11. **`defaulthomepage` accepts a local URL, and plugins add the option through a hook.**
    `admin/settings/appearance.php:165-180` builds the select's choices — Home, Dashboard, My
    courses, User preference — then dispatches `\core_user\hook\extend_default_homepage` and merges
    `$hook->get_options()`. The hook (`user/classes/hook/extend_default_homepage.php:44-58`) has
    `add_option(url $url, lang_string|string $title)`, keyed on `$url->out_as_local_url()` — a
    path without the wwwroot, and `out_as_local_url()` throws for a non-local URL
    (`lib/classes/url.php:861-872`). `admin_setting_configselect::write_setting()` accepts only a
    known key (`lib/adminlib.php:3551-3565`), so the stored value is the path the plugin offered.
12. **Resolution.** `get_default_home_page_url()` (`lib/moodlelib.php:10098-10115`) recognises a
    value starting with `/`, cleans `$CFG->wwwroot . $value` as `PARAM_LOCALURL` on every read,
    and `get_home_page()` returns `HOMEPAGE_URL` (`:10050,10054`; the constant is 4, `:542`).
    `index.php:102-103` redirects the site root there **unconditionally** — the `?redirect=0`
    escape applies to the Dashboard and My courses cases only (`:97,100`). After login,
    `core_login_get_return_url()` sends a user whose home page is a URL straight to it
    (`login/lib.php:366-367`) unless the `wantsurl` (`:341-344`) points somewhere other than the
    site root, `/my/` or `/my/courses.php`: the gate is `$ishomepageurl` (`:352-356`), which a
    `wantsurl` aimed at one of those three still satisfies. `/my/` itself keeps
    working for such a user (`my/index.php:111-114` neither redirects nor offers "make this my
    home" when the setting is a URL).
13. **The same option reaches each user's own choice.** When the site setting is "User
    preference", `core_user::fill_preferences_cache()` builds `user_home_page_preference` with the
    hook's keys as allowed choices (`lib/classes/user.php:1159-1183`, constructed with
    `userpreference: true`) and `user_get_default_homepage_options()` (`user/lib.php:816-841`)
    supplies the labels to the form; `user/tests/editlib_test.php:120-165` is core's own proof
    that a plugin-added path is accepted as a preference.
14. **Nothing in core registers a callback on that hook.** Zero of the 23 `db/hooks.php` files
    do; the consumers are the two dispatch sites above and `core\hub\registration`
    (`lib/classes/hub/registration.php:1023-1052`), which names a plugin-added home page for the
    site registration. The callback shape is core's usual one: a `db/hooks.php` entry
    `['hook' => \core_user\hook\extend_default_homepage::class, 'callback' => ...]`
    (`lib/db/hooks.php:1-34` for the form; `lib/classes/hook/manager.php:358-363` for discovery).
15. **The navbar.** `core\navigation\views\primary` adds Home (`/`, when `$CFG->enablemyhome`),
    Dashboard (`/my/`, when `$CFG->enabledashboard`) and My courses
    (`lib/classes/navigation/views/primary.php:43-74`); with a URL home page the Home node keeps
    its plain `/`, which then redirects (fact 12), and the Dashboard node stays. Hiding nodes is
    the theme's `removedprimarynavitems` (`lib/classes/output/theme_config.php:430,508`), which
    core Boost exposes no setting for; Boost Union does ("Hide nodes in primary navigation",
    `settings.php:3947-3989`, read in its own `config.php:233-234`) — and **it already applies on
    `theme_boost_union_fundaseg`**: that theme's `config.php:35` is
    `require($CFG->dirroot . '/theme/boost_union/config.php')`, `find_theme_config()` loads a
    theme's config with a bare `include("$THEME->dir/config.php")` (`theme_config.php:2111`), so
    Boost Union's assignment lands on the same `$THEME` the constructor then copies the property
    from (`theme_config.php:508, 511-515`); the child overwrites six other properties after the
    require and never that one. A plugin can add its own node through
    `\core\hook\navigation\primary_extend` (`lib/classes/hook/navigation/primary_extend.php`,
    dispatched at `primary.php:92-93`, `navigation_node::add()` takes a `pix_icon`), and its page
    can claim the active tab with `$PAGE->set_primary_active_tab($key)` (`lib/pagelib.php:2496`).

### What the Dashboard costs that the page would not

16. `my/index.php` resolves the user's "my page" (`my_get_page()`, a copy for a new user), loads
    the block instances of the `my-index` page type in the user's context — on a default site the
    Course overview, Timeline, Calendar and Recently accessed blocks, each with a `get_content()`
    and an AMD init, the Course overview alone issuing its own web-service calls — and renders
    the drawer, the "Customise this page" control and the subpage machinery. On the `base` layout
    none of that runs (fact 7). What remains is what every Moodle page costs — bootstrap, the
    theme's CSS, the navbar's own AMD, the footer — plus the block's client, which ADR-011 is
    about. The number belongs in the Evidence: measured in the browser (Resource Timing) on m502,
    `/my/` against `/blocks/compass/index.php`, cold and warm, requests and the instant
    `get_attention` fires. The browser pane was logged out when this record was written and the
    agent does not enter credentials, so the measurement is collected at implementation, with the
    maintainer logged in.

## Decision

### 1. `blocks/compass/index.php` renders the block's content and nothing else

A page at the plugin's root, so its local URL is short: `/blocks/compass/index.php`. It does, in
order: `require_login(null, false)` — no automatic guest login — and refuses a guest with
`moodle_exception('noguest')`, the block's own rule; sets the **system** context; `set_url`;
`set_pagelayout('base')` (fact 7); `set_secondary_navigation(false)` (fact 8); `set_title` and
`set_heading` with the block's name (`pluginname`, "Compass" — question 1); `$OUTPUT->header()`;
then renders `\block_compass\output\block` through the core renderer inside a `page` Mustache
template whose only markup is a wrapper carrying the class `block_compass` and a second class
`compass-page` for the page's own rules (fact 6), around a live `{{> block_compass/block }}`
partial, which the page's renderable feeds the same `['props' => …]` context the block does —
the `react` helper is registered on the shared engine and only `js` is barred from nesting
(`lib/classes/output/renderer_base.php:104, 117, 128`); then `$OUTPUT->footer()`. No `$DB`, no
cache, no block instance: two lines of the block class, plus the page furniture. The page type
core derives is `blocks-compass-index`.

The page is behind a setting, **`enable_page`** (off by default, so an upgrade changes nothing
for a site that never asked for the page): off, `index.php` redirects to `/my/` — a stored home
page pointing at a page that has been switched off must land somewhere, and the Dashboard is
where the block already is — and the home page option of decision 3 is not offered. On, the
page renders and the option appears. `config::page_enabled()` is the one reader, and the head
hook's page branch (decision 4) is moot while it is off, because the page does not render.

**Why `base` and not `standard` or `admin`.** `standard` keeps a region, so a sticky block would
appear and editing mode would draw the "Add a block" drawer (fact 7): the page would be a second
Dashboard waiting to happen. `admin` is `standard` with the admin navigation. `base` is the
maintainer's sentence made literal: the navbar and the footer, and the content. **Why the
system context and not the viewer's.** A user-context page makes core draw the viewer's own
picture at 100 px and a Message button in the page header (fact 9b) — chrome the page exists to
avoid — and the one thing the system context would add, the administration tree in the secondary
navigation, is switched off by the same call that removes the empty tab bar (facts 8, 9b). The
services derive the viewer's context from `$USER` in their own requests (ADR-000) and are
unaffected by what the page sets. **Why not a capability of its own.** The page shows the viewer their own courses,
which the block already shows on the Dashboard to the same viewer; a capability would gate
nothing the block does not already give; the maintainer chose a setting instead, so a site
that does not use the page has no URL to explain (question 6).

### 2. The heading ladder gains a third rung: the shell exports a level, not a flag

`heading.ts` takes a numeric base level instead of the `titlehidden` boolean: sections are
`h{level}` and card titles `h{level + 1}`. The shell exports `headinglevel`: **4** under core's
block `<h3>` (the Dashboard as today), **3** with `hide_block_title` on (as today), **2** on the
page, under the theme's `<h1>` (fact 9). `\block_compass\output\block` takes the level as a
constructor argument defaulting to the Dashboard's — `new block()` in `block_compass.php:102`
unchanged, `new block(headinglevel: 2)` on the page — so the shell keeps deciding between 4 and 3
from `hide_block_title` and needs no knowledge of page types. The Behat scenarios keep measuring
the first two with axe; the page's scenario measures the third. The static rule that pins the ladders reads three
instead of two. This amends ADR-008 decision 3, which chose a level from the block title's
presence; the choice is now made once, in the shell, from where the block is.

### 3. The page is offered as a home page through core's hook, and only there

`db/hooks.php` registers a callback on `\core_user\hook\extend_default_homepage` that calls
`$hook->add_option(new \core\url('/blocks/compass/index.php'), new lang_string('pluginname',
'block_compass'))` (fact 11). That one call puts "Compass" in *Site administration › Appearance ›
Navigation › Start page for users* (`lang/en/admin.php:529`) and, when the site leaves the choice
to users, in each user's own preference (fact 13). Everything after that is core's: the site root
redirects to the page (fact 12), a login lands on it, `/my/` stays reachable, and the navbar keeps
its Home, Dashboard and My courses nodes (fact 15). The callback offers the option only while
`enable_page` is on — one `get_config()` read, the same bundle every request already holds —
and a value stored before the page was switched off resolves to the page's redirect to `/my/`
(decision 1). The plugin stores nothing else. It runs wherever core builds the home-page choices — that
setting, the preferences form, the site registration form — and wherever core builds the
preference registry, which includes every preference write core's router validates
(`user/classes/route/api/preferences.php:225` → `core_user::get_preference_definition()` →
`fill_preferences_cache()`, dispatching at `lib/classes/user.php:1172-1173`): this block's own
view, toolbar and archive writes among them. It never runs while a page renders, and when it
runs it costs two object constructions and no `$DB`.

**What this record does not decide, and says so.** Hiding the Dashboard node when Compass is the
home page is the theme's `removedprimarynavitems`; on Boost Union it is a setting, which the
fleet's child theme inherits unchanged (fact 15) — the maintainer confirmed it is a decision for
the site, not code (question 5). A "Compass" node in the primary navigation through
`primary_extend` is possible (fact 15) and was declined (question 3): with Compass as the home
page the Home node already leads there, and with the Dashboard as the home page the block is
already on it.

### 4. The head hook of ADR-011 listens in two places, and the mechanism is named

ADR-011 decision 2's callback writes its seven `modulepreload` tags when **either**:

- the page type is `my-index` under the `mydashboard` layout **and**
  `$PAGE->blocks->is_block_present('compass')` — answered from the instances `starting_output()`
  loaded before the layout ran (facts 1–3); **or**
- the page type is `blocks-compass-index` under the `base` layout — the page is the block, so
  there is nothing to check.

Everything else in decision 2 stands: absolute URLs from the router, the revision, the
`\Throwable` swallow, no `$DB`. `hook_callbacks_test` gains the cases: the page writes seven; a
Dashboard without the block writes none; a Dashboard with the block writes seven; any other page
type writes none. This is the answer to the maintainer's first point in executable form.

### 5. Tests, gates and documents the phase ships for this record

- **PHPUnit.** `tests/hook_callbacks_test.php` (shared with ADR-011): dispatching
  `extend_default_homepage` yields the one option, keyed `/blocks/compass/index.php`, labelled by
  the plugin's string, and `get_home_page()` returns `HOMEPAGE_URL` with
  `get_default_home_page_url()` pointing at the page once `defaulthomepage` holds that key —
  proof through core's own resolution, not through the array; `tests/output/page_test.php`
  renders the `page` template and asserts the `block_compass` wrapper, the mount point and
  `headinglevel` 2 in the props, and asserts the Dashboard shell still exports 4 and 3;
  `heading` rules in `accessibility_rules_test` pin the three ladders.
- **Behat.** A fifth scenario, granted (question 4): with `enable_page` on, log in, open
  `/blocks/compass/index.php`, see the block's content, no block drawer, the page heading
  "Compass", and core's axe step; then, as admin, set the home page to Compass and open the
  site root, landing on the page. Thin, like the other four.
- **Mutation gates.** `page_guest_gate` (drop the guest refusal → the page test), `page_setting_gate`
  (render the page with `enable_page` off → the page test), `homepage_option` (drop the
  `add_option` call → the hook test), `homepage_option_setting` (offer the option with the
  setting off → the hook test), `heading_rung` (export 3 instead of 2 on the page → the page
  test), `preload_page_type` (drop the page's branch → the hook callbacks test).
- **Templates.** The `page` template carries its own `Example context (json):` docblock, which
  `mdl ci --only mustache` renders — the same props JSON the block template's docblock shows.
- **Documents.** README: a section for the page, the home page setting and the theme note;
  CLAUDE.md: the page in the code layout, the third rung, the hook; CHANGELOG at implementation;
  ADR-008 and ADR-011 get a line each pointing here.

### 6. Order

Phase 10 implements ADR-011 and this record together, in that order inside the phase: the
bundle first (the page's client is the same file), then the head hook with its two branches, then
the page, the ladder and the home page option. One version bump, one diff for the maintainer.

## Consequences

- A learner whose site made Compass the home page pays, after login, the theme and the block —
  no Dashboard blocks, no drawer, no sticky blocks, no "my page" resolution. The measured
  difference goes in the Evidence at implementation (fact 16).
- The Dashboard block is untouched: same shell, same services, same preferences. A site can have
  both, and a learner who prefers `/my/` still has it.
- One more pagetype for the head hook, one more Behat scenario, one more Mustache template (the
  wrapper), one hook callback, three ladders instead of two.
- The page has no capability and no setting: it is reachable by every logged-in non-guest user,
  as the block is (question 6).
- The navbar is core's and the theme's. The plugin adds no node and hides none; hiding the
  Dashboard node is Boost Union's setting, which the fleet's child theme inherits (fact 15).
- Core's `?redirect=0` does not bypass a URL home page (fact 12): an administrator who wants the
  site front page must change the setting, not the URL.

## Alternatives rejected

| Alternative | Why not |
|---|---|
| A `local_` plugin hosting the page and reusing the block | Two plugins for one screen; the page needs nothing the block does not already have (fact 5). |
| `standard` layout, so the page can carry blocks | It would carry sticky blocks and the editing drawer (fact 7): the overhead the page exists to avoid, one setting away. |
| A `redirect` from `/my/` to the page when Compass is the home page | Core does not do it for its own URL home pages (fact 12) and the Dashboard remains a legitimate destination. |
| Keep `titlehidden` and have the page emit an `<h2>` of its own so the existing `h3`/`h4` rungs fit | A second heading with nothing under it but the block; the ladder should be chosen from where the block is, once (decision 2). |
| A plugin capability `block/compass:viewpage` | Gates nothing the Dashboard block does not already show the same viewer (decision 1). |
| A `primary_extend` node | Redundant with Home when Compass is the home page; a setting if ever wanted (question 3). |

## Questions for the maintainer

All seven were answered on 2026-09-11 — "Compass", "base", "No", "ok, one more", "decision for
the site, not code", "setting", "logged" — and each answer is folded into the decision it names:
the page's heading is the block's name, the layout is `base`, no navigation node, a fifth Behat
scenario, the Dashboard node is the site's configuration, the page and its home page option are
behind `enable_page` (off by default), and the browser pane was logged in for the measurement of
fact 16, whose Dashboard half is in the Evidence below. They are kept as written, for a reader
arriving later.

1. **The page's heading and title.** The block's name, "Compass" (`pluginname`), or a phrase like
   "My courses"? The record proposes the name.
2. **`base` or `standard`.** The record proposes `base` (fact 7). `standard` would let an
   administrator add blocks to the page in editing mode.
3. **A "Compass" node in the primary navigation.** Not proposed; possible through
   `primary_extend`, as a setting off by default, if wanted.
4. **The fifth Behat scenario.** Four were granted (ADR-007); this record asks for one more, for
   the page and the home page setting.
5. **The Dashboard node.** With Compass as the home page, should the site hide the Dashboard
   node? Boost Union's "Hide nodes in primary navigation" does it, and the child theme inherits
   the setting (fact 15) — a configuration decision for the site, not code; asked so it is not
   forgotten.
6. **A setting to enable the page.** Not proposed: the page shows the viewer's own courses, which
   the block already shows. If the maintainer wants the URL closed on sites that do not use it, an
   `enable_page` setting is one line plus a test.
7. **The measurement.** Fact 16 needs the browser pane logged in on m502 to compare `/my/` with
   the page; collected at implementation unless the maintainer wants it before acceptance.

## Evidence

- The head hook's timing and the presence check: `lib/classes/output/core_renderer.php:862-867,
  186-195`; `lib/pagelib.php:1144-1152, 1813-1833`; `lib/blocklib.php:247-263`;
  `my/index.php:101,104` (facts 1–3).
- The renderable's independence from the instance: `classes/output/block.php`,
  `block_compass.php:102-103`; the stylesheet's scope: `styles.css:8-9` and every rule below;
  core's wrapper: `blocks/moodleblock.class.php:434-450`, `lib/templates/block.mustache:37-49`
  (facts 5–6).
- The `base` layout: `theme/boost/config.php:40-43`, `lib/classes/output/theme_config.php:2249-2253`,
  `lib/blocklib.php:294-299, 371-386, 673-681`, `lib/classes/output/core_renderer.php:3801-3830,
  4877-4909`, `theme/boost/layout/drawers.php:31, 50-57, 63-79, 110`,
  `theme/boost/templates/drawers.mustache:60, 82-103, 142, 179`, `course/lib.php:2871-2896`,
  `theme/classic/config.php:34-37` (fact 7); the secondary navigation: `lib/pagelib.php:413,
  2443-2453`, `lib/classes/navigation/views/secondary.php:212-247`,
  `lib/classes/navigation/output/more_menu.php:61-94` (fact 8); the `<h1>`:
  `lib/classes/output/core_renderer.php:4134, 4261`, `lib/classes/output/context_header.php:117`,
  `lib/templates/full_header.mustache:51-55` (fact 9).
- The home page: `user/classes/hook/extend_default_homepage.php:44-58`,
  `admin/settings/appearance.php:165-180`, `lib/adminlib.php:3551-3565`, `lib/classes/url.php:861-872`,
  `lib/moodlelib.php:542, 10030-10060, 10098-10115`, `index.php:37, 93-103`, `login/lib.php:334-374`,
  `my/index.php:111-114`, `lib/classes/user.php:1159-1183`, `user/lib.php:816-841`,
  `user/tests/editlib_test.php:120-165`, `lib/classes/hub/registration.php:1023-1052`,
  `lib/db/hooks.php:1-34`, `lib/classes/hook/manager.php:358-363` (facts 11–14).
- The navbar and the theme: `lib/classes/navigation/views/primary.php:43-74, 92-93, 117-208`,
  `lib/classes/hook/navigation/primary_extend.php`, `lib/pagelib.php:2496`,
  `lib/classes/output/theme_config.php:430, 486-515, 508, 2097-2131`,
  `moodle-dev/deps/moodle-theme_boost_union-502/settings.php:3947-3989`, its `lib.php:38-42`,
  `config.php:59-62, 66-118, 233-234` and `layout/drawers.php`;
  `theme_boost_union_fundaseg/config.php:35, 41-51`; `lib/classes/output/theme_config.php:2111,
  508, 511-515` (facts 7 and 15); the user-context header:
  `lib/classes/output/core_renderer.php:4151-4189, 4257, 4326`,
  `theme/boost/classes/output/core_renderer.php:91-129`, `lib/templates/context_header.mustache:47-74`,
  `my/courses.php:72`, `user/lib.php:1252-1254` (fact 9b).
- The precedent: `moodle-block_feedback_tracker/pages/teacher_dashboard.php:27-52, 137-141,
  151-155`, its `tests/behat/teacher_dashboard.feature`, and its `CLAUDE.md:704` (fact 10).
- The measurement of fact 16, Dashboard half, taken on m502 on 2026-09-11 with the maintainer
  logged in, Resource Timing over `/my/?nocpf=1`, the block's client on its Phase 9 build (24
  per-file modules, before ADR-011's bundle):

  | `/my/` | after `mdl purge` | warm browser |
  |---|---|---|
  | requests | 53 (10.9 MB) | 50, of which 44 from cache (501 KB) |
  | server time to first byte | 1.75 s | 0.71 s |
  | `DOMContentLoaded` / `load` | 12.1 s / 12.5 s | 1.23 s / 2.37 s |
  | ESM modules (25 of the block, 7 of core) | 32, the last one ending at 21.9 s | 32, from cache |
  | `get_attention` fires at | 22.0 s | 1.26 s |

  Two things the table says that fact 16 did not: **this Dashboard holds the Compass block
  alone** (`[data-block]` lists `compass` only), so on the maintainer's site the page saves the
  "my page" resolution, the regions and the drawer, not other blocks' work — the block-heavy
  Dashboard fact 16 describes is the default site's, not this one's; and the one non-Compass
  service call on the page is `local_mail_count_messages`, a navbar plugin's, which the page
  will pay too. The cold column is dominated by the module waterfall ADR-011 removes; the
  page's own column is measured at implementation, with the same protocol, beside the bundle's.

All of the above was read on 2026-09-11 by six readers with citations, and then refuted by four
more, who corrected fact 1's line numbers, fact 15 (the child theme inherits the hide setting
through a `require`, which a grep for the property could not see), the user-context header of
decision 1 (fact 9b, which turned the page's context from the viewer's to the system's) and the
run sites of the hook in decision 3, before this record was sent; nothing in it comes from memory
of another Moodle version.
