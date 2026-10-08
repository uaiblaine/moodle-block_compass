# Review context for block_compass

`block_compass` ("Compass") is a Dashboard block that replaces a long "My courses" list
with three tiers for the logged-in learner: courses to continue, new and favourite, and a
filterable, grouped inventory of every course the learner is enrolled in. It also offers
the same content as a standalone page (`index.php`) that can be chosen as a start page.
It targets Moodle 5.2 only, and **defines no database tables of its own**: it reads core
enrolment, course, completion and favourites data, keeps derived copies in the Moodle
caches, and stores two user preferences. It depends on `local_unlistedcourses`, whose
`access::classify_enrolment()` decides what each of the viewer's own enrolment rows means
(enrolled, starting later, an application awaiting a decision or on the waiting list).

## Who is trusted

- Site administrators are fully trusted; the plugin settings (thresholds, optional
  features) are admin-only.
- The one capability is `block/compass:myaddinstance` (system context, `captype` write,
  default `user`, cloned from `moodle/my:manageblocks`, no `riskbitmask`). It only lets a
  user put the block on their own Dashboard. The block is applicable to the Dashboard
  only and allows a single instance.
- There is no teacher, manager or administrator view: every endpoint answers for **the
  current user and nobody else**. Any code path that accepts a user id, or lets one user
  read another user's courses, progress or favourites, is a finding.
- Course names, category names and course custom field labels are untrusted input
  (teachers and managers set them).

## Surfaces

- 5 web service functions, all `read`, all `ajax`, session-based, none registering a
  capability in `db/services.php`: `block_compass_get_attention`, `get_inventory`,
  `get_inventory_rows`, `search_inventory`, `get_card_details`. Each calls
  `require_login()`, rejects guests, validates the user context of `$USER`, and accepts
  no user id. `get_card_details` takes a batch of course ids and answers only for those in
  which the caller holds an enrolment row that `local_unlistedcourses` classifies as enrolled
  (everything), or as a later start or an application (image and crests only). Writes (favourites, archiving
  a course) are not ours: the browser calls core's own services and preference routes.
- Page script: `index.php` (`require_login()`, guests refused, redirects to the Dashboard
  while the page setting is off).
- Hooks: two callbacks in `db/hooks.php` (a preload hint at the top of the body on the
  Dashboard and on the block's own page; an extra start-page option). Both catch
  `\Throwable` on purpose so a half-upgraded copy cannot break every request.
- Event observers only drop cache entries (course, category, custom field, completion and
  user deleted events).
- One scheduled task, `warm_active_users`, which does nothing unless an admin turns on
  `enable_prewarm`; it only fills caches and keeps its own cursor in plugin config.
- Six application caches (`db/caches.php`), keyed by course, category, field or user. They
  hold copies of data core already shows the same user.
- Optional display of enrolment applications awaiting approval needs `enable_pending` and
  the `enrol_apply` plugin installed; otherwise the code path is inert.
- With `theme_boost_union_fundaseg` installed and `show_theme_badges` on, cards show the course's
  crests, read only through that theme's public `course_badges` callback via
  `component_callback()`, which applies the theme's own rule of who may see them; Compass builds
  no URL and reaches into no theme class.
- No file serving, no outbound HTTP, no SQL built from user input (every statement uses
  placeholders and `get_in_or_equal`), no evaluation of user input. The client is React
  under `js/esm`; `dangerouslySetInnerHTML` appears only for icon markup that the server
  renders from `pix_icon`, never for course data.
- Privacy provider: metadata plus `user_preference_provider` for the two stored
  preferences; a test pins `component_is_compliant()`.

## Facts that look like findings but are by design

- **Hidden courses follow core's rule.** A course with `visible = 0` is listed only for a
  holder of `moodle/course:viewhiddencourses`, evaluated once per request. Every course
  shown is one the viewer holds an enrolment row in: an active one everywhere, and in the
  third tier also one that starts later or an application of their own, each linking to
  the course's enrolment page with no progress, star or archive control.
- **"Archived" courses reuse the Course overview block's preference**
  (`block_myoverview_hidden_course_<id>`), so archiving here and there agree. These rows
  are never deleted on uninstall because they belong to the learner and to core's block.
- **Favourites are core's star**, written by core's service from the browser. Core does not
  check enrolment on that write; Compass does not show a favourite on a course the user
  left, because its queries join active enrolments.
- **Course and category names enter `PARAM_TEXT` return fields through
  `format_string(..., ['escape' => false])`**, so a bare `<` in a name cannot fail the
  whole response; React escapes on output. Image URLs are `PARAM_URL`.
- **Own SQL lives only in `classes/local/`**, the plugin's rule being that each statement
  carries a `LIMIT` or is an aggregate. `$DB` outside that directory is a finding; a new
  unbounded query is one too.
- Return structures are an allowlist: a field added to a shared builder must be declared
  in the returns of every function that uses it.

## De-emphasise

- `js/esm/build/**` is generated output of `js/esm/src/**`; review the source.
- `docs/**`, `PLAN.md`, `mutations/**`, `lang/**` and `tests/**` carry no production
  behaviour.
- Visual details of `styles.css` and the Mustache templates, unless they show data the
  viewer should not see.
