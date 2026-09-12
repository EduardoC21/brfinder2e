import { describe, expect, it } from 'vitest';

import { isClean } from '../report';
import { run } from '../run';
import { forgeDwarf, nephilim } from './ancestry.fixtures';
import { heritageRecipe } from './heritage';

const result = run(heritageRecipe, [{ pack: 'heritages', documents: [forgeDwarf, nephilim] }]);

describe('receita de herança', () => {
  it('fica com a herança própria e deixa a versátil para a ancestralidade', () => {
    expect(result.failures).toEqual([]);
    expect(result.entities).toHaveLength(1);
    expect(result.report.unmapped, JSON.stringify(result.report.unmapped)).toEqual([]);
    expect(isClean(result.report)).toBe(true);
  });

  it('projeta a herança inteira, com a ancestralidade dona', () => {
    expect(result.entities[0]?.base).toEqual({
      name: 'Forge Dwarf',
      slug: 'forge-dwarf',
      rarity: 'common',
      traits: [],
      ancestry: {
        name: 'Dwarf',
        slug: 'dwarf',
        uuid: 'Compendium.pf2e.ancestries.Item.BYj5ZvlXZdpaEgA6',
      },
      alterations: [],
      source: { license: 'ORC', title: 'Pathfinder Player Core', remaster: true },
    });
  });
});
