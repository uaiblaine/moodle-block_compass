s/if \(!course_meta::visible_to\(\$entry, \$userid\)\) \{/if (!\$entry['visible'] \&\& !has_capability('moodle\/course:viewhiddencourses', \\core\\context\\system::instance(), \$userid)) {/;
