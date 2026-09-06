/**
 * TESTE DE CONTRATO da receita de `feat` — os 6.284 de verdade.
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
import { featRecipe, type FeatBase, type FeatDesc } from './feat';

const http = createFetchHttp({ headers: { Accept: 'application/vnd.github+json' } });
let result: RunResult<FeatBase, FeatDesc>;
/** Quantos documentos do tipo `feat` existem na base INTEIRA, e não só no pack lido. */
let featsNaBaseToda = 0;

beforeAll(async () => {
  const loaded = await loadInventory(http, { tag: KNOWN_GOOD_TAG });

  const pack = loaded.inventory.packs.find((entry) => entry.name === 'feats-srd');
  if (!pack) throw new Error('o pack feats-srd sumiu do manifesto');
  const documents = JSON.parse(readTextEntry(loaded.zip, pack.file)) as unknown[];

  const declaration = loaded.manifest.packs.find((entry) => entry.name === 'feats-srd');
  if (!declaration) throw new Error('o pack feats-srd sumiu do manifesto');
  const folders = parseFolderRoots(
    JSON.parse(readTextEntry(loaded.zip, DEFAULT_CHANNEL.packFoldersFile(declaration))),
  );

  const language = mergeLanguageFiles(
    languageFiles(loaded.manifest, 'en').map(
      (entry) => JSON.parse(readTextEntry(loaded.zip, entry.path)) as unknown,
    ),
  );

  // Varre a base toda para o teste do escopo abaixo poder falhar quando ele mudar.
  for (const entry of loaded.inventory.packs) {
    const docs = JSON.parse(readTextEntry(loaded.zip, entry.file)) as unknown[];
    for (const doc of docs) {
      if (doc !== null && typeof doc === 'object' && 'type' in doc && doc.type === 'feat') {
        featsNaBaseToda += 1;
      }
    }
  }

  result = run(featRecipe, [{ pack: 'feats-srd', documents, folders }], { language });
}, 180_000);

describe('os 6.284 talentos reais', () => {
  it('normaliza todos, sem nenhuma falha', () => {
    expect(result.failures).toEqual([]);
    expect(result.entities).toHaveLength(6284);
  });

  it('o relatório fica limpo', () => {
    expect(isClean(result.report)).toBe(true);
  });
});

/*
 * O ESCOPO é a decisão desta etapa, e é a que mais barato quebra em silêncio: um pack novo
 * com talentos entraria na base sem ninguém notar, ou — pior — o pack `feats` cresceria e
 * a diferença passaria por normal. Estes dois números guardam a decisão.
 */
describe('o escopo, que foi decisão e não consequência', () => {
  it('a base tem MAIS talentos do que a receita lê, e a diferença é conhecida', () => {
    expect(featsNaBaseToda).toBe(7633);
    expect(result.entities).toHaveLength(6284);
    // 874 classfeatures, 240 boons-and-curses, 157 pathfinder-society-boons,
    // 55 ancestryfeatures, 16 adventure-specific-actions, 7 campaign-effects.
    expect(featsNaBaseToda - result.entities.length).toBe(1349);
  });

  it('o que entrou é o que a pessoa ESCOLHE, e as categorias provam', () => {
    const porCategoria = new Map<string, number>();
    for (const entity of result.entities) {
      porCategoria.set(entity.base.category, (porCategoria.get(entity.base.category) ?? 0) + 1);
    }
    expect(Object.fromEntries(porCategoria)).toEqual({
      class: 4303,
      ancestry: 1586,
      skill: 338,
      general: 40,
      bonus: 14,
      // Do pack errado, defeito do dado do pf2e. Se sumir, este teste avisa.
      classfeature: 3,
    });
  });
});

