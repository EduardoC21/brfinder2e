/**
 * Receita de `feature` — as HABILIDADES que uma ancestralidade ou uma CLASSE concede:
 * Clan Dagger, Fangs, Change Shape; Druidic Order, Sneak Attack, Arcane School. Dois
 * packs, `ancestryfeatures` (55) e `classfeatures` (874, desde a Etapa 26), a mesma forma.
 *
 * Nas de classe, medido: 769 com exatamente um traço de classe (a dona), 78 sem nenhum
 * (os 18 chamados míticos e habilidades partilhadas), 27 com vários (Ki Spells, de
 * quatro classes). E 324 com `otherTags` — a ETIQUETA que faz uma habilidade ser OPÇÃO
 * de uma escolha: as 9 ordens do druida têm `druid-order`, e a habilidade "Druidic Order"
 * tem um `ChoiceSet` com `filter: ["item:tag:druid-order"]`. É assim que o Foundry liga a
 * escolha às opções, e é o que a tela de classe usa para as abas de escolha.
 *
 * Décima quarta receita, e nasce por uma pergunta do autor: "a habilidade Fangs já era
 * para ser clicável?". Era o nome, gravado junto do UUID na ancestralidade, apontando
 * para um pack que não era fonte. Com a fonte, o clique abre.
 *
 * O documento é `type: feat` com `category: ancestryfeature` — a mesma forma dos
 * talentos, que a receita de talento lê desde a Etapa 9. Fonte PRÓPRIA pelo motivo do
 * familiar: quem abre Talentos procura o que se ESCOLHE; uma habilidade de ancestralidade
 * vem de graça com ela. E o tipo é `feature`, não `ancestry-feature`: as habilidades de
 * CLASSE (`class-features`, 874) têm a mesma forma e vão entrar aqui como Tipo, quando a
 * classe for fonte.
 *
 * Medido no `pf2e-8.5.0`:
 *
 *   55 documentos, todos passivos, sem pré-requisito, sem custo, raridade `common`
 *   pasta       a ANCESTRALIDADE dona (Awakened Animal 3, Kashrishi 2…) — é o setor
 *   nível       0 em 39, 1 em 16
 *   traços      um traço em 33 (o da ancestralidade), nenhum em 22
 *   descrição   44 a 4.675 caracteres
 *   apontadas   48 pelas ancestralidades; 7 não são apontadas por ninguém
 *
 * Decidida contra o JSON real do `pf2e-8.5.0`, em 11/09/2026.
 */

import { bool, html, int, shape, text, textList } from '../decoders';
import { isRecord } from '../../json';
import { from, fromDocument, fromSector } from '../field';
import { recipe } from '../recipe';

export interface FeatureBase {
  readonly name: string;
  readonly slug: string;
  /** `ancestryfeature`, `classfeature` ou `calling` (os míticos). É o Tipo. */
  readonly category: string;
  /** A ancestralidade dona, pela pasta (as 55). Vazio nas de classe. */
  readonly owner: string;
  /** A classe dona, pelo traço (769 das 874 têm exatamente um). Vazio nas partilhadas. */
  readonly classOwner: string;
  /** As etiquetas do Foundry (`otherTags`): `druid-order`, `wizard-arcane-school`… */
  readonly tags: readonly string[];
  /**
   * A etiqueta das OPÇÕES desta habilidade, quando ela é uma escolha — "Druidic Order"
   * escolhe entre as habilidades com `druid-order`. Vem do `ChoiceSet` com
   * `filter: ["item:tag:X"]`. Nula nas outras.
   */
  readonly choiceTag: string | null;
  readonly level: number;
  readonly traits: readonly string[];
  readonly rarity: string;
  readonly source: {
    readonly license: string;
    readonly title: string;
    readonly remaster: boolean;
  };
}

export interface FeatureDesc {
  readonly main: string;
}

/**
 * Os slugs das 29 classes — o traço que marca a dona de uma habilidade de classe. Lista
 * fechada porque a classe é um conjunto fechado do pack; o contrato de classe confere que
 * bate com o pack.
 */
