s/'digest' => self::digest\(\$withpath, \$truncated\),/'digest' => self::digest(array_map(fn(array \$row): array => array_slice(\$row, 0, 4), \$withpath), \$truncated),/;
