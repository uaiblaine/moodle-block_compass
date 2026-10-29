s/AND \(e\.enrolstartdate = 0 OR e\.enrolstartdate <= :opened\)/AND (1 = 1 OR e.enrolstartdate <= :opened)/;
