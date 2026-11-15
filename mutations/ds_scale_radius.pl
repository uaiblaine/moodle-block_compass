# Put the card's kind chip on a radius the scale does not have.
s/(\.block_compass \.compass-card-kind \{(?:\n    [^\n]*){7}\n    border-radius: )999px;/${1}10px;/;
