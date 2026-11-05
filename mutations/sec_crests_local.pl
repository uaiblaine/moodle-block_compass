s/\$url = category_link::local_url\(\$crest\['url'\] \?\? null\) \?\? '';\n(\s+)if \(\$url === ''\) \{/\$url = clean_param((string) (\$crest['url'] ?? ''), PARAM_URL);\n$1if (\$url === '') {/;
