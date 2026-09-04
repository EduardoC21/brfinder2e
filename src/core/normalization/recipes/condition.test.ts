import { describe, expect, it } from 'vitest';

import { isClean } from '../report';
import { run } from '../run';
import { conditionRecipe } from './condition';
import { blinded, cursebound, languageSample, offGuard, samples } from './condition.fixtures';

const result = run(conditionRecipe, [{ pack: 'conditionitems', documents: samples }], {
  language: languageSample,
});

describe('receita de condition', () => {
  it('normaliza as três amostras sem falha', () => {
    expect(result.failures).toEqual([]);
    expect(result.entities).toHaveLength(3);
  });

  it('o relatório fica limpo — nada por decidir', () => {
    expect(result.report.unmapped, JSON.stringify(result.report.unmapped)).toEqual([]);
    expect(isClean(result.report)).toBe(true);
  });

  it('carrega a identidade a partir do UUID canônico do release (briefing 7.3)', () => {
    expect(result.entities[0]?.identity).toEqual({
      id: 'XgEqL1kFApUbl5Z2',
      uuid: 'Compendium.pf2e.conditionitems.Item.XgEqL1kFApUbl5Z2',
      type: 'condition',
    });
  });
});

describe('Blinded — grupo não nulo, overrides preenchido, não valorada', () => {
  const entity = result.entities[0];

  it('projeta base', () => {
    expect(entity?.base).toEqual({
      name: 'Blinded',
      slug: 'blinded',
      group: 'senses',
      valued: false,
      initialValue: null,
      overrides: ['dazzled'],
      source: { license: 'ORC', title: 'Pathfinder Player Core', remaster: true },
      summary: "You're unable to see.",
    });
  });

  it('guarda a descrição em desc, com a marcação @UUID intacta', () => {
    expect(entity?.desc.main).toBe(blinded.system.description.value);
    expect(entity?.desc.main).toContain('@UUID[Compendium.pf2e.conditionitems.Item.');
  });
});

describe('Off-Guard — grupo nulo', () => {
  const entity = result.entities[1];

  it('mantém o nulo em vez de virar ausente', () => {
    expect(entity?.base.group).toBeNull();
    expect(offGuard.system.group).toBeNull();
  });

  it('overrides vazio continua sendo lista vazia', () => {
    expect(entity?.base.overrides).toEqual([]);
  });
});

describe('Cursebound — valorada, e a única sem summary', () => {
  const entity = result.entities[2];

  it('lê o par valued/initialValue da união do schema', () => {
    expect(entity?.base.valued).toBe(true);
    expect(entity?.base.initialValue).toBe(1);
    expect(cursebound.system.value.isValued).toBe(true);
  });

  /**
   * `Cursebound` é condição de mecânica de classe (maldição de oráculo), não do capítulo
   * geral de condições de onde saem os `summary`. Por isso o campo é opcional: a ausência
   * é do dado da Paizo, não erro nosso.
   */
  it('sem entrada na tabela de idioma, o campo simplesmente não existe', () => {
    expect(entity?.base).not.toHaveProperty('summary');
    expect(languageSample.has('PF2E.condition.cursebound.summary')).toBe(false);
  });

  it('registra o livro diferente das outras', () => {
    expect(entity?.base.source.title).toBe('Pathfinder Player Core 2');
  });
});

describe('o que ficou de fora, e por quê', () => {
  it('system.rules está adiado, não ignorado — vai fazer falta na ficha', () => {
    const deferred = result.report.deferred.map((entry) => entry.path);
    expect(deferred).toEqual(['system.rules']);
    expect(result.report.deferred[0]?.reason).toMatch(/rule elements/);
  });

  it('todo ignorado tem motivo escrito', () => {
    expect(result.report.ignored.length).toBeGreaterThan(0);
    for (const entry of result.report.ignored) {
      expect(entry.reason.trim().length, entry.path).toBeGreaterThan(10);
    }
  });

  it('os campos fora do schema atual estão listados com esse motivo', () => {
    const byPath = new Map(result.report.ignored.map((entry) => [entry.path, entry.reason]));
    for (const path of ['system.active', 'system.removable', 'system.value.immutable']) {
      expect(byPath.get(path), path).toMatch(/fora do schema atual/);
    }
  });
});

describe('o tipo de saída', () => {
  it('base é ConditionBase de verdade, sem conversão no consumidor', () => {
    const entity = result.entities[0];
    if (!entity) throw new Error('sem entidade');

    // Se o motor devolvesse Record<string, unknown>, nada disto compilaria sem `as`.
    const nome: string = entity.base.name;
    const grupo: string | null = entity.base.group;
    const valorada: boolean = entity.base.valued;
    const inicial: number | null = entity.base.initialValue;
    const anula: readonly string[] = entity.base.overrides;
    const remaster: boolean = entity.base.source.remaster;
    const resumo: string | undefined = entity.base.summary;

    expect([nome, grupo, valorada, inicial, anula, remaster, resumo]).toBeDefined();
  });
});
