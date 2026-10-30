#!/bin/bash
# Phase 0 interactions on clean preferences, trusted clicks; i3 one load per run with a reset before each.
W=m503b-webserver-1; B=http://localhost:9503; PAGE=$B/blocks/compass/index.php
K=$HOME/dev/moodle-dev/docs/client-performance-audit/block_compass-2026-10-29
INIT=$(cat $K/count_head.js)
reset(){ docker exec m503b-db-1 psql -U moodle -d moodle -qtAc "delete from m_user_preferences where name like 'block_compass_%' and userid in (select id from m_user where username like 'compass_s%')"; docker exec -u www-data $W php -r "define('CLI_SCRIPT',1);require '/var/www/html/config.php';cache_helper::purge_by_definition('core','userpreferences') ?? null;" >/dev/null 2>&1; }
run(){ echo "load $(sysctl -n vm.loadavg)"; docker exec $W php /tmp/compass_probe.php --profile "$@" 2>&1 | grep -v '^PHP\|^$' | head -4; }
reset
run --runs=5 --url=$B/user/preferences.php --user=compass_s50 --label=c0c-control
run --runs=5 --url=$PAGE --user=compass_s50 --label=n1-count-p1 --init="$INIT" --eval='[window.__hc.head, window.__hc.headt.join(",")]'
run --runs=5 --url=$B/my/ --user=compass_s1000 --label=n1-count-d1 --init="$INIT" --eval='[window.__hc.head, window.__hc.headt.join(",")]'
run --runs=5 --url=$PAGE --user=compass_s50 --label=i1b-ghost-s50 --click=.compass-ghost
run --runs=5 --url=$PAGE --user=compass_s300 --label=i1b-ghost-s300 --click=.compass-ghost
run --runs=5 --url=$PAGE --user=compass_s50 --label=i2b-search-s50 --click=.compass-ghost --type='.compass-search-input::cour'
for k in 1 2 3 4 5; do reset; run --runs=1 --url=$PAGE --user=compass_s50 --label=i3b-cal-s50-$k --click=.compass-cal-toggle; done
reset
run --runs=5 --url=$B/user/preferences.php --user=compass_s50 --label=c0c-control-end
echo DONE
