/**
 * Filtro e ordenação — puros, sem React e sem índice de busca.
 *
 * A busca por texto mora em `search.ts`; aqui está só o recorte por valor. Separados
 * porque são coisas diferentes: a busca ordena por relevância, o filtro só inclui ou
 * exclui. Juntá-los faria a ordenação depender de haver termo digitado.
 */

import { readPath } from '../normalization/paths';
import type { Combine, FilterSpec } from './spec';

/**
 * O que está selecionado, por TÓPICO.
 *
 * Chaveado pelo `id` do tópico e não pelo campo, porque nem todo tópico tem um campo:
 * o custo em ações lê `costKind` e `costCount` juntos. E porque dois tópicos podem olhar
 * o mesmo campo com recortes diferentes — chavear por campo faria um apagar o outro.
 *
 * `combine` ausente significa "o padrão do descritor". Guardar só o que o usuário mexeu
 * mantém o estado pequeno e faz o padrão continuar valendo se ele mudar no descritor.
 */
export interface FilterSelection {
  readonly values: readonly string[];
  readonly combine?: Combine;
}

export type FilterState = Readonly<Record<string, FilterSelection>>;

/** Uma entidade da `base/`, do jeito que a listagem precisa vê-la. */
export interface BrowseEntity {
  readonly key: string;
  readonly uuid: string;
  readonly base: unknown;
  /** Presente quando a entrada sumiu da fonte. Ver ARCHITECTURE, "A lápide". */
  readonly retiredIn?: string;
}

/**
 * O valor de um campo, já normalizado para texto comparável.
 *
 * `null` e `undefined` viram a string vazia de propósito: 20 das 43 condições têm grupo
 * nulo, e "sem grupo" é uma opção legítima de filtro, não um buraco.
 */
export function fieldValue(entity: BrowseEntity, field: string): string {
  const read = readPath(entity.base, field);
  const value = read.value;
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return '';
}

/**
 * Os valores de um campo que guarda uma LISTA — traços, por exemplo.
 *
 * Existe porque `fieldValue` devolve string vazia para array, e era por isso que um filtro
 * de traços não funcionava: ele enxergava todas as 766 ações como "sem valor".
 */
export function fieldList(entity: BrowseEntity, field: string): readonly string[] {
  const read = readPath(entity.base, field);
  const value = read.value;
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

/**
 * O custo em ações como um valor só, para filtrar.
 *
 * `1`, `2`, `3` para as ações contadas; `free`, `reaction`, `passive` para o resto. Os
 * dois campos viram um token porque é assim que a pessoa pensa: ela quer "as de uma ação",
 * não "as de tipo ação com contagem um".
 */
export function costToken(entity: BrowseEntity): string {
  const kind = fieldValue(entity, 'costKind');
  if (kind !== 'action') return kind;
  const count = fieldValue(entity, 'costCount');
  return count === '' ? 'action' : count;
}

/** Os valores distintos de um campo, com quantas entradas têm cada um. */
export interface FilterOption {
  readonly value: string;
  readonly count: number;
}

function ordenar(counts: Map<string, number>): readonly FilterOption[] {
  return [...counts]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => {
      // "sem valor" por último; o resto em ordem alfabética, não por contagem — a lista
      // precisa ficar no mesmo lugar entre uma busca e outra.
      if (a.value === '') return 1;
      if (b.value === '') return -1;
      return a.value.localeCompare(b.value);
    });
}

/**
 * Descobre as opções de um tópico a partir do próprio dado.
 *
 * Não há lista fixa em lugar nenhum: um traço novo numa versão futura do Foundry aparece
 * sozinho, do mesmo jeito que um campo novo aparece no relatório de não mapeados.
 */
export function optionsFor(
  entities: readonly BrowseEntity[],
  spec: FilterSpec,
): readonly FilterOption[] {
  const counts = new Map<string, number>();

  for (const entity of entities) {
    if (spec.kind === 'list') {
      // Uma entrada com três traços conta em três opções. A soma passa do total, e está
      // certo: a contagem responde "quantas entradas têm este traço".
      for (const item of fieldList(entity, spec.field)) {
        counts.set(item, (counts.get(item) ?? 0) + 1);
      }
      continue;
    }
    const value = spec.kind === 'cost' ? costToken(entity) : fieldValue(entity, spec.field);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return ordenar(counts);
}

/** O modo em vigor: o que o usuário escolheu, ou o padrão do descritor. */
export function combineOf(spec: FilterSpec, state: FilterState): Combine {
  return state[spec.id]?.combine ?? (spec.kind === 'list' ? spec.combine : 'any');
}

/** Uma entrada casa com o tópico? */
function matches(entity: BrowseEntity, spec: FilterSpec, selection: FilterSelection): boolean {
  const { values } = selection;

  if (spec.kind === 'list') {
    const have = fieldList(entity, spec.field);
    /*
     * `all` é E: a entrada precisa ter TODOS os traços marcados. `any` é OU. É o par que
     * o Archives of Nethys oferece, e a diferença importa. Medido nas 766 ações do
     * pf2e-8.5.0: `concentrate` tem 178, `manipulate` tem 92, o OU dá 250 e o E dá 20.
     */
    const combine = selection.combine ?? spec.combine;
    return combine === 'all'
      ? values.every((value) => have.includes(value))
      : values.some((value) => have.includes(value));
  }

  const value = spec.kind === 'cost' ? costToken(entity) : fieldValue(entity, spec.field);
  return values.includes(value);
}

/**
 * Aplica os filtros. Tópicos diferentes se somam (E); dentro de um tópico, o padrão é OU.
 *
 * É a convenção que todo filtro de loja usa. O par E/OU explícito existe só onde uma
 * entrada pode ter vários valores ao mesmo tempo — nos campos de valor único o E daria
 * sempre lista vazia, e um controle que só produz resultado vazio é uma armadilha.
 */
export function applyFilters(
  entities: readonly BrowseEntity[],
  specs: readonly FilterSpec[],
  state: FilterState,
): BrowseEntity[] {
  const active = specs
    .map((spec) => ({ spec, selection: state[spec.id] }))
    .filter(
      (entry): entry is { spec: FilterSpec; selection: FilterSelection } =>
        entry.selection !== undefined && entry.selection.values.length > 0,
    );

  if (active.length === 0) return [...entities];

  return entities.filter((entity) =>
    active.every((entry) => matches(entity, entry.spec, entry.selection)),
  );
}

/**
 * Ordem alfabética pelo nome, insensível a acento e caixa.
 *
 * `localeCompare` com `sensitivity: 'base'` trata "Á" e "a" como iguais — sem isso, uma
 * lista com nomes acentuados fica em ordem estranha quando a tradução chegar.
 */
export function byName(a: BrowseEntity, b: BrowseEntity): number {
  return fieldValue(a, 'name').localeCompare(fieldValue(b, 'name'), 'en', {
    sensitivity: 'base',
  });
}

export function sortByName(entities: readonly BrowseEntity[]): BrowseEntity[] {
  return [...entities].sort(byName);
}
