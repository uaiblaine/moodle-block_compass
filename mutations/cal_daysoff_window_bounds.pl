s/WHERE daydate BETWEEN :firstdate AND :lastdate/WHERE daydate >= :firstdate - 1000000 AND daydate <> :lastdate/;
