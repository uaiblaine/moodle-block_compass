s/(get_sort_time\(\)->getTimestamp\(\);\n\n\s+return \$sort) >= \$now \? \$sort : null;/$1 > \$now ? \$sort : null;/;
