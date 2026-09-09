/**
 * TESTE DE CONTRATO da receita de `background` — os 520 de verdade.
 *
 * Fora do `npm test`: baixa 34 MiB. Roda com `npm run test:contract`, e semanalmente em CI.
 */

import { beforeAll, describe, expect, it } from 'vitest';

import { KNOWN_GOOD_TAG, languageFiles, loadInventory, readTextEntry } from '@core/source/index';
import { createFetchHttp } from '@platform/http-fetch';
import { mergeLanguageFiles } from '../language';
import { isClean } from '../report';
import { run, type RunResult } from '../run';
import { backgroundRecipe, type BackgroundBase, type BackgroundDesc } from './background';

const http = createFetchHttp({ headers: { Accept: 'application/vnd.github+json' } });
let result: RunResult<BackgroundBase, BackgroundDesc>;
/** Os UUIDs de talento que os 520 citam, para o teste da ponte. */
let featUuids: Set<string>;

beforeAll(async () => {
  const loaded = await loadInventory(http, { tag: KNOWN_GOOD_TAG });

  const pack = loaded.inventory.packs.find((entry) => entry.name === 'backgrounds');
  if (!pack) throw new Error('o pack backgrounds sumiu do manifesto');
  const documents = JSON.parse(readTextEntry(loaded.zip, pack.file)) as unknown[];

  const language = mergeLanguageFiles(
    languageFiles(loaded.manifest, 'en').map(
      (entry) => JSON.parse(readTextEntry(loaded.zip, entry.path)) as unknown,
    ),
  );

  result = run(backgroundRecipe, [{ pack: 'backgrounds', documents }], { language });

  /*
   * A outra ponta da ponte: os talentos de verdade, do pack que a fonte de Talentos lê.
   * Se um antecedente apontar para um talento que não existe, o clique não abriria nada.
   */
  const feats = loaded.inventory.packs.find((entry) => entry.name === 'feats-srd');
  if (!feats) throw new Error('o pack feats-srd sumiu do manifesto');
  const featDocs = JSON.parse(readTextEntry(loaded.zip, feats.file)) as unknown[];
  featUuids = new Set(
    featDocs
      .filter((doc): doc is { _stats?: { compendiumSource?: string } } => typeof doc === 'object')
      .map((doc) => doc._stats?.compendiumSource ?? '')
      .filter((uuid) => uuid !== ''),
  );
}, 180_000);

describe('os 520 antecedentes reais', () => {
  it('normaliza todos, sem nenhuma falha', () => {
    expect(result.failures).toEqual([]);
    expect(result.entities).toHaveLength(520);
  });

  it('o relatório fica limpo', () => {
    expect(result.report.unmapped, JSON.stringify(result.report.unmapped, null, 1)).toEqual([]);
    expect(isClean(result.report)).toBe(true);
  });
});

describe('o que os 520 confirmam', () => {
  const base = (): readonly BackgroundBase[] => result.entities.map((entity) => entity.base);

  /*
   * ⚠️ A DESCRIÇÃO ESTÁ TODA AQUI, e é o que decidiu a etapa: não há jornal de antecedente
   * (os sete são Ancestries, Archetypes, Classes, Domains, GM Screen, Hero Point Deck e
   * Remaster Changes). Se algum dia faltar descrição, é sinal de que o Foundry mudou de
   * lugar — e aí a decisão de não ler jornal precisa ser reaberta.
   */
  it('os 520 têm descrição, e ela é o corpo da entrada', () => {
    const descricoes = result.entities.map((entity) => entity.desc.main);
    expect(descricoes.filter((texto) => texto.trim() === '')).toEqual([]);
    const semTags = descricoes.map((texto) => texto.replace(/<[^>]+>/g, '').length);
    expect(Math.min(...semTags)).toBeGreaterThan(300);
  });

  it('a perícia treinada tem dezesseis valores, e Sociedade lidera', () => {
    const porPericia = new Map<string, number>();
    for (const item of base()) {
      for (const skill of item.skills) porPericia.set(skill, (porPericia.get(skill) ?? 0) + 1);
    }
    expect(porPericia.size).toBe(16);
    expect(porPericia.get('society')).toBe(54);
    expect(porPericia.get('acrobatics')).toBe(11);
    // 80 não treinam nenhuma, e isso é resposta, não buraco.
    expect(base().filter((item) => item.skills.length === 0)).toHaveLength(80);
  });

  /*
   * O Saber tem 186 valores distintos, e é por isso que ele é COLUNA e não filtro: uma
   * lista de opções com 186 itens é mais longa que a tela.
   */
  it('o Saber tem valores demais para virar filtro', () => {
    const lores = new Set(base().flatMap((item) => item.lore));
    expect(lores.size).toBe(186);
    expect(base().filter((item) => item.lore.length > 0)).toHaveLength(427);
  });

  it('o aumento é escolha entre dois — menos nos vinte que fogem disso', () => {
    const porTamanho = new Map<number, number>();
    for (const item of base()) {
      porTamanho.set(item.boosts.length, (porTamanho.get(item.boosts.length) ?? 0) + 1);
    }
    // 0 é o aumento LIVRE, que a receita traduz de "os seis" para "nenhum recorte".
    expect(Object.fromEntries(porTamanho)).toEqual({ 0: 9, 1: 9, 2: 500, 3: 2 });

    const porAtributo = new Map<string, number>();
    for (const item of base()) {
      for (const atr of item.boosts) porAtributo.set(atr, (porAtributo.get(atr) ?? 0) + 1);
    }
    expect(Object.fromEntries(porAtributo)).toEqual({
      wis: 198,
      int: 192,
      cha: 191,
      con: 161,
      dex: 149,
      str: 124,
    });
  });

  it('a raridade e o livro batem', () => {
    const porRaridade = new Map<string, number>();
    for (const item of base())
      porRaridade.set(item.rarity, (porRaridade.get(item.rarity) ?? 0) + 1);
    expect(Object.fromEntries(porRaridade)).toEqual({ common: 288, rare: 137, uncommon: 95 });
    expect(new Set(base().map((item) => item.source.title)).size).toBe(61);
  });

  /* 8 dos 520, todos `persona-*` do Battlecry!. É por isso que traço não vira filtro aqui. */
  it('o traço quase não existe nesta fonte', () => {
    const comTraco = base().filter((item) => item.traits.length > 0);
    expect(comTraco).toHaveLength(8);
    expect(comTraco.every((item) => item.traits.every((t) => t.startsWith('persona-')))).toBe(true);
  });
});

/*
 * ⚠️ A PONTE. O antecedente guarda o UUID do talento, e a tela abre a entrada que já
 * existe na fonte de Talentos. Se este teste cair, o clique não abre nada.
 */
describe('a ponte para Talentos', () => {
  it('todo talento citado existe no pack que a fonte de Talentos lê', () => {
    const citados = result.entities.flatMap((entity) => entity.base.feats);
    expect(citados).toHaveLength(406);
    expect(new Set(citados.map((feat) => feat.uuid)).size).toBe(76);

    const orfaos = citados.filter((feat) => !featUuids.has(feat.uuid));
    expect(orfaos.map((feat) => `${feat.name} (${feat.uuid})`)).toEqual([]);
  });

  it('404 concedem talento e 116 não concedem nenhum', () => {
    const base = result.entities.map((entity) => entity.base);
    expect(base.filter((item) => item.feats.length > 0)).toHaveLength(404);
    expect(base.filter((item) => item.feats.length === 0)).toHaveLength(116);
    expect(base.filter((item) => item.feats.length === 2)).toHaveLength(2);
  });
});
