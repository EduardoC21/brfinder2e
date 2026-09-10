import { describe, expect, it } from 'vitest';

import { isClean } from '../report';
import { run } from '../run';
import { familiarRecipe } from './familiar';
import { todas } from './familiar.fixtures';

const result = run(familiarRecipe, [{ pack: 'familiar-abilities', documents: todas }]);

const base = (nome: string) => {
  const achado = result.entities.find((entity) => entity.base.name === nome);
  if (!achado) throw new Error(`amostra ${nome} não normalizou`);
  return achado.base;
};

describe('receita de familiar', () => {
  it('normaliza as três amostras sem falha, com relatório limpo', () => {
    expect(result.failures).toEqual([]);
    expect(result.entities).toHaveLength(3);
    expect(result.report.unmapped, JSON.stringify(result.report.unmapped)).toEqual([]);
    expect(isClean(result.report)).toBe(true);
  });

  /* Os documentos são `action`; a entidade é `familiar`. É o `accepts` em ação. */
  it('lê documentos do tipo action e produz entidades do tipo familiar', () => {
    expect(result.type).toBe('familiar');
    expect(todas.every((doc) => doc.type === 'action')).toBe(true);
  });

  it('projeta a habilidade inteira', () => {
    expect(base('Stunning Flare')).toEqual({
      name: 'Stunning Flare',
      slug: 'stunning-flare',
      costKind: 'action',
      costCount: 1,
      traits: ['fire', 'light', 'magical'],
      rarity: 'common',
      frequency: { max: 1, per: 'PT10M' },
      source: {
        license: 'ORC',
        remaster: true,
        title: 'Pathfinder Lost Omens Tian Xia Character Guide',
      },
    });
  });

  /* 52 dos 111 não declaram raridade, e o padrão do sistema é `common`. */
  it('raridade ausente vale common', () => {
    expect(base('Versatile Form').rarity).toBe('common');
  });

  it('passiva não tem contagem nem frequência', () => {
    expect(base('Mass-Produced').costKind).toBe('passive');
    expect(base('Mass-Produced').costCount).toBeNull();
    expect(base('Mass-Produced').frequency).toBeNull();
  });
});
