s/(\.block_compass \.compass-fpanel-group \{\n[^}]*\}\n)/$1\n.block_compass .compass-filterline-full .compass-fpanel-group {\n    flex-direction: row;\n}\n/;
