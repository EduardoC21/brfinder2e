/**
 * Receita de `class` — as 29 classes do pack `classes`, com a página do jornal `Classes`.
 *
 * A última das três fontes grandes. O pack tem a FICHA INICIAL em campos: atributo-chave,
 * PV por nível, proficiências (percepção, resistências, ataques, defesas), perícias
 * treinadas, se conjura, e os níveis em que se ganha cada tipo de talento — é com isso
 * que a tabela de progressão se monta. E `system.items`: as HABILIDADES DE CLASSE por
 * nível (556 apontamentos para `classfeatures`, 15 a 26 por classe), que é a coluna
 * "habilidades de classe" da tabela do livro. O jornal tem a página inteira — 13 a 16 mil
 * caracteres, com "Roleplaying the X", "Initial Proficiencies" e "Class Features" (e 10
 * `@Embed` das habilidades, que o embed cola).
 *
 * Medido no `pf2e-8.5.0`:
 *
 *   atributo-chave  um só em 22 (Int 8, Car 5, Sab 3, Des 3, For 2); For OU Des em 6;
                   VAZIO no psíquico. O que a subclasse abre está nas habilidades
                   (`subfeatures.keyOptions`, 9: ladino 5, psíquico 4) — tabela
                   `features-index.ts`. Ladino: Des + For/Int/Sab/Car; psíquico: Int/Car.
 *   PV              8 em 16, 10 em 7, 6 em 4, 12 em 2
 *   percepção       treinado 19, perito 10
 *   conjura         13 sim (rank 1), 16 não (0)
 *   perícias        1 fixa em 21, nenhuma em 6 (mais "additional": 2 a 7)
 *   ataques         `other` com nome em 3 (arma da divindade, bombas, armas de fogo)
 *   `classDC`       não existe no pack — a CD de classe é regra geral, não campo
 *   jornal          29 de 29 têm página com o mesmo nome (+2 páginas de tabela dracônica)
 *
 * As ESCOLHAS de classe (ordem do druida, escola do mago) não estão aqui: estão nas
 * habilidades, que têm o `ChoiceSet` com a etiqueta das opções. Ver `feature.ts`.
 *
 * Decidida contra o JSON real do `pf2e-8.5.0`, em 12/09/2026.
 */

import { isRecord } from '../../json';
import { classTables } from '../class-tables';
import type { ClassFeaturesByTrait } from '../features-index';
import { journalKey } from '../journals';
import { bool, html, int, listOf, shape, text, textList } from '../decoders';
import { from, fromDocument, fromJournal } from '../field';
import { recipe } from '../recipe';

/**
 * Um atributo-chave que uma SUBCLASSE abre, e por quais habilidades: o ladino é Destreza
 * pelo pack, mas o Ruffian abre Força e o Scoundrel abre Carisma. É o "Dexterity or Other"
 * do livro, com o "other" nomeado.
 */
export interface KeyAbilityOption {
  readonly ability: string;
  readonly features: readonly { readonly uuid: string; readonly name: string }[];
}

/** Uma habilidade de classe, com o nível em que se ganha. */
export interface ClassFeature {
  readonly uuid: string;
  readonly name: string;
  readonly level: number;
}

