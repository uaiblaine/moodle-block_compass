s/if \(!\$context \|\| !has_capability\('mod\/assign:grade', \$context, \$userid\)\) \{\n(\s*)continue;\n(\s*)\}\n(\s*)\$row = \(object\)/if (!\$context) {\n$1continue;\n$2}\n$3\$row = (object)/;
