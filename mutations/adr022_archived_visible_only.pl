s/SUM\(CASE WHEN x\.arch = 1 AND x\.vis = 1 THEN 1 ELSE 0 END\) AS archcount/SUM(CASE WHEN x.arch = 1 THEN 1 ELSE 0 END) AS archcount/;
