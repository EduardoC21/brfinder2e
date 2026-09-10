import { describe, expect, it } from 'vitest';

import { isClean } from '../report';
import { run } from '../run';
import { deityRecipe } from './deity';
import { folderRoots, todas } from './deity.fixtures';

const result = run(deityRecipe, [{ pack: 'deities', documents: todas, folders: folderRoots }]);

const base = (nome: string) => {
  const achado = result.entities.find((entity) => entity.base.name === nome);
  if (!achado) throw new Error(`amostra ${nome} não normalizou`);
  return achado.base;
};

describe('receita de deity', () => {
  it('normaliza as três amostras sem falha, com relatório limpo', () => {
    expect(result.failures).toEqual([]);
    expect(result.entities).toHaveLength(3);
    expect(result.report.unmapped, JSON.stringify(result.report.unmapped)).toEqual([]);
    expect(isClean(result.report)).toBe(true);
  });

  it('projeta a divindade inteira', () => {
    expect(base('Sarenrae')).toEqual({
      name: 'Sarenrae',
      slug: 'sarenrae',
      kind: 'deity',
      group: 'Core Gods',
      divineAttribute: ['con', 'wis'],
      font: ['heal'],
      sanctification: 'can:holy',
      divineSkill: ['medicine'],
      weapons: ['scimitar'],
      domains: ['fire', 'healing', 'sun', 'truth'],
      alternateDomains: ['repose'],
      spells: [
        { rank: 1, uuid: 'Compendium.pf2e.spells-srd.Item.y6rAdMK6EFlV6U0t' },
        { rank: 3, uuid: 'Compendium.pf2e.spells-srd.Item.sxQZ6yqTn0czJxVd' },
        { rank: 4, uuid: 'Compendium.pf2e.spells-srd.Item.IarZrgCeaiUqOuRu' },
      ],
      source: {
        license: 'ORC',
        remaster: true,
        title: 'Pathfinder Lost Omens Divine Mysteries',
      },
    });
  });

  /* Santificação nula é "nenhuma", e vira o token vazio — não um "null" escrito. */
  it('a filosofia não tem fonte, santificação, domínio, arma nem magia', () => {
    const f = base('Laws of Mortality');
    expect(f.kind).toBe('philosophy');
    expect(f.font).toEqual([]);
    expect(f.sanctification).toBe('');
    expect(f.domains).toEqual([]);
    expect(f.weapons).toEqual([]);
    expect(f.spells).toEqual([]);
    expect(f.group).toBe('Philosophies');
  });

  it('o panteão tem tudo que um deus tem', () => {
    const p = base('Guardians of the Sacred Self');
    expect(p.kind).toBe('pantheon');
    expect(p.alternateDomains).toEqual(['freedom', 'truth']);
    expect(p.spells).toHaveLength(3);
  });
});
