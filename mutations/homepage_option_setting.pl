s/if \(during_initial_install\(\) \|\| !config::page_enabled\(\) \|\| !session_guard::block_enabled\(\)\) \{/if (during_initial_install() || !session_guard::block_enabled()) {/;
