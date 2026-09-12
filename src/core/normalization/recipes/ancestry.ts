/**
 * Receita de `ancestry` — as 50 ancestralidades do pack `ancestries`, com a página do
 * jornal `Ancestries` junto.
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
import { bool, html, int, raw, shape, text, textList } from '../decoders';
import { from, fromDocument, fromJournal } from '../field';
import { recipe } from '../recipe';

/** Uma habilidade da ancestralidade (Clan Dagger, Change Shape…), com o nome que a ponte precisa. */
export interface AncestryFeature {
  readonly uuid: string;
  readonly name: string;
}

export interface AncestryBase {
  readonly name: string;
  readonly slug: string;
  readonly rarity: string;
  readonly traits: readonly string[];
  readonly hp: number;
  /** `tiny`, `sm`, `med`, `lg` — os códigos do Foundry; o rótulo é da tela. */
  readonly size: string;
  /** Em pés, só em terra. */
  readonly speed: number;
  /** `normal`, `low-light-vision`, `darkvision`. */
  readonly vision: string;
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
  return rules
    .filter((rule): rule is Record<string, unknown> => isRecord(rule))
    .filter((rule) => rule['key'] === 'GrantItem' && typeof rule['uuid'] === 'string')
    .map((rule) => ({ uuid: rule['uuid'] as string, name: '' }));
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

export const ancestryRecipe = recipe<AncestryBase, AncestryDesc>({
  type: 'ancestry',
  packs: [{ name: 'ancestries' }],

  base: {
    name: from('name', text),
    slug: from('system.slug', text),
    rarity: from('system.traits.rarity', text),
    traits: from('system.traits.value', textList),
    hp: from('system.hp', int),
    size: from('system.size', text),
    speed: from('system.speed', int),
    vision: from('system.vision', text),
    boosts: from('system.boosts', raw).map(toBoosts),
    flaws: from('system.flaws', raw).map(toFlaws),
    languages: from('system.languages.value', textList),
    additionalLanguages: from('system.additionalLanguages.value', textList),
    extraLanguages: fromDocument(toExtraLanguages),
    features: fromDocument(toFeatures),
    alterations: fromDocument(descriptionAlterations),
    source: from('system.publication', shape({ license: text, title: text, remaster: bool })),
  },

  desc: {
    main: from('system.description.value', html).map(semRodape),
    page: fromJournal('Ancestries', '{name}', html).map(soProsa).withDefault(''),
  },

  ignore: {
    img: 'ícone da ancestralidade; o zip não traz imagem',
    effects: 'active effects do VTT; vazio nos 50',
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
