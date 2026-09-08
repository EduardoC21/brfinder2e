import { describe, expect, it } from 'vitest';

import {
  columnsInScope,
  entitiesInScope,
  filtersInScope,
  filtersThatMatter,
  presetFor,
  scopeKey,
  selectedTypes,
} from './scope';
import type { BrowseEntity } from './query';
import { findSource, type SourceSpec } from './spec';

const equipamento = (): SourceSpec => {
  const fonte = findSource('equipment');
  if (!fonte) throw new Error('a fonte de equipamento sumiu do descritor');
  return fonte;
};

const ids = (lista: readonly { readonly id: string }[]): readonly string[] =>
  lista.map((item) => item.id);

describe('selectedTypes', () => {
  it('lê o filtro que a fonte declarou como Tipo', () => {
    expect(selectedTypes(equipamento(), { kind: { values: ['weapon'] } })).toEqual(['weapon']);
  });

  /** "Sem valor" não é um Tipo: é a ausência dele, e não recorta coluna nenhuma. */
  it('ignora o vazio e os limites de faixa', () => {
    expect(selectedTypes(equipamento(), { kind: { values: ['', 'weapon'] } })).toEqual(['weapon']);
    expect(selectedTypes(equipamento(), { price: { values: ['min:100'] } })).toEqual([]);
  });

  it('fonte sem Tipo devolve vazio', () => {
    const conditions = findSource('conditions');
    if (!conditions) throw new Error('a fonte de condições sumiu do descritor');
    expect(conditions.typeFilter).toBeNull();
    expect(selectedTypes(conditions, { group: { values: ['senses'] } })).toEqual([]);
  });
});

describe('o recorte de colunas', () => {
  /*
   * A visão geral é a mais POBRE de propósito: é a única em que uma coluna pode estar
   * vazia em 90% das linhas. Sem Tipo marcado, só o que se aplica a tudo.
   */
  it('sem Tipo marcado, só as universais', () => {
    expect(ids(columnsInScope(equipamento(), []))).toEqual(['kind', 'price', 'bulk', 'source']);
  });

  it('com um Tipo, as universais mais as dele', () => {
    const arma = ids(columnsInScope(equipamento(), ['weapon']));
    expect(arma).toContain('damage');
    expect(arma).toContain('reload');
    expect(arma).toContain('price');
    // Nada de armadura numa lista de armas.
    expect(arma).not.toContain('acBonus');
    expect(arma).not.toContain('hardness');
  });

  /* A regra do autor: com dois Tipos, só o que os dois têm EM COMUM. */
  it('com dois Tipos, só a interseção', () => {
    const armaduraEscudo = ids(columnsInScope(equipamento(), ['armor', 'shield']));
    // Os dois têm CA e penalidade de deslocamento; só armadura tem limite de Destreza.
    expect(armaduraEscudo).toContain('acBonus');
    expect(armaduraEscudo).toContain('speedPenalty');
    expect(armaduraEscudo).not.toContain('dexCap');
    expect(armaduraEscudo).not.toContain('hardness');

    const armaArmadura = ids(columnsInScope(equipamento(), ['weapon', 'armor']));
    expect(armaArmadura).toContain('category');
    expect(armaArmadura).toContain('group');
    expect(armaArmadura).not.toContain('damage');
  });

  it('Tipos sem nada em comum ficam só com as universais', () => {
    expect(ids(columnsInScope(equipamento(), ['weapon', 'treasure']))).toEqual([
      'kind',
      'category',
      'price',
      'bulk',
      'source',
    ]);
  });
});

describe('o recorte de filtros segue a mesma regra', () => {
  it('sem Tipo, nenhum filtro específico', () => {
    const geral = ids(filtersInScope(equipamento(), []));
    expect(geral).toContain('kind');
    expect(geral).toContain('price');
    expect(geral).not.toContain('hands');
    expect(geral).not.toContain('acBonus');
  });

  it('com arma marcada, os filtros de arma aparecem', () => {
    const arma = ids(filtersInScope(equipamento(), ['weapon']));
    expect(arma).toContain('weaponType');
    expect(arma).toContain('hands');
    expect(arma).toContain('reload');
  });
});

