# Drop the no-thumbnail row's own areas: it falls back to the image's three columns over its two.
s/(\.block_compass \.compass-row\.compass-row-nothumb \{\n    grid-template-columns: minmax\(0, 1fr\) auto;\n)    grid-template-areas:\n        "name controls"\n        "line line";\n/$1/;
