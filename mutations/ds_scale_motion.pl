# Put the ghost card's hover on a duration the motion scale does not have.
s/(\.block_compass \.compass-ghost \{\n    border-style: dashed;\n    border-color: var\(--block_compass-line\);\n    color: inherit;\n    background: transparent;\n    transition: background-color )150ms/${1}130ms/;
