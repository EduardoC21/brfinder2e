/**
 * Receita de `ancestry` — as 50 ancestralidades do pack `ancestries`, com a página do
 * jornal `Ancestries` junto — e, desde a Etapa 23, as 17 HERANÇAS VERSÁTEIS do pack
 * `heritages`, como Tipo.
 *
 * A versátil (Nephilim, Dhampir, Aiuvarin…) é o que se escolhe no lugar da herança de
 * uma ancestralidade: não pertence a nenhuma (`system.ancestry` nulo), tem traço e
 * talentos próprios (Nephilim: 87), e o Archives of Nethys a lista ao lado das
 * ancestralidades. O autor decidiu que herança não é fonte no trilho — é a aba de uma
 * ancestralidade —, e a versátil precisava de um lugar onde os talentos dela apareçam.
 * É aqui, com `kind: 'versatile'`. Os campos de mecânica (PV, tamanho, aumentos…) ficam
 * NULOS nela: a versátil não os tem, e a tela esconde o que é nulo.
 *
 * A primeira das três fontes grandes, e a PRIMEIRA CUJA ENTRADA MORA EM DOIS LUGARES. O
 * pack tem a mecânica em campos — PV, tamanho, deslocamento, aumentos, visão, idiomas —
 * e um resumo de 231 a 1.123 caracteres. O jornal tem a página do livro: 4.693 a 13.239
 * caracteres, com "You Might…", sociedade, crenças, a mecânica de novo por extenso, e a
 * lista de heranças por `@UUID`. As duas descrições ficam: `main` é o resumo, para o
 * painel lateral; `page` é a página, para a tela completa (Etapa 22b). É para a segunda
 * que `fromJournal` existe.
 *
 * Medido no `pf2e-8.5.0`:
 *
 *   PV            8 em 29, 6 em 13, 10 em 8
 *   tamanho       médio 33, pequeno 12, grande 3, minúsculo 2
 *   deslocamento  25 em 40; 20 em 5; 30 em 3; 5 em 2 (Merfolk e Awakened Animal, que
 *                 nadam — o pack só guarda o deslocamento em terra)
 *   visão         low-light 24, darkvision 13, normal 13
 *   raridade      rara 22, incomum 20, comum 8 — é a fonte mais RARA do projeto
 *   aumentos      dois fixos + um livre em 34; um fixo + um livre em 14; dois livres em 2
 *                 (Human, Orc)
 *   falha         um atributo em 34, nenhuma em 16
 *   idiomas       2 em 39, 1 em 8, 3 em 3; adicionais de 0 a 11 (6 é a moda)
 *   habilidades   `system.items`: 1 em 24, 2 em 12, nenhuma em 14 — todas apontam para
 *                 `ancestryfeatures` (fonte desde a 22d). Mais 3 por `GrantItem` em
 *                 `system.rules` (Anadi, Tanuki, Yaoguai: o Change Shape, que é uma AÇÃO
 *                 em `actionspf2e`) — a página do livro lista as duas, o pack as separa
 *   jornal        50 de 50 têm página com o mesmo nome
 *
 * `hands` vale 2 nos 50 e `reach` é função do tamanho (5 nos 48, 0 nos 2 minúsculos):
 * os dois ficam em `ignore`. O que é igual em toda entrada, ou já dito por outro campo,
 * não separa nada.
 *
 * Decidida contra o JSON real do `pf2e-8.5.0`, em 11/09/2026.
 */

import { isRecord } from '../../json';
import { descriptionAlterations, type DescriptionAlteration } from '../alterations';
import { bool, html, raw, shape, text, textList } from '../decoders';
import { from, fromDocument, fromJournal } from '../field';
import { recipe } from '../recipe';
import { isOwnHeritage } from './heritage';

/** Uma habilidade da ancestralidade (Clan Dagger, Change Shape…), com o nome que a ponte precisa. */
export interface AncestryFeature {
  readonly uuid: string;
  readonly name: string;
}

export interface Speed {
  /** `land`, `swim` — o `selector` do `BaseSpeed` do Foundry. */
  readonly type: string;
  readonly value: number;
}

