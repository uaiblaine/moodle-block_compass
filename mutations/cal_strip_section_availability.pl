s/CASE WHEN cm\.availability IS NULL AND cs\.availability IS NULL AND cs\.component IS NULL THEN 0/CASE WHEN cm.availability IS NULL AND cs.component IS NULL THEN 0/;
