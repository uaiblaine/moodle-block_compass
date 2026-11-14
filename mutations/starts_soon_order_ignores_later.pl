s/WHEN ue\.timestart > :slater THEN 0 WHEN c\.visible = 1 THEN 1 ELSE 2 END/WHEN ue.timestart > :slater THEN 1 WHEN c.visible = 1 THEN 1 ELSE 2 END/;
