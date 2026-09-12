import { describe, expect, it } from 'vitest';

import { isClean } from '../report';
import { run } from '../run';
import { featureRecipe } from './feature';
import { pastas, todas } from './feature.fixtures';

const result = run(featureRecipe, [
  { pack: 'ancestryfeatures', documents: todas, folders: pastas },
]);

const base = (nome: string) => {
  const achado = result.entities.find((entity) => entity.base.name === nome);
  if (!achado) throw new Error(`amostra ${nome} não normalizou`);
  return achado.base;
};

describe('receita de habilidade', () => {
  it('normaliza as duas amostras sem falha, com relatório limpo', () => {
    expect(result.failures).toEqual([]);
    expect(result.entities).toHaveLength(2);
    expect(result.report.unmapped, JSON.stringify(result.report.unmapped)).toEqual([]);
    expect(isClean(result.report)).toBe(true);
  });

  it('lê documentos do tipo feat e produz entidades do tipo feature', () => {
    expect(result.type).toBe('feature');
    expect(todas.every((doc) => doc.type === 'feat')).toBe(true);
  });

  it('projeta a habilidade inteira, com a ancestralidade dona pela pasta', () => {
    expect(base('Clan Dagger')).toEqual({
      name: 'Clan Dagger',
      slug: 'clan-dagger',
      category: 'ancestryfeature',
      owner: 'Dwarf',
      level: 0,
      traits: [],
      rarity: 'common',
      source: { license: 'ORC', title: 'Pathfinder Player Core', remaster: true },
    });
    expect(base('Awakened Mind').owner).toBe('Awakened Animal');
  });
});
