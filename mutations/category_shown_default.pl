s/(get_config\('block_compass', 'show_category'\);\n\n\s+)return \$value === false \|\| \$value === '' \|\| \(int\) \$value === 1;/$1return (int) \$value === 1;/;
