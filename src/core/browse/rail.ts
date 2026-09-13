/**
 * O TRILHO SETORIZADO (Etapa 27, pelo autor): as fontes em pastas, e as fontes grandes
 * abertas em "Todos" mais uma entrada por TIPO.
 *
 * A entrada de Tipo não é uma fonte nova: é a MESMA fonte com o Tipo travado — a etiqueta
 * em bordô sem ×, como a trava das abas da tela completa; o tópico "Tipo" some da barra; e
 * entram as colunas e os filtros daquele Tipo, que é o recorte que já existia para quando
 * um Tipo só está marcado (`browse/scope.ts`). "Todos" é a lista de sempre.
 *
 * Os Tipos são os valores do `typeFilter` de cada fonte, medidos no `pf2e-8.5.0`:
 *
 *   talentos      Ancestry 1.561 · Class 1.993 · Archetype 2.340 · Skill 228 · General 41
 *                 · Mythic 49 · Miscellaneous 72 (a pasta raiz do pack)
 *   habilidades   ancestryfeature 55 · classfeature 856 · calling 18
 *   equipamentos  weapon 1.018 · armor 211 · shield 126 · consumable 1.703 · ammo 216
 *                 · equipment 2.394 · treasure 153 · backpack 46 · kit 2 (o `type`)
 *   magias        Spells 1.277 · Focus 545 · Rituals 167 · Impossible Spells 5 (a pasta)
 *
 * Os pequenos (Kit 2, Impossible Spells 5) entram como estão — decisão do autor: são o
 * dado, e esconder cria entradas que só a busca acha.
 *
 * Divindades e Domínios foram para Regras, pelo autor. Heranças continua fora (`hidden`).
 */

import { SOURCES, type FilterSpec, type SourceSpec } from './spec';

export type RailEntry =
  /** A fonte inteira; `all` quando é o "Todos" de uma pasta de Tipos. */
  | { readonly kind: 'source'; readonly source: string; readonly all?: true }
  /** A fonte com o Tipo travado em `value` — um valor do `typeFilter` dela. */
  | { readonly kind: 'type'; readonly source: string; readonly value: string };

export interface RailGroup {
  readonly id: string;
  readonly entries: readonly RailEntry[];
}

/** A primeira entrada do trilho cuja fonte tem receita — é a que o app abre. */
export function firstRailEntry(): RailEntry | undefined {
  for (const group of RAIL) {
    for (const entry of group.entries) {
      const source = SOURCES.find((spec) => spec.id === entry.source);
      if (source !== undefined && source.entityType !== null) return entry;
    }
  }
  return undefined;
}

/** O filtro de Tipo de uma fonte — o que a entrada de Tipo trava. */
export function typeFilterOf(source: SourceSpec): FilterSpec | undefined {
  return source.filters.find((filter) => filter.id === source.typeFilter);
}

/** A chave de uma entrada — `feats`, `feats:Class` —, para o estado e o `aria-current`. */
export function railEntryKey(entry: RailEntry): string {
  return entry.kind === 'source' ? entry.source : `${entry.source}:${entry.value}`;
}

const tipos = (source: string, values: readonly string[]): readonly RailEntry[] => [
  { kind: 'source', source, all: true },
  ...values.map((value): RailEntry => ({ kind: 'type', source, value })),
];

export const RAIL: readonly RailGroup[] = [
  {
    id: 'character',
    entries: [
      { kind: 'source', source: 'ancestries' },
      { kind: 'source', source: 'archetypes' },
      { kind: 'source', source: 'backgrounds' },
      { kind: 'source', source: 'classes' },
      { kind: 'source', source: 'familiars' },
      { kind: 'source', source: 'companions' },
    ],
  },
  {
    id: 'feats',
    entries: tipos('feats', [
      'Ancestry',
      'Class',
      'Archetype',
      'Skill',
      'General',
      'Mythic',
      'Miscellaneous',
    ]),
  },
  {
    id: 'features',
    entries: tipos('features', ['ancestryfeature', 'classfeature', 'calling']),
  },
  {
    id: 'equipment',
    entries: tipos('equipment', [
      'weapon',
      'armor',
      'shield',
      'consumable',
      'ammo',
      'equipment',
      'treasure',
      'backpack',
      'kit',
    ]),
  },
  {
    id: 'spells',
    entries: tipos('spells', ['Spells', 'Focus', 'Rituals', 'Impossible Spells']),
  },
  {
    id: 'rules',
    entries: [
      { kind: 'source', source: 'actions' },
      { kind: 'source', source: 'conditions' },
      { kind: 'source', source: 'skills' },
      { kind: 'source', source: 'rules' },
      { kind: 'source', source: 'deities' },
      { kind: 'source', source: 'domains' },
    ],
  },
];