export interface AncestryBase {
  readonly name: string;
  readonly slug: string;
  /** `ancestry` (50) ou `versatile` (17): o Tipo. Pelo `type` do documento. */
  readonly kind: string;
  /**
   * O que esta entrada CONTA COMO, para talentos: o próprio slug, e — na versátil que
   * "conta como" outra ancestralidade — o slug dela. Aiuvarin `['aiuvarin', 'elf']`,
   * Dromaar `['dromaar', 'orc']`; as outras 65, só o próprio. É o `ActiveEffectLike` em
   * `system.details.ancestry.countsAs`, que é como o Foundry dá ao meio-elfo os talentos
   * de elfo. A aba Talentos trava nisto.
   */
  readonly countsAs: readonly string[];
  readonly rarity: string;
  readonly traits: readonly string[];
  /**
   * Nulo na herança versátil, que não tem mecânica de ancestralidade — e no Animal
   * Desperto, cujo PV depende do tamanho escolhido (ver `hpBySize`).
   */
  readonly hp: number | null;
  /**
   * O PV de cada tamanho, quando o PV depende dele: `[6, 8, 10]` no Animal Desperto (Tiny
   * e Small dão 6 os dois; a lista não repete). Vazio nos outros 66.
   */
  readonly hpOptions: readonly number[];
  /**
   * Os tamanhos possíveis — `tiny`, `sm`, `med`, `lg`, os códigos do Foundry. UM na
   * maioria; dois em Fleshwarp e Automaton, quatro no Animal Desperto, que escolhem por
   * `ChoiceSet`. Vazio na versátil.
   */
  readonly sizes: readonly string[];
  /**
   * Em pés, em terra. O `system.speed` do pack, a não ser que um `BaseSpeed land` diga
   * outra coisa — o Animal Desperto tem `speed: 5` de marcador e a regra diz 20.
   */
  readonly speed: number | null;
  /** O deslocamento de nado, quando um `BaseSpeed swim` o dá: Merfolk e Athamaru, 25. */
  readonly swim: number | null;
  /**
   * TODOS os deslocamentos numa lista, para a linha única do detalhe: `land` primeiro, e o
   * que mais houver com o tipo — Merfolk `[{land, 5}, {swim, 25}]`. Vazio na versátil.
   */
  readonly speeds: readonly Speed[];
  /**
   * `normal`, `low-light-vision`, `darkvision` — do campo, na ancestralidade. Na versátil,
   * das regras `Sense`: `low-light-vision` em 10 das 17, e em 8 delas com a segunda regra
   * "darkvision se a ancestralidade já tem penumbra" — o código composto
   * `low-light-vision+darkvision`, que a tela escreve por extenso. Nulo nas 7 sem `Sense`.
   */
  readonly vision: string | null;
  /**
   * Os aumentos, na ordem dos slots: `['con', 'wis', 'free']`. `free` é o slot que a
   * fonte escreve com os seis atributos. Human e Orc: `['free', 'free']`.
   */
  readonly boosts: readonly string[];
  /** A falha de atributo — zero ou um código. Lista para desenhar com o mesmo pincel. */
  readonly flaws: readonly string[];
  readonly languages: readonly string[];
  readonly additionalLanguages: readonly string[];
  /**
   * QUANTOS idiomas adicionais: `int` (o modificador de Inteligência, se positivo) em 49,
   * `1+int` em Human (que não tem lista: é qualquer idioma). A regra está por extenso na
   * página do livro em 38 das 50 e nos campos em nenhuma — é o que a lateral não dizia
   * (Etapa 22d). Nulo nos 3 sem lista e sem contagem: a linha some.
   */
  readonly extraLanguages: string | null;
  /**
   * As habilidades concedidas: as de `system.items` (com nome) e as de `GrantItem` em
   * `system.rules` (só o UUID; o nome vem do índice, como as magias da divindade).
   */
  readonly features: readonly AncestryFeature[];
  /**
   * O que esta ancestralidade diz sobre o que concede — o Change Shape do Anadi tem o
   * texto do Anadi. 4 das 50 (Anadi, Kitsune, Tanuki, Yaoguai). Ver `alterations.ts`.
   */
  readonly alterations: readonly DescriptionAlteration[];
  readonly source: {
    readonly license: string;
    readonly title: string;
    readonly remaster: boolean;
  };
}

