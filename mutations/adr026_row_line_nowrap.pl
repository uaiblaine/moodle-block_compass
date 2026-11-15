# Let the second line wrap: a row with many qualifiers draws a third line inside a fixed height.
s/(\.block_compass \.compass-row-line \{\n    display: flex;\n    grid-area: line;\n    flex-wrap: )nowrap;/${1}wrap;/;
