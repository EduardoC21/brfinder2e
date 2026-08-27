/**
 * TESTE DE CONTRATO da receita de `action` — as 574 de verdade.
 *
 * Fora do `npm test`: baixa 34 MiB. Roda com `npm run test:contract`, e semanalmente em CI.
 */

import { beforeAll, describe, expect, it } from 'vitest';

import {
  DEFAULT_CHANNEL,
  KNOWN_GOOD_TAG,
  languageFiles,
  loadInventory,
  parseFolderRoots,
  readTextEntry,
} from '@core/source/index';
import { createFetchHttp } from '@platform/http-fetch';
import { mergeLanguageFiles } from '../language';
import { isClean } from '../report';
import { run, type RunResult } from '../run';
import { actionRecipe, type ActionBase, type ActionDesc } from './action';

const http = createFetchHttp({ headers: { Accept: 'application/vnd.github+json' } });
let result: RunResult<ActionBase, ActionDesc>;

beforeAll(async () => {
  const loaded = await loadInventory(http, { tag: KNOWN_GOOD_TAG });

  const pack = loaded.inventory.packs.find((entry) => entry.name === 'actionspf2e');
  const declaration = loaded.manifest.packs.find((entry) => entry.name === 'actionspf2e');
  if (!pack || !declaration) throw new Error('o pack actionspf2e sumiu do manifesto');

  const documents: unknown = JSON.parse(readTextEntry(loaded.zip, pack.file));
  const folders = parseFolderRoots(
    JSON.parse(readTextEntry(loaded.zip, DEFAULT_CHANNEL.packFoldersFile(declaration))),
  );
  const language = mergeLanguageFiles(
    languageFiles(loaded.manifest, 'en').map(
      (entry) => JSON.parse(readTextEntry(loaded.zip, entry.path)) as unknown,
    ),
  );

  result = run(actionRecipe, documents as readonly unknown[], { language, folders });
}, 180_000);

describe('as 574 ações reais', () => {
  it('normaliza todas, sem nenhuma falha', () => {
    expect(result.total).toBe(574);
    expect(
      result.failures,
      result.failures.map((failure) => `${failure.name}: ${failure.message}`).join('\n'),
    ).toEqual([]);
  });

  it('o relatório fica limpo', () => {
    const sobrou = result.report.unmapped.map((item) => `${item.path} (${String(item.count)}/574)`);
    expect(result.report.unmapped, `sobrou:\n${sobrou.join('\n')}`).toEqual([]);
    expect(isClean(result.report)).toBe(true);
  });
});

describe('o que as 574 confirmam', () => {
  /** `action` SEMPRE tem contagem 1..3; reaction, free e passive são SEMPRE nulos. */
  it('o par custo/contagem é uma união exata', () => {
    for (const entity of result.entities) {
      if (entity.base.costKind === 'action') {
        expect([1, 2, 3], entity.base.name).toContain(entity.base.costCount);
      } else {
        expect(entity.base.costCount, entity.base.name).toBeNull();
      }
    }
    const kinds = new Set(result.entities.map((entity) => entity.base.costKind));
    expect([...kinds].sort()).toEqual(['action', 'free', 'passive', 'reaction']);
  });

  /** A pasta é o que separa as 30 básicas das 196 de classe. */
  it('o setor vem da pasta do compêndio', () => {
    const setores = new Map<string, number>();
    for (const entity of result.entities) {
      setores.set(entity.base.sector, (setores.get(entity.base.sector) ?? 0) + 1);
    }
    expect(setores.get('Basic')).toBe(30);
    expect(setores.get('Skill')).toBe(54);
    expect(setores.get('Class')).toBe(196);
    expect(setores.get('Archetype')).toBe(140);
  });

  it('a categoria tem exatamente os quatro valores medidos', () => {
    // Comparação por conjunto: ordenar mistura texto e null, e "null" cairia entre
    // "interaction" e "offensive" — a ordem não é o que o teste quer afirmar.
    const categorias = new Set(result.entities.map((entity) => entity.base.category));
    expect(categorias).toEqual(new Set(['offensive', 'interaction', 'defensive', null]));
  });

  it('as descrições mantêm a marcação intacta', () => {
    const comUuid = result.entities.filter((entity) => entity.desc.main.includes('@UUID['));
    expect(comUuid.length).toBeGreaterThan(50);
  });

  /** Briefing 8: importa tudo e filtra na interface. Ação tem conteúdo legado de verdade. */
  it('traz conteúdo legado junto com o Remaster', () => {
    const legado = result.entities.filter((entity) => !entity.base.source.remaster);
    expect(legado.length).toBe(83);
  });
});
