/**
 * TESTE DE CONTRATO da receita de `archetype` — as 249 páginas de verdade.
 *
 * Fora do `npm test`: baixa 34 MiB. Roda com `npm run test:contract`.
 */

import { beforeAll, describe, expect, it } from 'vitest';

import { KNOWN_GOOD_TAG, loadInventory, readTextEntry } from '@core/source/index';
import { createFetchHttp } from '@platform/http-fetch';
import { isClean } from '../report';
import { run, type RunResult } from '../run';
import { archetypeRecipe, type ArchetypeBase, type ArchetypeDesc } from './archetype';

const http = createFetchHttp({ headers: { Accept: 'application/vnd.github+json' } });
let result: RunResult<ArchetypeBase, ArchetypeDesc>;

beforeAll(async () => {
  const loaded = await loadInventory(http, { tag: KNOWN_GOOD_TAG });
  const pack = loaded.inventory.packs.find((entry) => entry.name === 'journals');
  if (!pack) throw new Error('o pack journals sumiu do manifesto');
  result = run(archetypeRecipe, [
    { pack: 'journals', documents: JSON.parse(readTextEntry(loaded.zip, pack.file)) as unknown[] },
  ]);
}, 180_000);

const contar = (chave: (b: ArchetypeBase) => string) => {
  const por = new Map<string, number>();
  for (const e of result.entities) por.set(chave(e.base), (por.get(chave(e.base)) ?? 0) + 1);
  return Object.fromEntries(por) as Record<string, number>;
};

describe('os 249 arquétipos reais', () => {
  it('normalizam todos, sem falha e com relatório limpo', () => {
    expect(result.failures).toEqual([]);
    expect(result.entities).toHaveLength(249);
    expect(isClean(result.report)).toBe(true);
  });

  /* A divisão do livro: as seis seções do jornal. */
  it('os seis tipos, pela seção do jornal', () => {
    expect(contar((b) => b.kind)).toEqual({
      general: 184,
      multiclass: 29,
      class: 14,
      mythic: 13,
      undead: 6,
      artifact: 3,
    });
    expect(contar((b) => b.rarity)).toEqual({ common: 236, uncommon: 8, rare: 5 });
  });

  /*
   * 232 dedicações com o traço `dedication`, mais os 12 destinos míticos cujo talento de
   * entrada se chama "X Dedication" com os traços `destiny` e `mythic` — pelo nome, 244.
   * Sem dedicação: os 3 artefatos, a abertura dos destinos e o Guardian.
   */
  it('244 dedicações pelo nome, e os talentos citados somam mais de 2.100', () => {
    const comDedicacao = result.entities.filter((e) => e.base.dedication !== null);
    expect(comDedicacao).toHaveLength(244);
    expect(result.entities.filter((e) => e.base.dedication === null)).toHaveLength(5);
    const todos = result.entities.flatMap((e) => e.base.featUuids);
    expect(new Set(todos).size).toBeGreaterThanOrEqual(2100);
    /* 205 páginas têm o bloco; em 1 ele está fora do trecho da dedicação. */
    expect(result.entities.filter((e) => e.base.prerequisites !== '')).toHaveLength(204);
  });

  it('o livro em todos, os 29 multiclasse com classe, e a página inteira em todos', () => {
    expect(result.entities.filter((e) => e.base.source.title === '')).toHaveLength(0);
    expect(result.entities.filter((e) => e.base.class !== null)).toHaveLength(29);
    for (const e of result.entities) {
      expect(e.desc.page.length, e.base.name).toBeGreaterThan(e.desc.main.length);
      expect(e.desc.page).not.toContain('@UUID[.');
    }
  });
});
