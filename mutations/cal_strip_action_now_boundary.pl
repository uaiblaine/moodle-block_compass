s/\(e\.timesort >= :anow OR e\.eventtype = :agradingdue\)/(e.timesort >= :anow OR 1 = 1 OR e.eventtype = :agradingdue)/;
