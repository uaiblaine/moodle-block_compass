# Let the row's name wrap: a long name takes a second line and pushes the qualifiers out of the row.
s/(\.block_compass \.compass-row-name \{\n    display: block;\n    overflow: hidden;\n    text-overflow: ellipsis;\n)    white-space: nowrap;\n/$1/;
