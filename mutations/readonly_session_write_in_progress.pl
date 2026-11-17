s/(\n)(        \$percentage = config::progress_source\(\))/$1        \$GLOBALS['SESSION']->block_compass_mutant = 1;\n$2/;
