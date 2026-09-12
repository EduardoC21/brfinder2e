import { describe, expect, it } from 'vitest';

import type { ListTabSpec } from './spec';
import { lockedEntities } from './tabs';

const dwarf = { key: 'd', uuid: 'd', base: { name: 'Dwarf', slug: 'dwarf' } };
const herancas = [
  { key: '1', uuid: '1', base: { name: 'Forge Dwarf', ancestry: { slug: 'dwarf' } } },
  { key: '2', uuid: '2', base: { name: 'Cavern Elf', ancestry: { slug: 'elf' } } },
];
const talentos = [
  { key: 'a', uuid: 'a', base: { name: 'Rock Runner', traits: ['dwarf'] } },
  { key: 'b', uuid: 'b', base: { name: 'Nimble Elf', traits: ['elf'] } },
];

describe('lockedEntities', () => {
  it('trava por igualdade num campo aninhado', () => {
    const tab: ListTabSpec = {
      kind: 'list',
      id: 'h',
      source: 'heritages',
      lock: [{ field: 'ancestry.slug', from: 'slug', match: 'equals' }],
    };
    expect(lockedEntities(tab, dwarf, herancas).map((e) => e.key)).toEqual(['1']);
  });

  it('trava por pertencimento numa lista', () => {
    const tab: ListTabSpec = {
      kind: 'list',
      id: 'f',
      source: 'feats',
      lock: [{ field: 'traits', from: 'slug', match: 'contains' }],
    };
    expect(lockedEntities(tab, dwarf, talentos).map((e) => e.key)).toEqual(['a']);
  });

  it('sem valor de onde travar, nada passa', () => {
    const tab: ListTabSpec = {
      kind: 'list',
      id: 'f',
      source: 'feats',
      lock: [{ field: 'traits', from: 'nada', match: 'contains' }],
    };
    expect(lockedEntities(tab, dwarf, talentos)).toEqual([]);
  });
});
