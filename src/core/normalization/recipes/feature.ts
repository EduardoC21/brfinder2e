/**
 * Receita de `feature` — as HABILIDADES que uma ancestralidade concede: Clan Dagger,
 * Fangs, Change Shape, Constructed. Pack `ancestryfeatures` (o arquivo é
 * `ancestry-features.json`; o nome é o do manifesto), 55 documentos.
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
import { from, fromSector } from '../field';
import { recipe } from '../recipe';

export interface FeatureBase {
  readonly name: string;
  readonly slug: string;
  /** `ancestryfeature` hoje; `classfeature` quando a classe for fonte. É o Tipo. */
  readonly category: string;
  /** A ancestralidade dona, pela pasta. Vazio se um dia um documento vier sem pasta. */
  readonly owner: string;
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

export const featureRecipe = recipe<FeatureBase, FeatureDesc>({
  type: 'feature',
  /* Os documentos são `feat`; a entidade é `feature`. */
  accepts: ['feat'],
  packs: [{ name: 'ancestryfeatures' }],

  base: {
    name: from('name', text),
    slug: from('system.slug', text),
    category: from('system.category', text),
    owner: fromSector(),
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
    'system.actionType.value':
      'vale `passive` nos 55. O que é igual em toda entrada não separa nada.',
    'system.actions.value': 'nulo nos 55: habilidade passiva não tem custo',
    'system.prerequisites.value': 'vazio nos 55: habilidade de ancestralidade não se pré-requer',
    'system.traits.selected':
      'cache de interface do Foundry que vazou para o compêndio (6 dos 55), o mesmo lixo ' +
      'já visto nas ações e nos talentos',
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