describe('o preset', () => {
  it('só liga com UM Tipo marcado', () => {
    expect(presetFor(equipamento(), ['weapon'])).toEqual(['group', 'damage', 'hands']);
    expect(presetFor(equipamento(), ['armor'])).toEqual(['category', 'acBonus', 'dexCap']);
    expect(presetFor(equipamento(), [])).toBeNull();
    expect(presetFor(equipamento(), ['weapon', 'armor'])).toBeNull();
  });

  it('Tipo sem preset declarado não inventa nenhum', () => {
    expect(presetFor(equipamento(), ['kit'])).toBeNull();
  });

  /* Toda coluna de preset tem de estar NO ESCOPO daquele Tipo, senão liga e não aparece. */
  it('todo preset cabe no recorte do próprio Tipo', () => {
    const fonte = equipamento();
    for (const [tipo, colunas] of Object.entries(fonte.presets ?? {})) {
      const disponiveis = ids(columnsInScope(fonte, [tipo]));
      for (const coluna of colunas) {
        expect(disponiveis, `${tipo} → ${coluna}`).toContain(coluna);
      }
    }
  });
});

describe('scopeKey', () => {
  it('é o Tipo quando é um só, e vazia no resto', () => {
    expect(scopeKey(['weapon'])).toBe('weapon');
    expect(scopeKey([])).toBe('');
    expect(scopeKey(['weapon', 'armor'])).toBe('');
  });
});

/*
 * O SEGUNDO corte dos filtros: `filtersInScope` responde "este filtro pertence a este
 * Tipo?", e este responde "e ele ainda tem o que oferecer?".
 */
const item = (kind: string, extra: Record<string, unknown>): BrowseEntity => ({
  key: `${kind}:${String(extra['name'])}`,
  uuid: '',
  base: { kind, traits: [], ...extra },
});

const catalogo: readonly BrowseEntity[] = [
  item('weapon', { name: 'Longsword', category: 'martial', group: 'sword' }),
  item('weapon', { name: 'Club', category: 'simple', group: 'club' }),
  item('shield', { name: 'Steel Shield', category: '', group: '' }),
  item('shield', { name: 'Buckler', category: '', group: '' }),
];

describe('o recorte de entradas pelo Tipo', () => {
  it('sem Tipo marcado, são todas', () => {
    expect(entitiesInScope(equipamento(), catalogo, {})).toHaveLength(4);
  });

  it('com Tipo marcado, só as daquele Tipo', () => {
    const so = entitiesInScope(equipamento(), catalogo, { kind: { values: ['shield'] } });
    expect(so).toHaveLength(2);
  });
});

describe('os filtros que ainda têm o que oferecer', () => {
  const idsDe = (tipos: readonly string[], filtros = {}) => {
    const fonte = equipamento();
    const noEscopo = filtersInScope(fonte, tipos);
    const dentro = entitiesInScope(fonte, catalogo, filtros);
    return ids(filtersThatMatter(fonte, noEscopo, dentro, filtros));
  };

  /*
   * Escudo não tem categoria nem grupo — as duas colunas vêm vazias nos 126. Um botão de
   * filtro que só pode não fazer nada não deveria ocupar espaço na barra.
   */
  it('some o filtro cujo Tipo responde sempre a mesma coisa', () => {
    const escudo = idsDe(['shield'], { kind: { values: ['shield'] } });
    expect(escudo).not.toContain('category');
    expect(escudo).not.toContain('group');
  });

  it('fica o filtro que ainda separa as entradas', () => {
    const arma = idsDe(['weapon'], { kind: { values: ['weapon'] } });
    expect(arma).toContain('category');
    expect(arma).toContain('group');
  });

  /* O Tipo nunca some: medido dentro do próprio recorte ele teria um valor só. */
  it('o Tipo sobrevive ao próprio recorte', () => {
    expect(idsDe(['shield'], { kind: { values: ['shield'] } })).toContain('kind');
  });

  /*
   * Nem o que a pessoa está usando: sem ele na barra, some a explicação da lista curta.
   * Aqui a amostra não tem armadura nenhuma, então `category` não teria o que oferecer —
   * e fica assim mesmo, porque há uma categoria marcada.
   */
  it('o filtro marcado sobrevive mesmo sem nada a oferecer', () => {
    const filtros = { kind: { values: ['armor'] }, category: { values: ['light'] } };
    expect(idsDe(['armor'], filtros)).toContain('category');
  });
});
