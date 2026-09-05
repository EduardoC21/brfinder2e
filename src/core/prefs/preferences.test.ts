import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PREFERENCES,
  moveColumn,
  readPreferences,
  sourcePreferences,
  withLayout,
  withSource,
} from './preferences';

/*
 * O que está gravado veio de uma versão ANTERIOR do app. É entrada não confiável vinda do
 * passado, e por isso a maior parte destes testes é sobre lixo — nenhum deles pode lançar.
 */

describe('readPreferences', () => {
  it('nada gravado vira o padrão', () => {
    expect(readPreferences(undefined)).toEqual(DEFAULT_PREFERENCES);
    expect(readPreferences(null)).toEqual(DEFAULT_PREFERENCES);
    expect(readPreferences('lixo')).toEqual(DEFAULT_PREFERENCES);
    expect(readPreferences(42)).toEqual(DEFAULT_PREFERENCES);
  });

  it('lê a forma completa', () => {
    const lido = readPreferences({
      sources: {
        actions: {
          columns: ['cost', 'sector'],
          filters: { traits: { values: ['attack'], combine: 'all' } },
        },
      },
      layout: { detailWidth: 500, detailCollapsed: false, popoutWidth: 600, popoutHeight: 700 },
    });
    expect(lido.sources['actions']?.columns).toEqual(['cost', 'sector']);
    expect(lido.sources['actions']?.filters['traits']).toEqual({
      values: ['attack'],
      combine: 'all',
    });
    expect(lido.layout).toEqual({
      detailWidth: 500,
      railCollapsed: false,
      detailCollapsed: false,
      popoutWidth: 600,
      popoutHeight: 700,
    });
  });

  it('descarta o que não reconhece em vez de quebrar', () => {
    const lido = readPreferences({
      sources: { actions: { columns: ['ok', 7, null], filters: { x: 'nao e objeto' } } },
      layout: { detailWidth: 'largo' },
      campoDeOutraVersao: true,
    });
    expect(lido.sources['actions']?.columns).toEqual(['ok']);
    expect(lido.sources['actions']?.filters).toEqual({});
    expect(lido.layout.detailWidth).toBeNull();
  });

  it('largura absurda é recusada, não guardada', () => {
    // Um Infinity gravado viraria uma coluna de detalhe infinita na abertura.
    expect(readPreferences({ layout: { detailWidth: Infinity } }).layout.detailWidth).toBeNull();
    expect(readPreferences({ layout: { detailWidth: -10 } }).layout.detailWidth).toBeNull();
    expect(readPreferences({ layout: { detailWidth: 0 } }).layout.detailWidth).toBeNull();
  });

  it('combine desconhecido não vira modo inválido', () => {
    const lido = readPreferences({
      sources: { a: { filters: { t: { values: ['x'], combine: 'talvez' } } } },
    });
    expect(lido.sources['a']?.filters['t']).toEqual({ values: ['x'] });
  });

  it('seleção vazia não é guardada: filtro sem valor é filtro desligado', () => {
    const lido = readPreferences({ sources: { a: { filters: { t: { values: [] } } } } });
    expect(lido.sources['a']?.filters).toEqual({});
  });
});

describe('withSource', () => {
  it('mexer numa fonte não toca nas outras', () => {
    const um = withSource(DEFAULT_PREFERENCES, 'actions', { columns: ['cost'] });
    const dois = withSource(um, 'conditions', { columns: ['group'] });
    expect(sourcePreferences(dois, 'actions').columns).toEqual(['cost']);
    expect(sourcePreferences(dois, 'conditions').columns).toEqual(['group']);
  });

  it('fonte nunca configurada devolve o vazio, não indefinido', () => {
    expect(sourcePreferences(DEFAULT_PREFERENCES, 'spells')).toEqual({
      columns: null,
      hiddenSpecials: [],
      filters: {},
    });
  });

  /*
   * `null` e `[]` precisam ser DIFERENTES. Iguais, desmarcar a última coluna caía no
   * padrão da fonte e a ressuscitava — não havia como desligar `setor` nem `grupo`.
   */
  /*
   * Guardamos o que está DESLIGADO. Assim a ausência de preferência já significa "todas
   * ligadas", e uma especial nova numa fonte futura nasce visível sem migrar nada.
   */
  it('as especiais vêm ligadas: guardamos só o que foi desligado', () => {
    expect(readPreferences({ sources: { a: {} } }).sources['a']?.hiddenSpecials).toEqual([]);
    expect(
      readPreferences({ sources: { a: { hiddenSpecials: ['traits', 7] } } }).sources['a']
        ?.hiddenSpecials,
    ).toEqual(['traits']);
  });

  it('nunca configurado é null; escolher nenhuma coluna é lista vazia', () => {
    expect(readPreferences({ sources: { a: { filters: {} } } }).sources['a']?.columns).toBeNull();
    expect(readPreferences({ sources: { a: { columns: [] } } }).sources['a']?.columns).toEqual([]);
  });
});

describe('withLayout', () => {
  /* Recolhido só é verdade se estiver gravado como `true`; qualquer outra coisa é falso. */
  it('recolhido é booleano de verdade, não valor conversível', () => {
    expect(readPreferences({ layout: { railCollapsed: 'sim' } }).layout.railCollapsed).toBe(false);
    expect(readPreferences({ layout: { railCollapsed: true } }).layout.railCollapsed).toBe(true);
  });

  it('troca só o que veio no remendo', () => {
    const p = withLayout(DEFAULT_PREFERENCES, { detailWidth: 480 });
    expect(p.layout.detailWidth).toBe(480);
    expect(p.layout.popoutWidth).toBeNull();
  });
});

describe('moveColumn', () => {
  const cols = ['a', 'b', 'c'];

  it('sobe e desce', () => {
    expect(moveColumn(cols, 'c', -1)).toEqual(['a', 'c', 'b']);
    expect(moveColumn(cols, 'a', 1)).toEqual(['b', 'a', 'c']);
  });

  it('nas pontas, não sai da lista', () => {
    expect(moveColumn(cols, 'a', -1)).toBe(cols);
    expect(moveColumn(cols, 'c', 1)).toBe(cols);
  });

  it('id que não está na lista não faz nada', () => {
    expect(moveColumn(cols, 'z', 1)).toBe(cols);
  });
});
