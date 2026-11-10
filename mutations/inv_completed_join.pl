s/(LEFT JOIN \{course_completions\} cc ON cc\.userid = ue\.userid AND cc\.course = e\.courseid)\s*AND cc\.timecompleted IS NOT NULL/$1/;