/** Os RANKS de proficiência do Foundry: 0 destreinado, 1 treinado, 2 perito, 3 mestre, 4 lendário. */
export interface ClassBase {
  readonly name: string;
  readonly slug: string;
  readonly rarity: string;
  /** Códigos de atributo: um, ou dois entre os quais se escolhe (`['dex', 'str']`). */
  readonly keyAbility: readonly string[];
  /**
   * Os que a subclasse abre, fora de `keyAbility`: o ladino tem `['dex']` aqui em cima e
   * For, Int, Sab e Car aqui; o psíquico tem NADA em cima (o pack deixa a lista vazia) e
   * Int e Car aqui, pela mente consciente. Vazio nas outras 27.
   */
  readonly keyAbilityOptions: readonly KeyAbilityOption[];
  readonly hp: number;
  readonly perception: number;
  readonly saves: { readonly fortitude: number; readonly reflex: number; readonly will: number };
  readonly attacks: {
    readonly simple: number;
    readonly martial: number;
    readonly advanced: number;
    readonly unarmed: number;
    /** Um grupo à parte com nome — "Deity's favored weapon", bombas, armas de fogo. */
    readonly other: { readonly name: string; readonly rank: number };
  };
  readonly defenses: {
    readonly unarmored: number;
    readonly light: number;
    readonly medium: number;
    readonly heavy: number;
  };
  /** 0 ou 1: se a classe conjura. */
  readonly spellcasting: number;
  readonly skills: readonly string[];
  /** Quantas perícias a mais, à escolha. */
  readonly extraSkills: number;
  /** Os níveis em que se ganha cada coisa — a tabela de progressão vem daqui. */
  readonly classFeatLevels: readonly number[];
  readonly skillFeatLevels: readonly number[];
  readonly generalFeatLevels: readonly number[];
  readonly ancestryFeatLevels: readonly number[];
  readonly skillIncreaseLevels: readonly number[];
  /** As habilidades de classe por nível, na ordem do nível. */
  readonly features: readonly ClassFeature[];
  /** Só os UUIDs, para a aba Habilidades travar. */
  readonly featureUuids: readonly string[];
  readonly source: {
    readonly license: string;
    readonly title: string;
    readonly remaster: boolean;
  };
}

export interface ClassDesc {
  /** O resumo do pack. */
  readonly main: string;
  /** A página do jornal `Classes`, inteira. Vazia quando o jornal não foi lido. */
  readonly page: string;
  /** A tabela de progressão da página (HTML), para a lateral. Ver `class-tables.ts`. */
  readonly progression: string;
  /** A tabela de magias por dia (HTML); vazia nas 17 que não a têm. */
  readonly spellSlots: string;
}

/**
 * `{a1b2c: {uuid, name, level, img}}` → `[{uuid, name, level}]`, por nível — e, no mesmo
 * nível, na ORDEM DO PACK, que é a do livro: o Wizard ganha "Arcane School, Arcane Bond,
 * Arcane Thesis" nessa ordem, e é nela que as abas de escolha aparecem (o autor, 26e).
 * Por nome era alfabético, que não é ordem nenhuma do jogo.
 */
function toFeatures(cru: unknown): readonly ClassFeature[] {
  if (!isRecord(cru)) return [];
  return Object.values(cru)
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .flatMap((item) =>
      typeof item['uuid'] === 'string' &&
      typeof item['name'] === 'string' &&
      typeof item['level'] === 'number'
        ? [{ uuid: item['uuid'], name: item['name'], level: item['level'] }]
        : [],
    )
    .sort((a, b) => a.level - b.level);
}

