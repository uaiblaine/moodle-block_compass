s/return in_array\(\$value, array_map\('strval', \$choices\), true\) \? \(int\) \$value : \$default;/return \$value === '' ? \$default : (int) \$value;/;
