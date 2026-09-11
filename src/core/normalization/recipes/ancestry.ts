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
 *                 `ancestryfeatures`, pack que ainda não é fonte
 *   jornal        50 de 50 têm página com o mesmo nome
 *
 * `hands` vale 2 nos 50 e `reach` é função do tamanho (5 nos 48, 0 nos 2 minúsculos):
 * os dois ficam em `ignore`. O que é igual em toda entrada, ou já dito por outro campo,
 * não separa nada.
 *
 * Decidida contra o JSON real do `pf2e-8.5.0`, em 11/09/2026.
 */

import { isRecord } from '../../json';
import { bool, html, int, raw, shape, text, textList } from '../decoders';
import { from, fromJournal } from '../field';
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
  readonly features: readonly AncestryFeature[];
  readonly source: {
    readonly license: string;
    readonly title: string;
    readonly remaster: boolean;
  };
}

export interface AncestryDesc {
  /** O resumo do pack, de 231 a 1.123 caracteres, sem o link de rodapé (ver `semRodape`). */
  readonly main: string;
  /** A página do jornal `Ancestries`. Vazia quando o jornal não foi lido. */
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
function toFeatures(cru: unknown): readonly AncestryFeature[] {
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
    features: from('system.items', raw).map(toFeatures),
    source: from('system.publication', shape({ license: text, title: text, remaster: bool })),
  },

  desc: {
    main: from('system.description.value', html).map(semRodape),
    page: fromJournal('Ancestries', '{name}', html).withDefault(''),
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
      'vale 1 só em Human e 0 nos outros 49: é o "um idioma a mais" do humano, que a ' +
      'descrição diz por extenso.',
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
