s/(cc\.course = c\.id AND cc\.)timecompleted IS NOT NULL(\s*\)\s*ORDER BY x\.timecreated)/${1}timecompleted IS NULL AND 1 = 0$2/;