/** A ordem da ficha, que é a ordem em que as opções saem. */
const ATTRIBUTE_ORDER: readonly string[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

/**
 * Os atributos-chave que as habilidades com o traço da classe abrem, fora dos que a
 * classe já tem. Um por atributo, com as habilidades que o abrem, na ordem da ficha.
 */
function toKeyAbilityOptions(
  slug: string,
  keyAbility: readonly string[],
  features: ClassFeaturesByTrait | undefined,
): readonly KeyAbilityOption[] {
  const porAtributo = new Map<string, { uuid: string; name: string }[]>();
  for (const feature of features?.get(slug) ?? []) {
    for (const ability of feature.keyOptions) {
      if (keyAbility.includes(ability)) continue;
      const lista = porAtributo.get(ability);
      const entrada = { uuid: feature.uuid, name: feature.name };
      if (lista === undefined) porAtributo.set(ability, [entrada]);
      else lista.push(entrada);
    }
  }
  return [...porAtributo.entries()]
    .sort(([a], [b]) => ATTRIBUTE_ORDER.indexOf(a) - ATTRIBUTE_ORDER.indexOf(b))
    .map(([ability, lista]) => ({ ability, features: lista }));
}

/** As tabelas da página desta classe no jornal, ou vazias sem jornal. */
function tabelas(
  document: unknown,
  tables: { readonly journals?: ReadonlyMap<string, string> },
): ReturnType<typeof classTables> {
  const name = isRecord(document) && typeof document['name'] === 'string' ? document['name'] : '';
  return classTables(tables.journals?.get(journalKey('Classes', name)) ?? '');
}

/** `{value: [2, 4, 6]}` — os níveis em que se ganha algo. */
const levels = shape({ value: listOf(int) });

const rank = int;

export const classRecipe = recipe<ClassBase, ClassDesc>({
  type: 'class',
  packs: [{ name: 'classes' }],

  base: {
    name: from('name', text),
    slug: from('system.slug', text),
    rarity: from('system.traits.rarity', text).withDefault('common'),
    keyAbility: from('system.keyAbility.value', textList),
    keyAbilityOptions: fromDocument((document, tables) => {
      if (!isRecord(document) || !isRecord(document['system'])) return [];
      const system = document['system'];
      const keyAbility = isRecord(system['keyAbility']) ? system['keyAbility']['value'] : [];
      return toKeyAbilityOptions(
        typeof system['slug'] === 'string' ? system['slug'] : '',
        Array.isArray(keyAbility)
          ? keyAbility.filter((item): item is string => typeof item === 'string')
          : [],
        tables.features,
      );
    }),
    hp: from('system.hp', int),
    perception: from('system.perception', rank),
    saves: from('system.savingThrows', shape({ fortitude: rank, reflex: rank, will: rank })),
    attacks: from(
      'system.attacks',
      shape({
        simple: rank,
        martial: rank,
        advanced: rank,
        unarmed: rank,
        other: shape({ name: text, rank }),
      }),
    ),
    defenses: from(
      'system.defenses',
      shape({ unarmored: rank, light: rank, medium: rank, heavy: rank }),
    ),
    spellcasting: from('system.spellcasting', int),
    skills: from('system.trainedSkills.value', textList),
    extraSkills: from('system.trainedSkills.additional', int),
    classFeatLevels: from('system.classFeatLevels', levels).map((v) => v.value),
    skillFeatLevels: from('system.skillFeatLevels', levels).map((v) => v.value),
    generalFeatLevels: from('system.generalFeatLevels', levels).map((v) => v.value),
    ancestryFeatLevels: from('system.ancestryFeatLevels', levels).map((v) => v.value),
    skillIncreaseLevels: from('system.skillIncreaseLevels', levels).map((v) => v.value),
    features: fromDocument((document) =>
      toFeatures(
        isRecord(document) && isRecord(document['system'])
          ? document['system']['items']
          : undefined,
      ),
    ),
    featureUuids: fromDocument((document) =>
      toFeatures(
        isRecord(document) && isRecord(document['system'])
          ? document['system']['items']
          : undefined,
      ).map((feature) => feature.uuid),
    ),
    source: from('system.publication', shape({ license: text, title: text, remaster: bool })),
  },

  desc: {
    main: from('system.description.value', html),
    page: fromJournal('Classes', '{name}', html).withDefault(''),
    /*
     * As duas tabelas, tiradas da MESMA página: derivadas, e não `fromJournal` de novo —
     * o motor recusa dois campos no mesmo caminho, e a página inteira já é `page`.
     */
    progression: fromDocument((document, tables) => tabelas(document, tables).progression),
    spellSlots: fromDocument((document, tables) => tabelas(document, tables).spellSlots),
  },

  ignore: {
    'system.items':
      'as habilidades por nível; lidas por `features` (derivado), que não marca cobertura.',
    'system.traits.value': 'lista vazia nas 25 que a têm; a classe não tem traço',
    'system.trainedSkills.custom':
      'string vazia em 6 das 7 que a têm; "Esoteric Lore" no Thaumaturge, que a descrição ' +
      'e as habilidades já dizem. Chave de ficha, não de compêndio.',
    'system.keyAbility.selected':
      'nulo nas 4 mais novas (Guardian, Runesmith, Commander, Necromancer): cache de ' +
      'escolha da ficha que vazou para o compêndio, como o `traits.selected` das ações.',
    img: 'ícone; o zip não traz imagem',
    effects: 'active effects do VTT; vazio nas 29',
    'system._migration': 'controle interno de migração do Foundry',
    '_stats.coreVersion': 'versão do Foundry que gerou; já sabemos pela tag do release',
    '_stats.systemId': 'sempre "pf2e"; já sabemos pelo canal',
    '_stats.systemVersion': 'já sabemos pela tag do release',
  },

  defer: {
    'system.rules':
      'rule elements (6 das 29 têm): a proficiência marcial extra, as notas. Mecânica de ' +
      'ficha. Continua em raw/.',
  },
});
