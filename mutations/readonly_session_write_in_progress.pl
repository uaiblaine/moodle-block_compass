s/(\n)(        \$percentage = progress::get_course_progress_percentage\()/$1        \$GLOBALS['SESSION']->block_compass_mutant = 1;\n$2/;
