s/AND e\.status = :enabled(\n\s*AND e\.enrol \{\$methodsql\}\n\s*AND \(e\.enrolstartdate)/AND (e.status = :enabled OR 1 = 1)$1/;
