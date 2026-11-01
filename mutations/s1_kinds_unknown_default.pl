s/ : self::DEFAULT;\n(\s*)\$counts\[\$key\] \+=/ : "unknown";\n${1}\$counts[\$key] ??= 0;\n${1}\$counts[\$key] +=/;
