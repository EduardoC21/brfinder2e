/**
 * TESTE DE CONTRATO da receita de `spell` — as 1.994 de verdade.
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
import { spellRecipe, type SpellBase, type SpellDesc } from './spell';

const http = createFetchHttp({ headers: { Accept: 'application/vnd.github+json' } });
let result: RunResult<SpellBase, SpellDesc>;

beforeAll(async () => {
  const loaded = await loadInventory(http, { tag: KNOWN_GOOD_TAG });

  const pack = loaded.inventory.packs.find((entry) => entry.name === 'spells-srd');
  if (!pack) throw new Error('o pack spells-srd sumiu do manifesto');
  const documents = JSON.parse(readTextEntry(loaded.zip, pack.file)) as unknown[];

  const declaration = loaded.manifest.packs.find((entry) => entry.name === 'spells-srd');
  if (!declaration) throw new Error('o pack spells-srd sumiu do manifesto');
  const folders = parseFolderRoots(
    JSON.parse(readTextEntry(loaded.zip, DEFAULT_CHANNEL.packFoldersFile(declaration))),
  );

  const language = mergeLanguageFiles(
    languageFiles(loaded.manifest, 'en').map(
      (entry) => JSON.parse(readTextEntry(loaded.zip, entry.path)) as unknown,
    ),
  );

  result = run(spellRecipe, [{ pack: 'spells-srd', documents, folders }], { language });
}, 180_000);

describe('as 1.994 magias reais', () => {
  it('normaliza todas, sem nenhuma falha', () => {
    expect(result.failures).toEqual([]);
    expect(result.entities).toHaveLength(1994);
  });

  it('o relatório fica limpo', () => {
    expect(result.report.unmapped, JSON.stringify(result.report.unmapped, null, 1)).toEqual([]);
    expect(isClean(result.report)).toBe(true);
  });
});

describe('o que as 1.994 confirmam', () => {
  const base = (): readonly SpellBase[] => result.entities.map((entity) => entity.base);

  /*
   * O CUSTO é o campo sem paralelo nas outras receitas, e o que mais podia dar errado:
   * uma string livre com 27 formatos. Zero em `unknown` é o que este teste guarda.
   */
  it('todo custo é reconhecido, e as seis famílias somam 1.994', () => {
    const familias = new Map<string, number>();
    for (const s of base()) {
      const chave = s.cast.to === null ? s.cast.from.kind : `faixa ${s.cast.from.kind}`;
      familias.set(chave, (familias.get(chave) ?? 0) + 1);
    }
    expect(base().filter((s) => s.cast.from.kind === 'unknown')).toEqual([]);
    expect(Object.fromEntries(familias)).toEqual({
      action: 1556,
      time: 283,
      reaction: 96,
      free: 10,
      'faixa action': 49,
    });
  });

  it('o posto vai de 1 a 10, e nunca é zero', () => {
    const postos = base().map((s) => s.rank);
    expect(Math.min(...postos)).toBe(1);
    expect(Math.max(...postos)).toBe(10);
  });

  /*
   * ⚠️ Traço e posto são EIXOS DIFERENTES, e eu tinha escrito o contrário na receita antes
   * de medir. Truque é o traço `cantrip`; a maioria é posto 1, mas as cantigas de bardo são
   * truques de posto alto — `Allegro` é posto 7. Não há posto 0 em magia nenhuma.
   */
  it('truque é o traço, e nem todo truque é posto 1', () => {
    const truques = base().filter((s) => s.traits.includes('cantrip'));
    expect(truques).toHaveLength(120);
    expect(truques.filter((s) => s.rank === 1)).toHaveLength(102);
    expect(new Set(truques.map((s) => s.rank))).toEqual(new Set([1, 2, 3, 5, 7]));
    expect(base().filter((s) => s.rank === 0)).toEqual([]);
  });

  it('o setor separa as quatro espécies de magia', () => {
    const porSetor = new Map<string, number>();
    for (const s of base()) porSetor.set(s.sector, (porSetor.get(s.sector) ?? 0) + 1);
    expect(Object.fromEntries(porSetor)).toEqual({
      Spells: 1277,
      Focus: 545,
      Rituals: 167,
      'Impossible Spells': 5,
    });
  });

  /* A primeira fonte com `unique`: a letra `U` existe desde a Etapa 8 sem nada para desenhar. */
  it('a raridade finalmente traz `unique`', () => {
    const porRaridade = new Map<string, number>();
    for (const s of base()) porRaridade.set(s.rarity, (porRaridade.get(s.rarity) ?? 0) + 1);
    expect(Object.fromEntries(porRaridade)).toEqual({
      common: 925,
      uncommon: 868,
      rare: 191,
      unique: 10,
    });
  });

  /* Vazio não é falha: magia de foco pertence a uma classe, não a uma tradição. */
  it('a tradição é vazia em 709, e são as de foco', () => {
    expect(base().filter((s) => s.traditions.length === 0)).toHaveLength(709);
  });

  it('salvamento e defesa passiva são ALTERNATIVAS, não complementos', () => {
    const comSalvamento = base().filter((s) => s.save !== null);
    const comPassiva = base().filter((s) => s.passiveDefense !== '');
    expect(comSalvamento).toHaveLength(762);
    // 11, e não 14: em outras 3 a chave `passive` existe valendo NULA.
    expect(comPassiva).toHaveLength(11);
    // As 10 que só têm passiva não têm salvamento.
    expect(comPassiva.filter((s) => s.save === null)).toHaveLength(10);
    expect(new Set(comSalvamento.map((s) => s.save?.statistic))).toEqual(
      new Set(['will', 'fortitude', 'reflex']),
    );
  });

  it('a área traz a prosa quando ela existe', () => {
    const comArea = base().filter((s) => s.area !== null);
    expect(comArea).toHaveLength(453);
    expect(comArea.filter((s) => s.area?.details !== null)).toHaveLength(20);
  });

  /*
   * ZERO conjuradores secundários é valor REAL, em 33 rituais — o ritual existe e não
   * precisa de ajuda. NULO é outra coisa, e são 4. Colapsar os dois apagaria a diferença,
   * e este teste é o que impede isso.
   */
  it('o ritual traz quem mais precisa ajudar, e zero não é nulo', () => {
    const rituais = base().filter((s) => s.ritual !== null);
    expect(rituais).toHaveLength(167);
    expect(rituais.filter((s) => s.ritual?.secondaryCasters === 0)).toHaveLength(33);
    expect(rituais.filter((s) => s.ritual?.secondaryCasters === null)).toHaveLength(4);
    expect(rituais.filter((s) => s.ritual?.secondaryChecks === '')).toHaveLength(23);
  });

  it('sustentada, contra-ação e material são os poucos que são', () => {
    expect(base().filter((s) => s.sustained)).toHaveLength(275);
    expect(base().filter((s) => s.counteraction)).toHaveLength(57);
    expect(base().filter((s) => s.materialCost !== '')).toHaveLength(140);
    expect(base().filter((s) => s.requirements !== '')).toHaveLength(45);
  });

  /*
   * O contrário do talento: aqui a descrição NÃO repete alcance, alvo nem duração, e é por
   * isso que os três são campos. O `Heightened`, sim, ela repete — e por isso ele não é.
   */
  it('a descrição traz o Heightened, e não os campos do cabeçalho', () => {
    const descricoes = result.entities.map((e) => e.desc.main);
    const comHeightened = descricoes.filter((t) => /<strong>Heightened/i.test(t));
    const comAlcance = descricoes.filter((t) => /<strong>\s*Range/i.test(t));
    expect(comHeightened.length).toBeGreaterThan(1000);
    expect(comAlcance.length).toBeLessThan(20);
  });
});
