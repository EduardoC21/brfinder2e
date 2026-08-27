/**
 * Filtro e ordenação — puros, sem React e sem índice de busca.
 *
 * A busca por texto mora em `search.ts`; aqui está só o recorte por valor. Separados
 * porque são coisas diferentes: a busca ordena por relevância, o filtro só inclui ou
 * exclui. Juntá-los faria a ordenação depender de haver termo digitado.
 */

import { readPath } from '../normalization/paths';
import type { FilterSpec } from './spec';

/** O que está selecionado, por campo. Vazio ou ausente = filtro desligado. */
export type FilterState = Readonly<Record<string, readonly string[]>>;

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

/** Os valores distintos de um campo, com quantas entradas têm cada um. */
export interface FilterOption {
  readonly value: string;
  readonly count: number;
}

/**
 * Descobre as opções de um filtro a partir do próprio dado.
 *
 * Não há lista fixa em lugar nenhum: um grupo novo numa versão futura do Foundry aparece
 * sozinho, do mesmo jeito que um campo novo aparece no relatório de não mapeados.
 */
export function optionsFor(
  entities: readonly BrowseEntity[],
  field: string,
): readonly FilterOption[] {
  const counts = new Map<string, number>();
  for (const entity of entities) {
    const value = fieldValue(entity, field);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
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
 * Aplica os filtros. Campos diferentes se somam (E); valores do mesmo campo alternam (OU).
 *
 * É a convenção que todo filtro de loja usa, e é a que o artboard 2b assume ao falar do
 * alternador OU/E só para traços — nos demais campos o OU é implícito porque uma entrada
 * tem um valor só.
 */
export function applyFilters(
  entities: readonly BrowseEntity[],
  specs: readonly FilterSpec[],
  state: FilterState,
): BrowseEntity[] {
  const active = specs
    .map((spec) => ({ field: spec.field, selected: state[spec.field] ?? [] }))
    .filter((entry) => entry.selected.length > 0);

  if (active.length === 0) return [...entities];

  return entities.filter((entity) =>
    active.every((entry) => entry.selected.includes(fieldValue(entity, entry.field))),
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
