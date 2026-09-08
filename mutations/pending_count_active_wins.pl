s/AND NOT " \. \$this->active_enrolment_sql\('cp\.id', 'pa', \$params\) \. "\)";/AND (1 = 1 OR " . \$this->active_enrolment_sql('cp.id', 'pa', \$params) . "))";/;
