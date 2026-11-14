s/const retry = useCallback\(\(\): void => \{\n(\s+)setRetrying\(true\);\n(\s+)ask\(\);\n(\s+)\}, \[\]\);/const retry = (): void => {\n${1}setRetrying(true);\n${2}ask();\n${3}};/;