export interface AncestryDesc {
  /** O resumo do pack, de 231 a 1.123 caracteres, sem o link de rodapé (ver `semRodape`). */
  readonly main: string;
  /**
   * A PROSA da página do jornal `Ancestries`: até o título "<Nome> Mechanics", exclusive.
   * A mecânica que vem depois dele está nos campos (é o painel lateral), e a lista de
   * heranças que fecha a página vira a aba Heranças. Vazia quando o jornal não foi lido.
   */
  readonly page: string;
  /**
   * O bloco "<Nome> Mechanics" da página, como o livro o escreve — de "Hit Points" até a
   * última habilidade, sem a lista de heranças. É a chamada recolhida no fim do texto
   * (Etapa 24): a lateral tem os campos, mas 5 das 50 têm habilidade que só existe aqui
   * como texto (Undeath, Land on your Feet, Emphathic Sense, Jaws, Innate Envenom), e o
   * autor quer o livro inteiro à mão. Vazio na versátil, que não tem página.
   */
  readonly mechanics: string;
}

/** Os seis atributos, como a fonte escreve o slot LIVRE. */
const TODOS = 6;

/**
 * `{0: {value: ['con']}, 1: {value: ['wis']}, 2: {value: [6 atributos]}}` → `['con','wis','free']`.
 *
 * Um slot com um código é fixo; com os seis é livre; vazio não é slot (14 ancestralidades
 * têm o slot 1 vazio: um fixo e um livre). A ordem das chaves é a ordem do livro.
 */
function toBoosts(cru: unknown): readonly string[] {
  if (!isRecord(cru)) return [];
  const out: string[] = [];
  for (const chave of Object.keys(cru).sort()) {
    const slot = cru[chave];
    if (!isRecord(slot) || !Array.isArray(slot['value'])) continue;
    const codigos = slot['value'].filter((item): item is string => typeof item === 'string');
    if (codigos.length === TODOS) out.push('free');
    else if (codigos.length === 1) out.push(codigos[0] ?? '');
  }
  return out;
}

/** `{0: {value: ['cha']}}` → `['cha']`; `{0: {value: []}}` → `[]`. */
function toFlaws(cru: unknown): readonly string[] {
  if (!isRecord(cru)) return [];
  const primeiro = cru['0'];
  if (!isRecord(primeiro) || !Array.isArray(primeiro['value'])) return [];
  return primeiro['value'].filter((item): item is string => typeof item === 'string');
}

/** `{5vjeq: {uuid, name, level, img}}` → `[{uuid, name}]`, como o talento do antecedente. */
function toItems(cru: unknown): readonly AncestryFeature[] {
  if (!isRecord(cru)) return [];
  return Object.values(cru)
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .map((item) => ({
      uuid: typeof item['uuid'] === 'string' ? item['uuid'] : '',
      name: typeof item['name'] === 'string' ? item['name'] : '',
    }))
    .filter((item) => item.uuid !== '' && item.name !== '');
}

/**
 * Os `GrantItem` de `system.rules`: o que a ancestralidade dá além de `items`. São 3 —
 * o Change Shape de Anadi, Tanuki e Yaoguai, uma ação. Sem nome: o índice resolve.
 *
 * Lê `system.rules` de propósito, que está em `defer`: é a única leitura, é de um campo
 * só (`uuid` quando `key` é `GrantItem`), e o resto das regras continua adiado.
 */
function toGranted(document: unknown): readonly AncestryFeature[] {
  if (!isRecord(document) || !isRecord(document['system'])) return [];
  const rules = document['system']['rules'];
  if (!Array.isArray(rules)) return [];
  return (
    rules
      .filter((rule): rule is Record<string, unknown> => isRecord(rule))
      .filter((rule) => rule['key'] === 'GrantItem' && typeof rule['uuid'] === 'string')
      .map((rule) => rule['uuid'] as string)
      // `{item|flags…}` é escolha de ficha, não uma entrada: a versátil Dragonblood tem uma.
      .filter((uuid) => !uuid.includes('{'))
      .map((uuid) => ({ uuid, name: '' }))
  );
}

function toFeatures(document: unknown): readonly AncestryFeature[] {
  const items =
    isRecord(document) && isRecord(document['system']) ? document['system']['items'] : undefined;
  return [...toItems(items), ...toGranted(document)];
}

/** `int` para os 49, `1+int` para Human — a regra da página, que o pack só tem como número. */
function toExtraLanguages(document: unknown): string | null {
  if (!isRecord(document) || !isRecord(document['system'])) return null;
  const extra = document['system']['additionalLanguages'];
  if (!isRecord(extra)) return null;
  // Human: lista vazia E `count: 1` — "1 + Int, de qualquer idioma". A regra vale sem lista.
  if (extra['count'] === 1) return '1+int';
  return Array.isArray(extra['value']) && extra['value'].length > 0 ? 'int' : null;
}

