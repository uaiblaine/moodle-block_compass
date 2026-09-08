s/if \(!is_string\(\$field\) \|\| \$field === '' \|\| clean_param\(\$field, PARAM_ALPHANUMEXT\) !== \$field\) \{/if (!is_string(\$field) || \$field === '') {/;
