/**
 * Receita de `deity` — 480 entradas no pack `deities`.
 *
 * Nona receita, e a fonte que o trilho NÃO previa: divindade não estava entre as doze do
 * mockup, e apareceu no levantamento dos packs não lidos (Etapa 16). É consulta pura —
 * clérigo e campeão a abrem o tempo todo — e não depende de nada.
 *
 * Medido no `pf2e-8.5.0`:
 *
 *   category        deity 419, pantheon 37, covenant 17, philosophy 7 — é o Tipo
 *   pasta           36 grupos em 465 dos 480: Other Gods 51, Empyreal Lords 38, Pantheons
 *                   37, Monitor Demigods 24, Demon Lords 21, Core Gods 20… É o capítulo do
 *                   livro (Divine Mysteries), e vira o campo `group`.
 *   attribute       DOIS em 471 ("escolha um"), nenhum em 7 (filosofias), um em 2
 *   font            heal 174, harm 158, os dois 141, nenhum 7
 *   sanctification  pode ser sagrado 155, nula 110, deve ser profano 85, pode ser profano
 *                   61, pode ser um ou outro 45, deve ser sagrado 24
 *   skill           uma em 476
 *   weapons         uma em 442, duas em 31, nenhuma em 7
 *   domains         quatro primários em 470; alternativos de 0 a 5
 *   spells          três em 456 (ranques 1, 3 e 4 quase sempre), nove em 9, nenhuma em 10
 *   descrição       138 a 2.785 caracteres, mediana 1.054 — todas com Edicts e Anathema
 *
 * ⚠️ A DESCRIÇÃO NÃO TRAZ A MECÂNICA. Ela traz título, áreas de interesse, éditos,
 * anátema, símbolo, animal e cores sagradas. Atributo, fonte, santificação, perícia, arma,
 * domínios e magias existem SÓ nos campos — e por isso todos ficam no detalhe, ao
 * contrário do antecedente, onde a descrição recitava tudo e os campos saíram.
 *
 * Decidida contra o JSON real do `pf2e-8.5.0`, em 10/09/2026.
 */

import { bool, html, nullable, raw, shape, text, textList } from '../decoders';
import { isRecord } from '../../json';
import { from, fromSector } from '../field';
import { recipe } from '../recipe';

/** Uma magia concedida ao clérigo, por RANQUE. O nome mora na magia; aqui só o ponteiro. */
export interface GrantedSpell {
  readonly rank: number;
  readonly uuid: string;
}

export interface DeityBase {
  readonly name: string;
  readonly slug: string;

  /**
   * `deity`, `pantheon`, `covenant`, `philosophy`. O TIPO da tela — e por isso se chama
   * `kind`, como em equipamento: é o rótulo "tipo" que a barra de filtros espera.
   */
  readonly kind: string;

  /**
   * O GRUPO, da pasta do compêndio: `Core Gods`, `Empyreal Lords`, `Demon Lords`…
   *
   * Aqui a pasta ENTRA, ao contrário de equipamento e antecedente, e o número é o motivo:
   * cobre 465 dos 480 (97%) e não repete nenhum outro campo — divindade não tem traço, e
   * o livro (18 títulos) não diz se é um deus central ou um lorde demônio. É a organização
   * do próprio Divine Mysteries.
   */
  readonly group: string;

  /**
   * O atributo divino: DOIS, entre os quais o clérigo escolhe um — `con` ou `wis` em
   * Sarenrae. É a mesma forma do aumento do antecedente, e a tela desenha igual:
   * "Constitution ou Wisdom". Vazio nas 7 filosofias.
   */
  readonly divineAttribute: readonly string[];

  /** A fonte divina: `heal`, `harm`, ou os dois. Vazia em 7. */
  readonly font: readonly string[];

  /**
   * A santificação como UM token: `can:holy`, `must:unholy`, `can:holy+unholy`. Vazio
   * quando a fonte traz nulo (110), que é "nenhuma".
   *
   * Um token porque é uma pergunta só — "posso ser sagrado com este deus?" —, e dois campos
   * (`modal` e `what`) obrigariam a tela a conhecer a gramática do Foundry.
   */
  readonly sanctification: string;

  /** A perícia divina, pelo slug — `medicine`, `diplomacy`. Casa com a fonte de Perícias. */
  readonly divineSkill: readonly string[];

  /** A arma favorita, pelo slug — `scimitar`. Casa com o equipamento. */
  readonly weapons: readonly string[];

  /** Os domínios, pelo slug — `fire`, `healing`. Casam com a fonte de Domínios. */
  readonly domains: readonly string[];
  readonly alternateDomains: readonly string[];

  /** As magias de clérigo, por ranque, apontando para a fonte de Magias. */
  readonly spells: readonly GrantedSpell[];

  readonly source: {
    readonly license: string;
    readonly title: string;
    readonly remaster: boolean;
  };
}

export interface DeityDesc {
  readonly main: string;
}

/** `{modal: 'can', what: ['holy']}` → `can:holy`. Nulo → vazio. */
function toSanctification(cru: { modal: string; what: readonly string[] } | null): string {
  if (cru === null || cru.what.length === 0) return '';
  return `${cru.modal}:${[...cru.what].sort().join('+')}`;
}

/** `{1: uuid, 3: uuid, 4: uuid}` → `[{rank: 1, uuid}, …]`, do menor ranque para o maior. */
function toSpells(cru: unknown): readonly GrantedSpell[] {
  if (!isRecord(cru)) return [];
  return Object.entries(cru)
    .map(([rank, uuid]) => ({ rank: Number(rank), uuid: typeof uuid === 'string' ? uuid : '' }))
    .filter((entry) => Number.isInteger(entry.rank) && entry.uuid !== '')
    .sort((a, b) => a.rank - b.rank);
}

export const deityRecipe = recipe<DeityBase, DeityDesc>({
  type: 'deity',
  packs: [{ name: 'deities' }],

  base: {
    name: from('name', text),
    slug: from('system.slug', text),
    kind: from('system.category', text),
    group: fromSector(),
    divineAttribute: from('system.attribute', textList),
    font: from('system.font', textList),
    sanctification: from(
      'system.sanctification',
      nullable(shape({ modal: text, what: textList })),
    ).map(toSanctification),
    divineSkill: from('system.skill', textList),
    weapons: from('system.weapons', textList),
    domains: from('system.domains.primary', textList),
    alternateDomains: from('system.domains.alternate', textList),
    spells: from('system.spells', raw).map(toSpells),
    source: from('system.publication', shape({ license: text, title: text, remaster: bool })),
  },

  desc: {
    main: from('system.description.value', html),
  },

  ignore: {
    img: 'o símbolo religioso como imagem; o zip não traz imagem',
    effects: 'active effects do VTT; vazio nos 480',
    'system._migration': 'controle interno de migração do Foundry',
    'system.traits':
      'um objeto VAZIO em 473 e ausente em 7. Divindade não tem traço nem raridade na ' +
      'fonte — a chave existe pela forma comum dos itens do Foundry, sem conteúdo.',
    'system.rules': 'rule elements — vazio nos 480. Divindade não altera número nenhum.',
    '_stats.coreVersion': 'versão do Foundry que gerou; já sabemos pela tag do release',
    '_stats.systemId': 'sempre "pf2e"; já sabemos pelo canal',
    '_stats.systemVersion': 'já sabemos pela tag do release',
  },
});
