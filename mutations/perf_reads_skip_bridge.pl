s/=> fetchOne<T>\(\{methodname, args\}\);/=> amd<any>('core\/ajax').then((ajax) => ajax.call([{methodname, args}])[0]);/;
