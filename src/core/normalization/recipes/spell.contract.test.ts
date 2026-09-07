/**
 * TESTE DE CONTRATO da receita de `spell` — as 1.994 de verdade.
 *
 * Fora do `npm test`: baixa 34 MiB. Roda com `npm run test:contract`, e semanalmente em CI.
 */

import { beforeAll, describe, expect, it } from 'vitest';

import {
  castToken,
  defenseTokens,
  distanceFeet,
  numericExtent,
  optionsFor,
  type BrowseEntity,
  type FilterSpec,
} from '@core/browse/index';
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

/**
 * O que a TELA lê das 1.994 — os filtros, e não a receita.
 *
 * Vive no teste de contrato porque a pergunta é a mesma: o dado real ainda tem a forma que
 * a tela supõe? Um formato novo de custo numa versão futura do Foundry aparece aqui como
 * uma opção a mais, e não como uma opção calada.
 */
describe('o que os filtros veem nas 1.994', () => {
  const linhas = (): readonly BrowseEntity[] =>
    result.entities.map((entity) => ({
      key: entity.identity.id,
      uuid: entity.identity.uuid,
      base: entity.base,
    }));

  const castSpec: FilterSpec = { kind: 'cast', id: 'cast', field: 'cast' };
  const defesaSpec: FilterSpec = {
    kind: 'defense',
    id: 'save',
    field: 'save',
    passiveField: 'passiveDefense',
    traitsField: 'traits',
    attackTrait: 'attack',
  };
  const distanciaSpec: FilterSpec = { kind: 'number', id: 'range', field: 'range', unit: 'feet' };
  const areaSpec: FilterSpec = { kind: 'area', id: 'area', field: 'area', unit: 'feet' };

  /*
   * 26 e não 27: `Reaction` com R maiúsculo existe em uma magia, e a caixa baixa a junta
   * com as outras 95. E não são 9 — o agrupamento em `time` foi desfeito de propósito.
   */
  it('a execução oferece uma opção por FORMATO, e elas somam 1.994', () => {
    const opcoes = optionsFor(linhas(), castSpec);
    expect(opcoes).toHaveLength(26);
    expect(opcoes.reduce((soma, opcao) => soma + opcao.count, 0)).toBe(1994);
    expect(opcoes.filter((opcao) => opcao.value === '')).toEqual([]);
    // A ordem: as contagens de ação primeiro, o que leva mais tempo por último.
    expect(opcoes[0]?.value).toBe('1');
    expect(opcoes.at(-1)?.value).toBe('9 days');
  });

  it('a reação maiúscula da fonte não vira uma opção separada', () => {
    const reacoes = linhas().filter((linha) => castToken(linha, 'cast') === 'reaction');
    expect(reacoes).toHaveLength(96);
  });

  /*
   * A CA vem do TRAÇO em 82 magias, e o filtro achava 6 de 94 sem essa regra. As CDs
   * passivas dobram no salvamento de mesmo nome: `fortitude` sai de 266 para 269.
   */
  it('a defesa junta CA, salvamento e CD passiva num tópico só', () => {
    const contagem = new Map<string, number>();
    let sem = 0;
    for (const linha of linhas()) {
      const tokens = defenseTokens(linha, {
        field: 'save',
        passiveField: 'passiveDefense',
        traitsField: 'traits',
        attackTrait: 'attack',
      });
      if (tokens.length === 0) sem += 1;
      for (const token of tokens) contagem.set(token, (contagem.get(token) ?? 0) + 1);
    }
    expect(Object.fromEntries(contagem)).toEqual({
      ac: 94,
      fortitude: 269,
      reflex: 209,
      will: 288,
    });
    expect(sem).toBe(1140);
    // Nenhuma CD passiva sobrevive à dobra: o filtro tem quatro opções, não sete.
    expect(contagem.has('fortitude-dc')).toBe(false);
  });

  /* As três que o autor conferiu no Archives of Nethys, uma a uma. */
  it('bate com o AoN nas três magias conferidas à mão', () => {
    const defesaDe = (nome: string): readonly string[] => {
      const linha = linhas().find((entrada) => (entrada.base as { name: string }).name === nome);
      if (linha === undefined) throw new Error(`sumiu da fonte: ${nome}`);
      return defenseTokens(linha, {
        field: 'save',
        passiveField: 'passiveDefense',
        traitsField: 'traits',
        attackTrait: 'attack',
      });
    };
    // "Make a ranged spell attack roll against your target's AC" — e `defense` é nulo.
    expect(defesaDe('Phase Bolt')).toEqual(['ac']);
    // AoN: "Defense AC and basic Fortitude".
    expect(defesaDe('Pulverizing Wake')).toEqual(['ac', 'fortitude']);
    // AoN: "Defense Fortitude" — a fonte guarda `fortitude-dc`.
    expect(defesaDe('Murderous Vine')).toEqual(['fortitude']);
  });

  /*
   * O preço da regra, e ele está MEDIDO: quatro magias trazem o traço `attack` sem ataque
   * nenhum e ganham um "CA" que o livro não dá. Duas delas têm `attack` como ÚNICO traço,
   * o que denuncia o defeito na fonte. Se um dia o Foundry corrigir, este teste cai — e é
   * exatamente assim que a gente fica sabendo.
   */
  it('as quatro entradas em que a FONTE erra o traço continuam sendo quatro', () => {
    const semAtaqueNoTexto = result.entities.filter(
      (entrada) =>
        entrada.base.traits.includes('attack') && !/spell attack/i.test(entrada.desc.main),
    );
    expect(semAtaqueNoTexto.map((entrada) => entrada.base.name).sort()).toEqual([
      'Incarnate Ancestry',
      'Lucky Month',
      'Pulverizing Wake',
      'Shambling Horror',
      'Unseen Heralds',
    ]);
  });

  /*
   * 1.329 de 1.994: 636 não têm alcance nenhum e 29 trazem prosa sem número (`planetary`,
   * `varies`, `half your Speed`). Estes ficam de fora quando há limite marcado, e é o
   * certo — não dá para afirmar que `planetary` passa de 30 pés.
   */
  it('a distância é lida em pés em 1.329, e ninguém é chutado', () => {
    const lidas = linhas().filter((linha) => {
      const texto = (linha.base as { readonly range: string }).range;
      return distanceFeet(texto) !== null;
    });
    expect(lidas).toHaveLength(1329);
    expect(numericExtent(linhas(), distanciaSpec)).toEqual({ min: 0, max: 5_280_000 });
  });

  it('a área oferece os sete tipos, e o tamanho vai de 5 a 36.960 pés', () => {
    const tipos = optionsFor(linhas(), areaSpec);
    expect(tipos.map((opcao) => opcao.value)).toEqual([
      'burst',
      'cone',
      'cube',
      'cylinder',
      'emanation',
      'line',
      'square',
      '',
    ]);
    expect(numericExtent(linhas(), areaSpec)).toEqual({ min: 5, max: 36_960 });
  });

  it('as opções de defesa saem na ordem da ficha, e não do alfabeto', () => {
    expect(optionsFor(linhas(), defesaSpec).map((opcao) => opcao.value)).toEqual([
      'ac',
      'fortitude',
      'reflex',
      'will',
      '',
    ]);
  });
});
