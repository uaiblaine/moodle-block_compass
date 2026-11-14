s/\n\s*OR " \. \$DB->sql_like\('cc\.path', ':pattern'\),/\n                    AND :pattern <> ''",/;
