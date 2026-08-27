import { describe, expect, it } from 'vitest';

import { isClean } from '../report';
import { run } from '../run';
import { actionRecipe } from './action';
import { folderRoots, intercessionSpell, rage, samples, trip } from './action.fixtures';

const result = run(actionRecipe, samples, { folders: folderRoots });

describe('receita de action', () => {
  it('normaliza as três amostras sem falha, com relatório limpo', () => {
    expect(result.failures).toEqual([]);
    expect(result.entities).toHaveLength(3);
    expect(result.report.unmapped, JSON.stringify(result.report.unmapped)).toEqual([]);
    expect(isClean(result.report)).toBe(true);
  });
});

describe('Trip — perícia, uma ação, com raridade', () => {
  const entity = result.entities[0];

  it('projeta base', () => {
    expect(entity?.base).toEqual({
      name: 'Trip',
      slug: 'trip',
      costKind: 'action',
      costCount: 1,
      category: 'offensive',
      sector: 'Skill',
      traits: ['attack'],
      rarity: 'common',
      frequency: null,
      source: { license: 'ORC', title: 'Pathfinder Player Core', remaster: true },
    });
  });

  it('guarda a descrição com a marcação de rolagem intacta', () => {
    expect(entity?.desc.main).toBe(trip.system.description.value);
    expect(entity?.desc.main).toContain('[[/act');
  });
});

describe('Rage — classe, o setor vem da pasta', () => {
  const entity = result.entities[1];

  /**
   * A pasta é a ÚNICA coisa na base que separa as 30 ações básicas das 196 de classe:
   * nenhum traço marca uma ação como básica.
   */
  it('resolve o id da pasta para o nome da raiz', () => {
    expect(entity?.base.sector).toBe('Class');
    // no documento é um id opaco, não o nome
    expect(rage.folder).not.toBe('Class');
  });

  it('mantém a marcação de referência cruzada da descrição', () => {
    expect(entity?.desc.main).toContain('@UUID[Compendium.pf2e.conditionitems.Item.');
  });
});

describe('Intercession Spell — reação, com frequência e sem raridade', () => {
  const entity = result.entities[2];

  /** Medido nas 574: `action` sempre tem contagem; os outros três são sempre nulos. */
  it('reação tem contagem nula', () => {
    expect(entity?.base.costKind).toBe('reaction');
    expect(entity?.base.costCount).toBeNull();
  });

  it('lê a frequência', () => {
    expect(entity?.base.frequency).toEqual({ max: 1, per: 'day' });
  });

  /** 275 das 574 não declaram raridade. O padrão é o mesmo do sistema. */
  it('sem o campo, a raridade cai no padrão common', () => {
    expect(entity?.base.rarity).toBe('common');
    expect('rarity' in intercessionSpell.system.traits).toBe(false);
  });
});

describe('sem a tabela de pastas', () => {
  it('o setor cai no padrão vazio em vez de falhar', () => {
    const semPastas = run(actionRecipe, samples);
    expect(semPastas.failures).toEqual([]);
    expect(semPastas.entities.map((entity) => entity.base.sector)).toEqual(['', '', '']);
  });
});

describe('o que ficou de fora, e por quê', () => {
  it('rules, selfEffect e otherTags estão adiados, não ignorados', () => {
    expect(result.report.deferred.map((entry) => entry.path).sort()).toEqual([
      'system.rules',
      'system.selfEffect',
      'system.traits.otherTags',
    ]);
  });

  /** Achado ao rodar nas 574: o campo contradiz `traits.value` em pelo menos três. */
  it('o cache de interface vazado está ignorado, com o motivo escrito', () => {
    const motivo = result.report.ignored.find(
      (entry) => entry.path === 'system.traits.selected',
    )?.reason;
    expect(motivo).toMatch(/cache de interface/);
    expect(motivo).toMatch(/contradiz/);
  });
});
