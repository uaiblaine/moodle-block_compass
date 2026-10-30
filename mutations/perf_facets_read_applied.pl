s/const facets = useMemo\(\(\) => countFacets\(term\), \[countFacets, term\]\);/const facets = useMemo(() => countFacets(applied), [countFacets, applied]);/;
