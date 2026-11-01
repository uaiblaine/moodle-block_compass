s/\$groups\[\$groupid\]\['kinds'\]\[\$model\] = \(\$groups\[\$groupid\]\['kinds'\]\[\$model\] \?\? 0\) \+ 1;/\$groups[\$groupid]['kinds'][0] = (\$groups[\$groupid]['kinds'][0] ?? 0) + 1;/;
