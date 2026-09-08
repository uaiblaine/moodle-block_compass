s/CASE WHEN e\.enrol = :applymethod THEN e\.id ELSE 0 END AS applyinstance/CASE WHEN e.enrol = :applymethod THEN 0 ELSE 0 END AS applyinstance/;
