/**
 * TESTE DE CONTRATO da receita de `ancestry` — as 50 de verdade, com o jornal.
 *
 * Fora do `npm test`: baixa 34 MiB. Roda com `npm run test:contract`.
 */

import { beforeAll, describe, expect, it } from 'vitest';

import { KNOWN_GOOD_TAG, loadInventory, readTextEntry } from '@core/source/index';
import { createFetchHttp } from '@platform/http-fetch';
import { indexJournalPages } from '../journals';
import { isClean } from '../report';
import { run, type RunResult } from '../run';
import { ancestryRecipe, type AncestryBase, type AncestryDesc } from './ancestry';

const http = createFetchHttp({ headers: { Accept: 'application/vnd.github+json' } });
let result: RunResult<AncestryBase, AncestryDesc>;

beforeAll(async () => {
  const loaded = await loadInventory(http, { tag: KNOWN_GOOD_TAG });
  const ler = (nome: string): unknown[] => {
    const pack = loaded.inventory.packs.find((entry) => entry.name === nome);
    if (!pack) throw new Error(`o pack ${nome} sumiu do manifesto`);
    return JSON.parse(readTextEntry(loaded.zip, pack.file)) as unknown[];
  };
  const journals = indexJournalPages(ler('journals'));
  result = run(ancestryRecipe, [{ pack: 'ancestries', documents: ler('ancestries') }], {
    journals,
  });
}, 180_000);

const base = () => result.entities.map((entity) => entity.base);
const contar = (chave: (b: AncestryBase) => string | number) => {
  const por = new Map<string | number, number>();
  for (const b of base()) por.set(chave(b), (por.get(chave(b)) ?? 0) + 1);
  return Object.fromEntries(por);
};

describe('as 50 ancestralidades reais', () => {
  it('normalizam todas, sem falha e com relatório limpo', () => {
    expect(result.failures).toEqual([]);
    expect(result.entities).toHaveLength(50);
    expect(result.report.unmapped, JSON.stringify(result.report.unmapped, null, 1)).toEqual([]);
    expect(isClean(result.report)).toBe(true);
  });

  it('PV, tamanho, visão e raridade, como medido', () => {
    expect(contar((b) => b.hp)).toEqual({ 6: 13, 8: 29, 10: 8 });
    expect(contar((b) => b.size)).toEqual({ tiny: 2, sm: 12, med: 33, lg: 3 });
    expect(contar((b) => b.vision)).toEqual({ normal: 13, 'low-light-vision': 24, darkvision: 13 });
    expect(contar((b) => b.rarity)).toEqual({ common: 8, uncommon: 20, rare: 22 });
  });

  /* Os três desenhos de aumento: 34 / 14 / 2. Nenhum outro. */
  it('os aumentos vêm em três desenhos', () => {
    expect(contar((b) => b.boosts.map((c) => (c === 'free' ? 'free' : 'x')).join(' '))).toEqual({
      'x x free': 34,
      'x free': 14,
      'free free': 2,
    });
    expect(base().filter((b) => b.flaws.length === 0)).toHaveLength(16);
    expect(base().every((b) => b.flaws.length <= 1)).toBe(true);
  });

  it('todas as habilidades apontam para ancestryfeatures', () => {
    const todas = base().flatMap((b) => b.features);
    expect(todas).toHaveLength(48);
    expect(todas.every((f) => f.uuid.startsWith('Compendium.pf2e.ancestryfeatures.'))).toBe(true);
    expect(base().filter((b) => b.features.length === 0)).toHaveLength(14);
  });

  /* Os 50 terminavam com o link para a página; nenhum termina mais. */
  it('nenhum resumo termina com o link de rodapé', () => {
    for (const entity of result.entities) {
      expect(entity.desc.main, entity.base.name).not.toContain('JournalEntryPage');
    }
  });

  /* 50 de 50 têm página com o mesmo nome, e a página é bem maior que o resumo. */
  it('a página do jornal está em todas, e é maior que o resumo', () => {
    for (const entity of result.entities) {
      expect(entity.desc.page.length, entity.base.name).toBeGreaterThanOrEqual(4693);
      expect(entity.desc.page.length).toBeGreaterThan(entity.desc.main.length);
      expect(entity.desc.page).toContain(`${entity.base.name} Heritages`);
    }
  });
});
