/**
 * TESTE DE CONTRATO da receita de `rule` — as 64 páginas de verdade.
 *
 * Fora do `npm test`: baixa 34 MiB. Roda com `npm run test:contract`.
 */

import { beforeAll, describe, expect, it } from 'vitest';

import { KNOWN_GOOD_TAG, loadInventory, readTextEntry } from '@core/source/index';
import { createFetchHttp } from '@platform/http-fetch';
import { isClean } from '../report';
import { run, type RunResult } from '../run';
import { ruleRecipe, type RuleBase, type RuleDesc } from './rule';

const http = createFetchHttp({ headers: { Accept: 'application/vnd.github+json' } });
let result: RunResult<RuleBase, RuleDesc>;

beforeAll(async () => {
  const loaded = await loadInventory(http, { tag: KNOWN_GOOD_TAG });
  const pack = loaded.inventory.packs.find((entry) => entry.name === 'journals');
  if (!pack) throw new Error('o pack journals sumiu do manifesto');
  result = run(ruleRecipe, [
    { pack: 'journals', documents: JSON.parse(readTextEntry(loaded.zip, pack.file)) as unknown[] },
  ]);
}, 180_000);

describe('as 64 regras reais', () => {
  it('normalizam todas, sem falha e com relatório limpo', () => {
    expect(result.failures).toEqual([]);
    expect(result.entities).toHaveLength(62);
    expect(isClean(result.report)).toBe(true);
  });

  /*
   * ⚠️ A estrutura do jornal É o Tipo. Se estes números mudarem, o Foundry reorganizou a
   * tela do mestre — e aí vale olhar se a conta da seção ainda faz sentido.
   */
  it('as quatro seções, com as divisórias e os índices fora', () => {
    const por = new Map<string, number>();
    for (const e of result.entities) por.set(e.base.section, (por.get(e.base.section) ?? 0) + 1);
    expect(Object.fromEntries(por)).toEqual({
      'Playing the Game': 21,
      'Running the Game': 17,
      'Subsystems and Variant Rules': 17,
      'Remaster Changes': 7,
    });
  });

  /* Os dois índices (GM Screen, Player Screen) ficam de fora: só apontam para o resto. */
  it('os índices não entram, e nenhuma referência relativa sobra', () => {
    expect(result.entities.find((e) => e.base.name === 'GM Screen')).toBeUndefined();
    expect(result.entities.find((e) => e.base.name === 'Player Screen')).toBeUndefined();
    for (const e of result.entities) expect(e.desc.main).not.toContain('@UUID[.');
  });

  /* Skill Actions é regra E é a fonte das 17 perícias — duas leituras, nenhuma cópia. */
  it('Skill Actions está aqui como regra', () => {
    expect(result.entities.find((e) => e.base.name === 'Skill Actions')?.base.section).toBe(
      'Playing the Game',
    );
  });

  /* 42 da tela do mestre e 5 do Remaster Changes: é a razão de o desenhista ter tabela. */
  it('47 das 62 páginas têm tabela', () => {
    expect(result.entities.filter((e) => e.desc.main.includes('<table'))).toHaveLength(47);
  });
});