/**
 * O `<p>@UUID[…JournalEntryPage…]{Dwarf}</p>` no FIM do resumo, nos 50 de 50.
 *
 * É o "leia mais" do Foundry: aponta para a página do jornal, que aqui já é `page` e se
 * abre pela tela completa. Na lateral ele saía como o nome da própria entrada em latão,
 * pontilhado e inerte — o autor perguntou o que era. Sai. Em Tripkee e Kholo ele vem SEM
 * rótulo (INCONSISTENCIAS-FOUNDRY 2.5), e aí saía o UUID cru.
 */
const RODAPE =
  /\s*<p>(?:<em>)?@UUID\[Compendium\.pf2e\.journals\.JournalEntry\.[A-Za-z0-9]{16}\.JournalEntryPage\.[A-Za-z0-9]{16}\](?:\{[^}]*\})?(?:<\/em>)?<\/p>\s*$/;

function semRodape(texto: string): string {
  return texto.replace(RODAPE, '');
}

/**
 * O `<h2>Dwarf Mechanics</h2>` que abre a mecânica — 50 de 50 o têm (8 com atributos na
 * tag, por isso `[^>]*`), e em todos ele vem antes de "<Nome> Heritages". Dali para baixo
 * a página repete os campos e lista as heranças por `@UUID`.
 */
const MECANICA = /<h2[^>]*>[^<]* Mechanics<\/h2>/;

function soProsa(texto: string): string {
  const corte = MECANICA.exec(texto);
  return corte === null ? texto : texto.slice(0, corte.index);
}

const HERANCAS = /<h2[^>]*>[^<]* Heritages<\/h2>/;

/** Do título "<Nome> Mechanics" (exclusive) até "<Nome> Heritages" (exclusive). */
function soMecanica(texto: string): string {
  const inicio = MECANICA.exec(texto);
  if (inicio === null) return '';
  const resto = texto.slice(inicio.index + inicio[0].length);
  const fim = HERANCAS.exec(resto);
  return (fim === null ? resto : resto.slice(0, fim.index)).trim();
}

/**
 * `[slug, ...countsAs]`: o próprio, mais o que os `ActiveEffectLike` em
 * `system.details.ancestry.countsAs` acrescentam (Aiuvarin → elf, Dromaar → orc). Lê
 * `system.rules`, que está em `defer`, de propósito e para uma chave só.
 */
function toCountsAs(document: unknown): readonly string[] {
  if (!isRecord(document) || !isRecord(document['system'])) return [];
  const slug = typeof document['system']['slug'] === 'string' ? document['system']['slug'] : '';
  const out = slug === '' ? [] : [slug];
  const rules = document['system']['rules'];
  if (!Array.isArray(rules)) return out;
  for (const rule of rules as unknown[]) {
    if (!isRecord(rule) || rule['key'] !== 'ActiveEffectLike') continue;
    if (rule['path'] !== 'system.details.ancestry.countsAs') continue;
    const value = rule['value'];
    if (typeof value === 'string' && value !== '' && !out.includes(value)) out.push(value);
  }
  return out;
}

/*
 * As REGRAS que corrigem os campos. Medido nos 50: o Animal Desperto tem `hp: 6`,
 * `size: med` e `speed: 5` de MARCADOR, e a verdade num `ChoiceSet` de tamanho (Large 10
 * PV, Medium 8, Small 6, Tiny 6), num `CreatureSize` e num `BaseSpeed land 20`; Fleshwarp
 * (sm/med) e Automaton (medium/small) escolhem o tamanho pelo mesmo `ChoiceSet`; Merfolk e
 * Athamaru nadam a 25 por `BaseSpeed swim`. O autor viu o Animal Desperto errado contra o
 * livro, e é daqui que sai o certo. As leituras são de `system.rules`, que está em
 * `defer`, cada uma de uma chave só. INCONSISTENCIAS-FOUNDRY 1.12.
 */

const TAMANHO: Readonly<Record<string, string>> = {
  tiny: 'tiny',
  sm: 'sm',
  small: 'sm',
  med: 'med',
  medium: 'med',
  lg: 'lg',
  large: 'lg',
};