describe('o que os 6.284 confirmam', () => {
  const base = (): readonly FeatBase[] => result.entities.map((entity) => entity.base);

  it('o par custo/contagem é uma união exata, igual à das ações', () => {
    const pares = new Set(base().map((f) => `${f.costKind}:${String(f.costCount)}`));
    expect([...pares].sort()).toEqual([
      'action:1',
      'action:2',
      'action:3',
      'free:null',
      'passive:null',
      'reaction:null',
    ]);
  });

  it('todo talento tem nível, e ele vai de 0 a 20', () => {
    const niveis = base().map((f) => f.level);
    expect(niveis.every((n) => Number.isInteger(n))).toBe(true);
    expect(Math.min(...niveis)).toBe(0);
    expect(Math.max(...niveis)).toBe(20);
  });

  it('o setor vem da pasta do compêndio, e nenhum fica vazio', () => {
    const porSetor = new Map<string, number>();
    for (const f of base()) porSetor.set(f.sector, (porSetor.get(f.sector) ?? 0) + 1);
    expect(Object.fromEntries(porSetor)).toEqual({
      Archetype: 2340,
      Class: 1993,
      Ancestry: 1561,
      Skill: 228,
      Miscellaneous: 72,
      Mythic: 49,
      General: 41,
    });
  });

  /* É este tipo que finalmente dá volume à etiqueta de raridade: 13,0% contra 0,3%. */
  it('a raridade finalmente distingue alguma coisa', () => {
    const porRaridade = new Map<string, number>();
    for (const f of base()) porRaridade.set(f.rarity, (porRaridade.get(f.rarity) ?? 0) + 1);
    expect(Object.fromEntries(porRaridade)).toEqual({ common: 5467, uncommon: 613, rare: 204 });
  });

  it('o pré-requisito chega como lista de frases, e não como objeto do Foundry', () => {
    const comAlgum = base().filter((f) => f.prerequisites.length > 0);
    expect(comAlgum).toHaveLength(3895);
    expect(comAlgum.reduce((total, f) => total + f.prerequisites.length, 0)).toBe(4635);
    expect(comAlgum.every((f) => f.prerequisites.every((p) => typeof p === 'string'))).toBe(true);
  });

  /*
   * Os três estados de `maxTakable` são diferentes, e é o teste que impede alguém de
   * "simplificar" o tipo para `number` e transformar "sem limite" em 1.
   */
  it('maxTakable distingue uma vez, N vezes e sem limite', () => {
    const uma = base().filter((f) => f.maxTakable === 1);
    const semLimite = base().filter((f) => f.maxTakable === null);
    const contadas = base().filter((f) => f.maxTakable !== null && f.maxTakable > 1);
    expect(uma).toHaveLength(6147);
    expect(semLimite).toHaveLength(74);
    expect(contadas).toHaveLength(63);
  });

  it('só na criação é bandeira de 64, e o resto é falso por padrão', () => {
    expect(base().filter((f) => f.onlyLevel1)).toHaveLength(64);
  });

  /*
   * Semana, mês e ano só existem aqui — nas ações a frequência nunca passa de um dia.
   *
   * 625 e não 634: a chave existe em 634, e em 9 delas vale NULA. Escrevi 634 na primeira
   * vez porque contei a CHAVE em vez do valor, e o teste pegou.
   */
  it('a frequência traz três unidades que as ações não têm', () => {
    const pers = base()
      .filter((f) => f.frequency !== null)
      .map((f) => f.frequency?.per);
    expect(pers).toHaveLength(625);
    expect(new Set(pers)).toContain('P1Y');
    expect(new Set(pers)).toContain('P1W');
    expect(new Set(pers)).toContain('P1M');
  });

  it('traz conteúdo legado junto com o Remaster', () => {
    expect(base().filter((f) => f.source.remaster)).toHaveLength(4733);
    expect(base().filter((f) => !f.source.remaster)).toHaveLength(1551);
  });

  it('as descrições mantêm a marcação intacta', () => {
    const comUuid = result.entities.filter((e) => e.desc.main.includes('@UUID'));
    expect(comUuid.length).toBeGreaterThan(0);
  });
});
