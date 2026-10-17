# Write the close icon as a fresh object again: React 19 resets it on every render.
s/dangerouslySetInnerHTML=\{markup\(icons\.close\)\}/dangerouslySetInnerHTML={{__html: icons.close}}/;
