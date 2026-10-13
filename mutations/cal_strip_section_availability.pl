s/CASE WHEN cm\.availability IS NULL AND cs\.availability IS NULL THEN 0 ELSE 1 END AS restricted/CASE WHEN cm.availability IS NULL THEN 0 ELSE 1 END AS restricted/;
