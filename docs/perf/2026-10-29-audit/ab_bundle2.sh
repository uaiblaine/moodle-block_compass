#!/bin/bash
# Interleaved A/B of PR 2: only js/esm/build/bundle.js differs; purge between halves so the JS revision moves.
SP=/private/tmp/claude-501/-Users-uaiblaine-dev/1eeaec47-37e3-4b44-9ce7-c5019c0ece20/scratchpad
R=$HOME/dev/moodle-block_compass-503; W=m503b-webserver-1; B=http://localhost:9503; PAGE=$B/blocks/compass/index.php
reset(){ docker exec m503b-db-1 psql -U moodle -d moodle -qtAc "delete from m_user_preferences where name like 'block_compass_%' and userid in (select id from m_user where username like 'compass_s%')"; }
run(){ echo "load $(sysctl -n vm.loadavg)"; docker exec $W php /tmp/compass_probe.php --runs=5 "$@" 2>&1 | grep -E '^\S+ \['; }
for round in 1 2; do
  for side in before after; do
    cp $SP/pr2/bundle.$side.js $R/js/esm/build/bundle.js; mdl purge m503b >/dev/null 2>&1; reset
    run --url=$B/user/preferences.php --user=compass_s50 --label=y$round-$side-c0
    run --url=$PAGE --user=compass_s50 --label=y$round-$side-p1
    run --url=$B/my/ --user=compass_s1000 --label=y$round-$side-d1
  done
done
cp $SP/pr2/bundle.after.js $R/js/esm/build/bundle.js; mdl purge m503b >/dev/null 2>&1; reset
echo DONE
