# Screenshot tools

How the pictures in `docs/screenshots/` are made, and how to use the demo site they come from.
Development sites only; written for the m502b stack (`http://localhost:9502`, container
`m502b-webserver-1`, plugin at `/var/www/html/public/blocks/compass`).

| File | What it does |
|---|---|
| `seed_demo.php` | Idempotent CLI seeder: 16 courses in four top-level categories (idnumbers `compassdemo_*`), ten demo users, activities, submissions, completion, events, stars, an archived course, an application awaiting approval, and a Dashboard holding Compass alone for `demo.student` and `demo.teacher`. Each run moves the dates so they sit around the day it runs. |
| `holidays.php` | `--add` writes a recess (today + 5) and a holiday (today + 9) into `block_feedback_tracker_cday` and records their ids in `holidays-state.json`; `--remove` deletes exactly those ids. Both purge the `calendarstrip` cache. |
| `session.php` | Prints a session cookie for a user without a password (`--username=`), or ends one (`--destroy=SID`). |
| `cdp.mjs`, `capture.mjs` | Headless Chrome over the DevTools protocol; one function per screenshot. |
| `finish.py` | Composes `calendar-styles.png` from the ring and pulse captures, then recompresses every PNG (Pillow). |

## Logging in as the demo users

The demo accounts are `demo.student` (Alex Morgan, learner) and `demo.teacher` (Jordan Lee,
teacher of Clinical Skills Lab, Research Methods in Health and Human Anatomy and Physiology, and a
learner in two courses), plus eight classmates `demo.priya`, `demo.marcus`, `demo.sofia`,
`demo.daniel`, `demo.emma`, `demo.lucas`, `demo.hannah` and `demo.omar`.

Their passwords were generated at random by the first run of `seed_demo.php` and are written
only to **`docs/screenshots/tools/demo-credentials.txt`** (one `username password` per line,
ignored by git, present only in the checkout that ran the seeder). Sign in at
`http://localhost:9502/login/index.php`; while `auth_loginsteps` is enabled on the stack and asks
for a CPF first, use `http://localhost:9502/login/index.php?nocpf=1`. The site theme is
`boost_union_fundaseg`; the screenshots show Boost, which `session.php` puts in the session (any
session can do the same with `?theme=boost` while `allowthemechangeonurl` is on).

Without a password, from a shell on the server:

```sh
docker exec m502b-webserver-1 php /var/www/html/public/blocks/compass/docs/screenshots/tools/session.php --username=demo.student
# prints MoodleSession502b=<sid>: set it as a cookie for localhost:9502; end it afterwards with
docker exec m502b-webserver-1 php /var/www/html/public/blocks/compass/docs/screenshots/tools/session.php --destroy=<sid>
```

## Taking the screenshots again

```sh
T=/var/www/html/public/blocks/compass/docs/screenshots/tools
docker exec m502b-webserver-1 php $T/seed_demo.php           # refresh the dates
docker exec m502b-webserver-1 php $T/holidays.php --add      # if holidays-state.json is absent
# block_compass settings the strip needs: calendar_enabled=1, calendar_sources with "user"
# One cookie per user, in a JSON file outside the repository:
#   {"demo.student": "MoodleSession502b=...", "demo.teacher": "...", "admin": "..."}
COMPASS_SESSIONS=/path/sessions.json node capture.mjs        # every shot but ring and pulse
# calendar_style=ring: node capture.mjs ring; calendar_style=pulse: node capture.mjs pulse (also calendar-pulse.png and calendar-pulse-card.png);
# calendar_style back to dots
python3 finish.py
```

Node 22 or later (global `WebSocket`), Google Chrome at its macOS path or `CHROME_BIN`. The card
opens on tomorrow, the richest day of the seeded data. The texts that depend on the clock ("Last
access 2 hours ago", the month in the header) change with the day of the capture.