function regras(document: unknown): readonly Record<string, unknown>[] {
  if (!isRecord(document) || !isRecord(document['system'])) return [];
  const rules = document['system']['rules'];
  if (!Array.isArray(rules)) return [];
  return (rules as unknown[]).filter((rule): rule is Record<string, unknown> => isRecord(rule));
}

function campo(document: unknown, chave: string): unknown {
  return isRecord(document) && isRecord(document['system']) ? document['system'][chave] : undefined;
}

/** As escolhas de tamanho de um `ChoiceSet`, como `{size, hp?}`; vazio se não há. */
function escolhasDeTamanho(document: unknown): readonly { size: string; hp: number | null }[] {
  for (const rule of regras(document)) {
    if (rule['key'] !== 'ChoiceSet' || !Array.isArray(rule['choices'])) continue;
    const escolhas = (rule['choices'] as unknown[]).flatMap((choice) => {
      if (!isRecord(choice)) return [];
      const value = choice['value'];
      if (typeof value === 'string') {
        const size = TAMANHO[value.toLowerCase()];
        return size === undefined ? [] : [{ size, hp: null }];
      }
      if (isRecord(value) && typeof value['size'] === 'string') {
        const size = TAMANHO[value['size'].toLowerCase()];
        if (size === undefined) return [];
        return [{ size, hp: typeof value['hitPoints'] === 'number' ? value['hitPoints'] : null }];
      }
      return [];
    });
    if (escolhas.length > 0) return escolhas;
  }
  return [];
}

/** Do menor ao maior, como o livro escreve: "Tiny, Small, Medium, or Large". */
const ORDEM_DE_TAMANHO = ['tiny', 'sm', 'med', 'lg'];

function toSizes(document: unknown): readonly string[] {
  const escolhas = escolhasDeTamanho(document);
  if (escolhas.length > 0) {
    return [...new Set(escolhas.map((e) => e.size))].sort(
      (a, b) => ORDEM_DE_TAMANHO.indexOf(a) - ORDEM_DE_TAMANHO.indexOf(b),
    );
  }
  const size = campo(document, 'size');
  return typeof size === 'string' ? [size] : [];
}

function toHpOptions(document: unknown): readonly number[] {
  const pv = escolhasDeTamanho(document)
    .map((e) => e.hp)
    .filter((hp): hp is number => hp !== null);
  return [...new Set(pv)].sort((a, b) => a - b);
}

/** O PV fixo — nulo quando depende do tamanho, e nulo na versátil. */
function toHp(document: unknown): number | null {
  if (toHpOptions(document).length > 0) return null;
  const hp = campo(document, 'hp');
  return typeof hp === 'number' ? hp : null;
}

function baseSpeed(document: unknown, selector: string): number | null {
  for (const rule of regras(document)) {
    if (
      rule['key'] === 'BaseSpeed' &&
      rule['selector'] === selector &&
      typeof rule['value'] === 'number'
    ) {
      return rule['value'];
    }
  }
  return null;
}

function toSpeed(document: unknown): number | null {
  const terra = baseSpeed(document, 'land');
  if (terra !== null) return terra;
  const speed = campo(document, 'speed');
  return typeof speed === 'number' ? speed : null;
}

function toSwim(document: unknown): number | null {
  return baseSpeed(document, 'swim');
}

function toSpeeds(document: unknown): readonly Speed[] {
  const out: Speed[] = [];
  const land = toSpeed(document);
  if (land !== null) out.push({ type: 'land', value: land });
  const swim = toSwim(document);
  if (swim !== null) out.push({ type: 'swim', value: swim });
  return out;
}

/**
 * A visão: o campo, quando há; senão as regras `Sense` — a sem predicado é a visão, e uma
 * `darkvision` com predicado `self:low-light-vision:from-ancestry` é o "sobe para escuridão
 * se a ancestralidade já tem penumbra" das versáteis (8 das 17).
 */
export function toVision(document: unknown): string | null {
  const campo_ = campo(document, 'vision');
  if (typeof campo_ === 'string' && campo_ !== '') return campo_;
  let base: string | null = null;
  let sobe = false;
  for (const rule of regras(document)) {
    if (rule['key'] !== 'Sense' || typeof rule['selector'] !== 'string') continue;
    if (rule['predicate'] === undefined || rule['predicate'] === null) base = rule['selector'];
    else if (rule['selector'] === 'darkvision') sobe = true;
  }
  if (base === null) return null;
  return sobe ? `${base}+darkvision` : base;
}

