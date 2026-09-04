import { describe, expect, it } from 'vitest';

import { findUnreadPacks } from './unread-packs';

const lidos = new Set(['actionspf2e', 'adventure-specific-actions', 'conditionitems']);
const importados = new Set(['action', 'condition']);

describe('findUnreadPacks', () => {
  it('acusa um pack não lido que traz um tipo que importamos', () => {
    // O caso real: 111 habilidades de familiar, tipadas `action`, num pack que ninguém lê.
    const achados = findUnreadPacks(
      [{ pack: 'familiar-abilities', types: Array.from({ length: 111 }, () => 'action') }],
      lidos,
      importados,
    );
    expect(achados).toEqual([{ pack: 'familiar-abilities', counts: { action: 111 }, total: 111 }]);
  });

  it('ignora o que a receita já lê', () => {
    expect(
      findUnreadPacks([{ pack: 'actionspf2e', types: ['action'] }], lidos, importados),
    ).toEqual([]);
  });

  /*
   * O caso que garante que o aviso não vira ruído: um bestiário de aventura tem npc,
   * hazard e vehicle, e as habilidades das criaturas moram EMBUTIDAS dentro do npc.
   * Nenhum documento de topo é de um tipo que importamos.
   */
  it('bestiário de aventura não gera aviso nenhum', () => {
    const achados = findUnreadPacks(
      [
        {
          pack: 'the-dead-gods-hand-bestiary',
          types: [...Array.from({ length: 29 }, () => 'npc'), 'hazard', 'vehicle'],
        },
      ],
      lidos,
      importados,
    );
    expect(achados).toEqual([]);
  });

  it('conta só os tipos que importamos, e ignora o resto do pack', () => {
    const achados = findUnreadPacks(
      [{ pack: 'campaign-effects', types: ['condition', 'effect', 'effect', 'feat'] }],
      lidos,
      importados,
    );
    expect(achados[0]).toEqual({ pack: 'campaign-effects', counts: { condition: 1 }, total: 1 });
  });

  it('o que mais pesa vem primeiro', () => {
    const achados = findUnreadPacks(
      [
        { pack: 'pequeno', types: ['action'] },
        { pack: 'grande', types: ['action', 'action', 'action'] },
      ],
      lidos,
      importados,
    );
    expect(achados.map((entry) => entry.pack)).toEqual(['grande', 'pequeno']);
  });

  it('sem nada a avisar, devolve lista vazia', () => {
    expect(findUnreadPacks([], lidos, importados)).toEqual([]);
  });
});
