#!/bin/bash
# Phase 0 baseline series for block_compass on m503b. One line per scenario, load average beside it.
W=m503b-webserver-1; B=http://localhost:9503; PAGE=$B/blocks/compass/index.php
run(){ echo "load $(sysctl -n vm.loadavg)"; docker exec $W php /tmp/compass_probe.php --runs=5 --profile "$@" 2>&1 | grep -v '^PHP\|^$'; }
run --url=$B/user/preferences.php --user=compass_s50 --label=c0-control
run --url=$PAGE --user=compass_s50 --label=p1-s50
run --url=$PAGE --user=compass_s300 --label=p1-s300
run --url=$PAGE --user=compass_s1000 --label=p1-s1000
run --url=$B/my/ --user=compass_s50 --label=d1-s50
run --url=$B/my/ --user=compass_s1000 --label=d1-s1000
run --url=$PAGE --user=compass_s50 --label=i1-ghost-s50 --click=.compass-ghost
run --url=$PAGE --user=compass_s300 --label=i1-ghost-s300 --click=.compass-ghost
run --url=$PAGE --user=compass_s50 --label=i2-search-s50 --click=.compass-ghost --type='.compass-search-input::cour'
run --url=$PAGE --user=compass_s1000 --label=i2-search-s1000 --click=.compass-ghost --type='.compass-search-input::cour'
run --url=$PAGE --user=compass_s50 --label=i3-cal-s50 --click=.compass-cal-toggle
run --url=$PAGE --user=compass_s50 --label=m1-s50-390 --width=390 --height=844 --mobile
run --url=$B/user/preferences.php --user=compass_s50 --label=c0-control-end
echo DONE