/** `ancestry` para o pack de ancestralidades; `versatile` para a herança sem ancestralidade. */
function toKind(document: unknown): string {
  return isRecord(document) && document['type'] === 'heritage' ? 'versatile' : 'ancestry';
}

export const ancestryRecipe = recipe<AncestryBase, AncestryDesc>({
  type: 'ancestry',
  accepts: ['ancestry', 'heritage'],
  packs: [{ name: 'ancestries' }, { name: 'heritages' }],
  /* Do pack de heranças só passa a VERSÁTIL; a própria é da receita de herança. */
  expand: (document) =>
    isRecord(document) && document['type'] === 'heritage' && isOwnHeritage(document)
      ? []
      : [document],

  base: {
    name: from('name', text),
    slug: from('system.slug', text),
    kind: fromDocument(toKind),
    countsAs: fromDocument(toCountsAs),
    rarity: from('system.traits.rarity', text),
    traits: from('system.traits.value', textList),
    hp: fromDocument(toHp),
    hpOptions: fromDocument(toHpOptions),
    sizes: fromDocument(toSizes),
    speed: fromDocument(toSpeed),
    swim: fromDocument(toSwim),
    speeds: fromDocument(toSpeeds),
    vision: fromDocument(toVision),
    boosts: from('system.boosts', raw).withDefault({}).map(toBoosts),
    flaws: from('system.flaws', raw).withDefault({}).map(toFlaws),
    languages: from('system.languages.value', textList).withDefault([]),
    additionalLanguages: from('system.additionalLanguages.value', textList).withDefault([]),
    extraLanguages: fromDocument(toExtraLanguages),
    features: fromDocument(toFeatures),
    alterations: fromDocument(descriptionAlterations),
    source: from('system.publication', shape({ license: text, title: text, remaster: bool })),
  },

  desc: {
    main: from('system.description.value', html).map(semRodape),
    page: fromJournal('Ancestries', '{name}', html).map(soProsa).withDefault(''),
    mechanics: fromJournal('Ancestries', '{name}', html).map(soMecanica).withDefault(''),
  },

  ignore: {
    'system.hp':
      'lido por `hp` (derivado): é o PV, a não ser que o PV dependa do tamanho, e aí é marcador.',
    'system.size':
      'lido por `sizes` (derivado): é o tamanho, a não ser que um ChoiceSet escolha, e aí é marcador.',
    'system.speed':
      'lido por `speed` (derivado): é o deslocamento, a não ser que um BaseSpeed land diga outro.',
    'system.vision': 'lido por `vision` (derivado): o campo, e na versátil as regras Sense.',
    'system.ancestry':
      'nulo nas 17 versáteis, que são as únicas heranças que esta receita deixa passar — ' +
      'o `kind` já diz que são versáteis. A herança própria, com ancestralidade, é da ' +
      'receita de herança.',
    folder: 'a pasta das versáteis no pack de heranças, uma só para as 17',
    img: 'ícone da ancestralidade; o zip não traz imagem',
    effects: 'active effects do VTT; vazio nos 50 e nas 17',
    'system._migration': 'controle interno de migração do Foundry',
    'system.hands': 'vale 2 nos 50. O que é igual em toda entrada não separa nada.',
    'system.reach':
      'função do tamanho: 5 nos 48, 0 nos 2 minúsculos (Sprite, Dragonet). O tamanho já diz.',
    'system.languages.custom': 'string vazia nos 50',
    'system.additionalLanguages.custom': 'string vazia nos 50',
    'system.additionalLanguages.count':
      'vale 1 só em Human e 0 nos outros 49. Lido por `extraLanguages` (derivado, que não ' +
      'marca cobertura); fica aqui para o relatório saber que foi visto.',
    'system.items':
      'as habilidades concedidas. Lidas por `features` (derivado); fica aqui pelo mesmo motivo.',
    '_stats.coreVersion': 'versão do Foundry que gerou; já sabemos pela tag do release',
    '_stats.systemId': 'sempre "pf2e"; já sabemos pelo canal',
    '_stats.systemVersion': 'já sabemos pela tag do release',
  },

  defer: {
    'system.rules':
      'rule elements (13 dos 50 têm) — mecânica pura de VTT: o que dá ao kitsune a forma ' +
      'alternativa, ao minotauro o chifre. A consulta lê os campos; a ficha vai ler isto.',
  },
});
