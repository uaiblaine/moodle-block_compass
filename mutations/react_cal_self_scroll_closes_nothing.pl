s/if \(selfscroll\.current\) \{(\n\s*window\.clearTimeout\(selftimer\.current\);\n\s*selftimer\.current = window\.setTimeout\(endSelfScroll, SCROLL_QUIET_MS\);)/if (false) {$1/;
