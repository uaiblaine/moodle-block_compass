#!/bin/bash
# A/B of PR 1 on m503b in one sitting: the same four scenarios on the code before (main's client) and after.
# Usage: ab_pr1.sh <label-suffix>. The caller swaps the client and purges between the two halves.
W=m503b-webserver-1; B=http://localhost:9503; PAGE=$B/blocks/compass/index.php; L=$1
K=$HOME/dev/moodle-dev/docs/client-performance-audit/block_compass-2026-10-29
INIT=$(cat $K/count_head.js)
reset(){ docker exec m503b-db-1 psql -U moodle -d moodle -qtAc "delete from m_user_preferences where name like 'block_compass_%' and userid in (select id from m_user where username like 'compass_s%')"; }
run(){ echo "load $(sysctl -n vm.loadavg)"; docker exec $W php /tmp/compass_probe.php --profile --runs=5 "$@" 2>&1 | grep -v '^PHP\|^$' | head -4; }
reset
run --url=$B/user/preferences.php --user=compass_s50 --label=ab-$L-c0
run --url=$PAGE --user=compass_s50 --label=ab-$L-p1 --init="$INIT" --eval='[window.__hc.head, window.__hc.headt.join(",")]'
run --url=$B/my/ --user=compass_s1000 --label=ab-$L-d1 --init="$INIT" --eval='[window.__hc.head, window.__hc.headt.join(",")]'
run --url=$PAGE --user=compass_s50 --label=ab-$L-i1 --click=.compass-ghost
run --url=$PAGE --user=compass_s50 --label=ab-$L-i2 --click=.compass-ghost --type='.compass-search-input::cour'
reset
echo DONE
