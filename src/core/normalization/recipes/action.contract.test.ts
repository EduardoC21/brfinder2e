/**
 * TESTE DE CONTRATO da receita de `action` — as 766 de verdade, dos dois packs.
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

  const documents: unknown[] = [];
  for (const declared of actionRecipe.packs) {
    const packName = declared.name;
    const pack = loaded.inventory.packs.find((entry) => entry.name === packName);
    if (!pack) throw new Error(`o pack ${packName} sumiu do manifesto`);
    documents.push(...(JSON.parse(readTextEntry(loaded.zip, pack.file)) as unknown[]));
  }

  // Só o pack principal tem arquivo de pastas; o de aventura não tem, e é isso que marca
  // as suas 192 entradas como `Adventure`.
  const declaration = loaded.manifest.packs.find((entry) => entry.name === 'actionspf2e');
  if (!declaration) throw new Error('o pack actionspf2e sumiu do manifesto');
  const folders = parseFolderRoots(
    JSON.parse(readTextEntry(loaded.zip, DEFAULT_CHANNEL.packFoldersFile(declaration))),
  );

  const language = mergeLanguageFiles(
    languageFiles(loaded.manifest, 'en').map(
      (entry) => JSON.parse(readTextEntry(loaded.zip, entry.path)) as unknown,
    ),
  );

  result = run(actionRecipe, [{ pack: 'actionspf2e', documents, folders }], { language });
}, 180_000);

describe('as 766 ações reais, dos dois packs', () => {
  it('normaliza todas, sem nenhuma falha', () => {
    // 574 do pack principal + 192 do de aventura. Os 16 documentos do tipo `feat` que
    // moram no pack de aventura são descartados pelo filtro de tipo do motor.
    expect(result.total).toBe(766);
    expect(
      result.failures,
      result.failures.map((failure) => `${failure.name}: ${failure.message}`).join('\n'),
    ).toEqual([]);
  });

  it('o relatório fica limpo', () => {
    const sobrou = result.report.unmapped.map((item) => `${item.path} (${String(item.count)}/766)`);
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

    // As de aventura não têm pasta nenhuma: caem no padrão da receita.
    expect(setores.get('Adventure')).toBe(192);
    // E `Disengage` é a única com pasta órfã — defeito do dado do pf2e.
    expect(setores.get('')).toBe(1);
  });

  it('as de aventura vêm de muitos livros, e é o livro que diz qual aventura', () => {
    const aventura = result.entities.filter((entity) => entity.base.sector === 'Adventure');
    const livros = new Set(aventura.map((entity) => entity.base.source.title));
    expect(livros.size).toBeGreaterThan(30);
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
    expect(legado.length).toBeGreaterThan(83);
  });
});
