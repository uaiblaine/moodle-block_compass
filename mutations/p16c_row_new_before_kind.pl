my $new = '';
$new = $1 if s/\n[ ]*(\{row\.new && <span className="compass-card-kind compass-row-chip" title=\{labels\.badge_new\}>\{labels\.badge_new\}<\/span>\})//;
s/(\n[ ]*)(\{kind !== undefined && \()/$1$new$1$2/ if $new ne '';
