s/\n        if \(\$courses\) \{\n            \/\/ Only the entries that were absent.*?\n            course_meta::set_from_rows\(array_intersect_key\(\$rows, \$courses, \$absent\)\);\n        \}//s;
