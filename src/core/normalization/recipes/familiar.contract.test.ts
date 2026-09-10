/**
 * TESTE DE CONTRATO da receita de `familiar` — as 111 de verdade.
 *
 * Fora do `npm test`: baixa 34 MiB. Roda com `npm run test:contract`, e semanalmente em CI.
 */

import { beforeAll, describe, expect, it } from 'vitest';

import { KNOWN_GOOD_TAG, languageFiles, loadInventory, readTextEntry } from '@core/source/index';
import { createFetchHttp } from '@platform/http-fetch';
import { mergeLanguageFiles } from '../language';
import { isClean } from '../report';
import { run, type RunResult } from '../run';
import { familiarRecipe, type FamiliarBase, type FamiliarDesc } from './familiar';

const http = createFetchHttp({ headers: { Accept: 'application/vnd.github+json' } });
let result: RunResult<FamiliarBase, FamiliarDesc>;

beforeAll(async () => {
  const loaded = await loadInventory(http, { tag: KNOWN_GOOD_TAG });
  const pack = loaded.inventory.packs.find((entry) => entry.name === 'familiar-abilities');
  if (!pack) throw new Error('o pack familiar-abilities sumiu do manifesto');
  const documents = JSON.parse(readTextEntry(loaded.zip, pack.file)) as unknown[];
  const language = mergeLanguageFiles(
    languageFiles(loaded.manifest, 'en').map(
      (entry) => JSON.parse(readTextEntry(loaded.zip, entry.path)) as unknown,
    ),
  );
  result = run(familiarRecipe, [{ pack: 'familiar-abilities', documents }], { language });
}, 180_000);

describe('as 111 habilidades de familiar reais', () => {
  it('normaliza todas, sem nenhuma falha', () => {
    expect(result.failures).toEqual([]);
    expect(result.entities).toHaveLength(111);
  });

  it('o relatório fica limpo', () => {
    expect(result.report.unmapped, JSON.stringify(result.report.unmapped, null, 1)).toEqual([]);
    expect(isClean(result.report)).toBe(true);
  });
});

describe('o que as 111 confirmam', () => {
  const base = (): readonly FamiliarBase[] => result.entities.map((entity) => entity.base);

  it('quase todas são passivas: 100, mais 6 de uma ação e 5 de duas', () => {
    const custo = new Map<string, number>();
    for (const item of base()) {
      const chave = `${item.costKind}+${String(item.costCount)}`;
      custo.set(chave, (custo.get(chave) ?? 0) + 1);
    }
    expect(Object.fromEntries(custo)).toEqual({
      'passive+null': 100,
      'action+1': 6,
      'action+2': 5,
    });
  });

  /* Nenhuma é rara: o filtro de raridade não separa nada, e por isso não existe aqui. */
  it('a raridade é common em todas — 59 declaradas, 52 pelo padrão', () => {
    expect(base().every((item) => item.rarity === 'common')).toBe(true);
  });

  it('a frequência existe em 7', () => {
    expect(base().filter((item) => item.frequency !== null)).toHaveLength(7);
  });

  it('96 não têm traço nenhum', () => {
    expect(base().filter((item) => item.traits.length === 0)).toHaveLength(96);
  });

  it('a descrição está toda aqui', () => {
    const textos = result.entities.map((entity) => entity.desc.main.replace(/<[^>]+>/g, ''));
    expect(textos.filter((texto) => texto.trim() === '')).toEqual([]);
    expect(Math.min(...textos.map((texto) => texto.length))).toBeGreaterThanOrEqual(20);
  });
});
