s/\$courses = array_slice\(\$courses, 0, config::inventory_max\(\), true\);\n(\s+)\$bounded = true;/\$courses = array_slice(\$courses, 0, config::inventory_max(), true);\n$1\$bounded = false;/;
