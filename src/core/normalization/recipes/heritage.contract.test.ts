/**
 * TESTE DE CONTRATO da receita de `heritage` — as 311 heranças próprias reais.
 *
 * Fora do `npm test`: baixa 34 MiB. Roda com `npm run test:contract`.
 */

import { beforeAll, describe, expect, it } from 'vitest';

import { KNOWN_GOOD_TAG, loadInventory, readTextEntry } from '@core/source/index';
import { createFetchHttp } from '@platform/http-fetch';
import { isClean } from '../report';
import { run, type RunResult } from '../run';
import { heritageRecipe, type HeritageBase, type HeritageDesc } from './heritage';

const http = createFetchHttp({ headers: { Accept: 'application/vnd.github+json' } });
let result: RunResult<HeritageBase, HeritageDesc>;

beforeAll(async () => {
  const loaded = await loadInventory(http, { tag: KNOWN_GOOD_TAG });
  const pack = loaded.inventory.packs.find((entry) => entry.name === 'heritages');
  if (!pack) throw new Error('o pack heritages sumiu do manifesto');
  result = run(heritageRecipe, [
    { pack: 'heritages', documents: JSON.parse(readTextEntry(loaded.zip, pack.file)) as unknown[] },
  ]);
}, 180_000);

describe('as 311 heranças próprias reais', () => {
  it('normalizam todas, sem falha e com relatório limpo', () => {
    expect(result.failures).toEqual([]);
    expect(result.entities).toHaveLength(311);
    expect(result.report.unmapped, JSON.stringify(result.report.unmapped, null, 1)).toEqual([]);
    expect(isClean(result.report)).toBe(true);
  });

  /* O que as heranças concedem, e a visão: só o que as regras dizem sem predicado. */
  it('86 concessões com UUID concreto, e visão em 20', () => {
    const todas = result.entities.flatMap((e) => e.base.features);
    expect(todas.every((f) => !f.uuid.includes('{'))).toBe(true);
    expect(todas.length).toBeGreaterThanOrEqual(80);
    expect(result.entities.filter((e) => e.base.vision !== null)).toHaveLength(20);
  });

  it('50 ancestralidades donas, e a raridade como medido', () => {
    expect(new Set(result.entities.map((e) => e.base.ancestry.slug)).size).toBe(50);
    const por = new Map<string, number>();
    for (const e of result.entities) por.set(e.base.rarity, (por.get(e.base.rarity) ?? 0) + 1);
    expect(Object.fromEntries(por)).toEqual({ common: 296, uncommon: 14, rare: 1 });
  });
});
