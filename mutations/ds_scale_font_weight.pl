# Put the empty result's title on a weight the scale does not have.
s/(\.block_compass \.compass-noresults-title \{\n    margin: 0;\n    color: var\(--block_compass-ink\);\n    font-size: 1rem;\n    font-weight: )600;/${1}800;/;
