import { expect, test } from 'vitest';
import { buildGraph, KINDS, keyTerm, parseDoc, selectGraph, splitClause, termsOf, toMermaid } from '../src/core.ts';

const [GIVEN, WHEN, THEN] = KINDS;
const COMPOUND = 'it shows the lockup, and the caret';
const DOC = `---
relatedConfigurations: ['../../Makefile']
---

# 0002 Site Shell

Source: \`src/pages/site.ts:39\`

## Requirements

- 0002.1
    - Given Visitor opens the site
        - When the page loads
            - Then it shows the lockup, and the caret
- 0002.2
    - Given Developer has a stylesheet
        - When I run \`make check\`
            - Then it fails

# 0003 Not A Second Title
`;

test('0001.1 the page reads each acceptance with its lines and clauses', () => {
  const doc = parseDoc(DOC);
  expect(doc.id).toBe('0002');
  expect(doc.name).toBe('Site Shell');
  expect(doc.source).toEqual({ line: 39, path: 'src/pages/site.ts' });
  expect(doc.acceptances).toEqual([
    {
      givens: ['Visitor opens the site'],
      id: '0002.1',
      line: 11,
      lines: [11, 12, 13, 14],
      thens: [COMPOUND],
      whens: ['the page loads'],
    },
    {
      givens: ['Developer has a stylesheet'],
      id: '0002.2',
      line: 15,
      lines: [15, 16, 17, 18],
      thens: ['it fails'],
      whens: ['I run `make check`'],
    },
  ]);
});

test('0001.2 each part of a compound clause gives its own key term', () => {
  expect(splitClause(COMPOUND)).toEqual(['it shows the lockup', 'the caret']);
  expect(splitClause('Owner has `a, b` files and a ruleset')).toEqual(['Owner has files', 'a ruleset']);
  expect(termsOf([COMPOUND, 'it shows `x`'], THEN)).toEqual(['shows', 'caret']);
  expect(termsOf(['`make check`', 'it is, and the caret'], THEN)).toEqual(['caret']);
});

test('0001.3 key terms drop filler, and When reaches past "the noun" to the verb', () => {
  expect(keyTerm('Developer has a stylesheet', GIVEN)).toBe('developer');
  expect(keyTerm("the owner's 2 fit-ness checks", GIVEN)).toBe('owner');
  expect(keyTerm(' -dash- runs', GIVEN)).toBe('dash');
  expect(keyTerm('I run', WHEN)).toBe('run');
  expect(keyTerm('the page loads', WHEN)).toBe('loads');
  expect(keyTerm('the page', WHEN)).toBe('page');
  expect(keyTerm('it is', THEN)).toBeNull();
  expect(keyTerm('one or two of the many files', GIVEN)).toBe('files');
  expect(keyTerm('both of the last runs', GIVEN)).toBe('runs');
});

test('0001.4 the Mermaid text holds the largest terms and links, the same every time', () => {
  const acceptances = [
    ...parseDoc(DOC).acceptances,
    { givens: ['Visitor opens it'], thens: ['it shows the caret'], whens: ['the site loads'] },
  ];
  const graph = buildGraph(acceptances);
  const picked = selectGraph(graph, { cap: 4, min: 1 });
  const text = toMermaid(picked, new Set(['g_visitor']));
  expect(text).toBe(
    [
      'flowchart LR',
      '  g_visitor("visitor · 2 •"):::given',
      '  g_developer("developer · 1"):::given',
      '  w_loads{{"loads · 2"}}:::when',
      '  t_shows["shows · 2"]:::then',
      '  g_visitor -->|2| w_loads',
      '  linkStyle 0 stroke-width:5.0px',
      '  w_loads -->|2| t_shows',
      '  linkStyle 1 stroke-width:5.0px',
      '',
    ].join('\n')
  );
  expect(toMermaid(selectGraph(graph, { cap: 4, min: 1 }), new Set(['g_visitor']))).toBe(text);
  expect(toMermaid(selectGraph(graph, { cap: 40, min: 3 }), new Set())).toBe('flowchart LR\n');
  const fit = toMermaid(
    selectGraph(buildGraph([{ givens: ['fit-ness'], thens: [], whens: [] }]), { cap: 1, min: 1 }),
    new Set()
  );
  expect(fit).toBe('flowchart LR\n  g_fit_ness("fit-ness · 1"):::given\n');
  const fork = selectGraph(buildGraph([{ givens: [], thens: ['it passes, and it ends'], whens: ['I run'] }]), {
    cap: 3,
    min: 1,
  });
  expect(fork.edges.map((e) => e.to)).toEqual(['t_ends', 't_passes']);
});