export const CLASS_SLUGS: ReadonlySet<string> = new Set([
  'alchemist',
  'animist',
  'barbarian',
  'bard',
  'champion',
  'cleric',
  'commander',
  'druid',
  'exemplar',
  'fighter',
  'guardian',
  'gunslinger',
  'inventor',
  'investigator',
  'kineticist',
  'magus',
  'monk',
  'necromancer',
  'oracle',
  'psychic',
  'ranger',
  'rogue',
  'runesmith',
  'sorcerer',
  'summoner',
  'swashbuckler',
  'thaumaturge',
  'witch',
  'wizard',
]);

/** A classe dona, quando há exatamente UM traço de classe; senão vazio. */
function classeDona(document: unknown): string {
  if (!isRecord(document) || !isRecord(document['system'])) return '';
  const traits = document['system']['traits'];
  if (!isRecord(traits) || !Array.isArray(traits['value'])) return '';
  const donas = (traits['value'] as unknown[]).filter(
    (t): t is string => typeof t === 'string' && CLASS_SLUGS.has(t),
  );
  return donas.length === 1 ? (donas[0] ?? '') : '';
}

const TAG = /^item:tag:([a-z0-9-]+)$/;

/** A etiqueta das opções do primeiro `ChoiceSet` com `filter: ["item:tag:X"]`. */
function etiquetaDaEscolha(document: unknown): string | null {
  if (!isRecord(document) || !isRecord(document['system'])) return null;
  const rules = document['system']['rules'];
  if (!Array.isArray(rules)) return null;
  for (const rule of rules as unknown[]) {
    if (!isRecord(rule) || rule['key'] !== 'ChoiceSet' || !isRecord(rule['choices'])) continue;
    const filter = rule['choices']['filter'];
    if (!Array.isArray(filter)) continue;
    for (const termo of filter as unknown[]) {
      const tag = typeof termo === 'string' ? TAG.exec(termo)?.[1] : undefined;
      if (tag !== undefined) return tag;
    }
  }
  return null;
}

export const featureRecipe = recipe<FeatureBase, FeatureDesc>({
  type: 'feature',
  /* Os documentos são `feat`; a entidade é `feature`. */
  accepts: ['feat'],
  packs: [{ name: 'ancestryfeatures' }, { name: 'classfeatures' }],

  base: {
    name: from('name', text),
    slug: from('system.slug', text),
    category: from('system.category', text),
    owner: fromSector(),
    classOwner: fromDocument(classeDona),
    tags: from('system.traits.otherTags', textList).withDefault([]),
    choiceTag: fromDocument(etiquetaDaEscolha),
    level: from('system.level.value', int),
    traits: from('system.traits.value', textList),
    rarity: from('system.traits.rarity', text).withDefault('common'),
    source: from('system.publication', shape({ license: text, title: text, remaster: bool })),
  },

  desc: {
    main: from('system.description.value', html),
  },

  ignore: {
    img: 'ícone; o zip não traz imagem',
    effects: 'active effects do VTT; vazio nos 55',
    'system._migration': 'controle interno de migração do Foundry',
    'system.traits.selected':
      'cache de interface do Foundry que vazou para o compêndio (6 dos 55), o mesmo lixo ' +
      'já visto nas ações e nos talentos',
    'system.prerequisites.value':
      'vazio em 925 das 929; 4 habilidades de classe declaram, e a descrição as repete.',
    'system.actions.value': 'nulo em 928 das 929: habilidade passiva não tem custo',
    'system.actionCategory.value':
      'string vazia nas 10 modificações de inovação do Inventor que a têm; chave morta.',
    'system.actionType.value':
      'passive em 928; UMA habilidade de classe é ação. O que é igual em (quase) toda ' +
      'entrada não separa nada — e a descrição da uma diz.',
    '_stats.coreVersion': 'versão do Foundry que gerou; já sabemos pela tag do release',
    '_stats.systemId': 'sempre "pf2e"; já sabemos pelo canal',
    '_stats.systemVersion': 'já sabemos pela tag do release',
  },

  defer: {
    'system.rules':
      'rule elements (35 dos 55 têm) — mecânica pura de VTT: o ataque de mordida, a ' +
      'imunidade do construto. A descrição já conta em texto. Continua em raw/.',
    'system.subfeatures':
      'o que a habilidade CONCEDE em números: sentido (5), proficiência (4), idiomas (1), ' +
      'e as features que suprime (4). A descrição já conta em texto. Vira essencial na ficha.',
  },
});
