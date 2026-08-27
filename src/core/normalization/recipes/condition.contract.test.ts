/**
 * TESTE DE CONTRATO da receita de `condition` — os 43 documentos de verdade.
 *
 * Fora do `npm test`: baixa 34 MiB. Roda com `npm run test:contract`, e semanalmente em
 * CI junto com o contrato da fonte.
 *
 * É este teste que cumpre o critério da Etapa 3: "43 condições normalizadas, relatório
 * limpo". O teste unitário ao lado prova a receita sobre três amostras; este prova que
 * as outras 40 não escondem nada que as três não mostraram.
 */

import { beforeAll, describe, expect, it } from 'vitest';

import { createFetchHttp } from '@platform/http-fetch';
import { loadInventory, readTextEntry, languageFiles, PINNED_TAG } from '@core/source/index';
import type { LoadedSource } from '@core/source/index';
import { mergeLanguageFiles } from '../language';
import { isClean } from '../report';
import { run, type RunResult } from '../run';
import { conditionRecipe, type ConditionBase, type ConditionDesc } from './condition';

const http = createFetchHttp({ headers: { Accept: 'application/vnd.github+json' } });

let loaded: LoadedSource;
let result: RunResult<ConditionBase, ConditionDesc>;

beforeAll(async () => {
  loaded = await loadInventory(http, { tag: PINNED_TAG });

  const pack = loaded.inventory.packs.find((entry) => entry.name === conditionRecipe.packs[0]);
  if (!pack) throw new Error(`pack ${String(conditionRecipe.packs[0])} sumiu do manifesto`);

  const documents: unknown = JSON.parse(readTextEntry(loaded.zip, pack.file));

  // Os QUATRO arquivos do inglês, fundidos na ordem do manifesto (briefing 7.7).
  const language = mergeLanguageFiles(
    languageFiles(loaded.manifest, 'en').map(
      (entry) => JSON.parse(readTextEntry(loaded.zip, entry.path)) as unknown,
    ),
  );

  result = run(conditionRecipe, documents as readonly unknown[], { language });
}, 180_000);

describe('as 43 condições reais', () => {
  it('normaliza todas, sem nenhuma falha', () => {
    expect(result.total).toBe(43);
    expect(
      result.failures,
      result.failures.map((failure) => `${failure.name}: ${failure.message}`).join('\n'),
    ).toEqual([]);
    expect(result.entities).toHaveLength(43);
  });

  it('o relatório fica limpo sobre os 43 — nada por decidir', () => {
    const sobrou = result.report.unmapped.map((item) => `${item.path} (${String(item.count)}/43)`);
    expect(result.report.unmapped, `sobrou:\n${sobrou.join('\n')}`).toEqual([]);
    expect(isClean(result.report)).toBe(true);
  });
});

describe('o que os 43 confirmam sobre as decisões da receita', () => {
  it('summary falta em exatamente uma condição, e é Cursebound', () => {
    const sem = result.entities.filter((entity) => entity.base.summary === undefined);
    expect(sem.map((entity) => entity.base.name)).toEqual(['Cursebound']);
  });

  it('valued e initialValue respeitam a união do schema do sistema', () => {
    // ConditionValueData = { isValued: true; value: number } | { isValued: false; value: null }
    for (const entity of result.entities) {
      if (entity.base.valued)
        expect(typeof entity.base.initialValue, entity.base.name).toBe('number');
      else expect(entity.base.initialValue, entity.base.name).toBeNull();
    }
    expect(result.entities.filter((entity) => entity.base.valued)).toHaveLength(12);
  });

  it('group é nulo em 20 e um dos cinco grupos nas outras', () => {
    const grupos = new Set(
      result.entities.map((entity) => entity.base.group).filter((group) => group !== null),
    );
    expect([...grupos].sort()).toEqual(['abilities', 'attitudes', 'death', 'detection', 'senses']);
    expect(result.entities.filter((entity) => entity.base.group === null)).toHaveLength(20);
  });

  it('overrides tem conteúdo em 8, e aponta para slugs de condições existentes', () => {
    const comOverrides = result.entities.filter((entity) => entity.base.overrides.length > 0);
    expect(comOverrides).toHaveLength(8);

    const slugs = new Set(result.entities.map((entity) => entity.base.slug));
    for (const entity of comOverrides) {
      for (const slug of entity.base.overrides) {
        expect(slugs.has(slug), `${entity.base.name} anula "${slug}", que não existe`).toBe(true);
      }
    }
  });

  it('a descrição fica byte a byte como veio, com a marcação intacta', () => {
    const blinded = result.entities.find((entity) => entity.base.slug === 'blinded');
    expect(blinded?.desc.main).toMatch(/@UUID\[Compendium\.pf2e\.conditionitems\.Item\./);
  });

  it('todas são ORC e Remaster', () => {
    for (const entity of result.entities) {
      expect(entity.base.source.license, entity.base.name).toBe('ORC');
      expect(entity.base.source.remaster, entity.base.name).toBe(true);
    }
  });
});
