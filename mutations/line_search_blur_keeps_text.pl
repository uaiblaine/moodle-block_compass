# The field closes whatever the focus went to.
s/if \(next \|\| query === ''\) \{/if (searching) {/;
