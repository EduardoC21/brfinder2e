import { describe, expect, it } from 'vitest';

import type { ListTabSpec } from './spec';
import { lockedEntities } from './tabs';

const dwarf = { key: 'd', uuid: 'd', base: { name: 'Dwarf', slug: 'dwarf', countsAs: ['dwarf'] } };
const aiuvarin = {
  key: 'a',
  uuid: 'a',
  base: { name: 'Aiuvarin', slug: 'aiuvarin', countsAs: ['aiuvarin', 'elf'] },
};
const herancas = [
  { key: '1', uuid: '1', base: { name: 'Forge Dwarf', ancestry: { slug: 'dwarf' } } },
  { key: '2', uuid: '2', base: { name: 'Cavern Elf', ancestry: { slug: 'elf' } } },
];
const talentos = [
  { key: 'a', uuid: 'a', base: { name: 'Rock Runner', category: 'ancestry', traits: ['dwarf'] } },
  { key: 'b', uuid: 'b', base: { name: 'Nimble Elf', category: 'ancestry', traits: ['elf'] } },
  {
    key: 'c',
    uuid: 'c',
    base: { name: 'Elven Aloofness', category: 'ancestry', traits: ['aiuvarin'] },
  },
  { key: 'u', uuid: 'u', base: { name: 'Eldritch Calm', category: 'ancestry', traits: [] } },
  { key: 's', uuid: 's', base: { name: 'Cat Fall', category: 'skill', traits: ['general'] } },
];
const ancestrias = [dwarf, aiuvarin, { key: 'e', uuid: 'e', base: { name: 'Elf', slug: 'elf' } }];
const lookup = (id: string) => (id === 'ancestries' ? ancestrias : undefined);

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

  /* O Aiuvarin conta como elfo: os talentos dele são os de `aiuvarin` E os de `elf`. */
  it('trava por pertencimento, com a lista de "conta como"', () => {
    const tab: ListTabSpec = {
      kind: 'list',
      id: 'f',
      source: 'feats',
      lock: [{ field: 'traits', from: 'countsAs', match: 'contains' }],
    };
    expect(lockedEntities(tab, dwarf, talentos).map((e) => e.key)).toEqual(['a']);
    expect(lockedEntities(tab, aiuvarin, talentos).map((e) => e.key)).toEqual(['b', 'c']);
  });

  /* O universal: de ancestralidade, e sem traço de ancestralidade nenhuma. */
  it('trava por valor fixo e por "nenhum de" contra uma fonte', () => {
    const tab: ListTabSpec = {
      kind: 'list',
      id: 'u',
      source: 'feats',
      lock: [
        { field: 'category', value: 'ancestry', match: 'is' },
        { field: 'traits', source: 'ancestries', key: 'slug', match: 'none-of' },
      ],
    };
    expect(lockedEntities(tab, dwarf, talentos, lookup).map((e) => e.key)).toEqual(['u']);
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
