/**
 * As preferências de interface do usuário.
 *
 * Guardadas no `StorePort`, em chave própria, FORA de `base/` e `desc/`. Preferência não
 * é conteúdo da Paizo e não pode sumir numa sincronização — quem escolheu suas colunas não
 * quer perdê-las porque saiu um release novo do sistema.
 *
 * Guardadas por FONTE. A preferência de Talentos não é a de Magias: as colunas úteis são
 * outras, e os filtros nem existem em comum.
 *
 * ⚠️ O que vem do armazenamento é entrada NÃO CONFIÁVEL — foi gravado por uma versão
 * anterior do app, com outra forma. Por isso a leitura é tolerante: campo que não
 * reconhecemos é descartado, e nada aqui pode lançar. Preferência ilegível vira preferência
 * padrão, que é sempre recuperável; uma exceção aqui derrubaria a tela inteira na abertura.
 */

import type { FilterSelection } from '../browse/query';
import { isRecord } from '../json';

/*
 * A seleção de filtro é O MESMO tipo de `core/browse`, e não uma cópia.
 *
 * Havia aqui um `FilterSelection` idêntico, declarado "porque é a forma serializada". Duas
 * declarações estruturalmente iguais obrigam quem consome a fazer uma coerção — e a
 * coerção escondia a origem do valor a ponto de o compilador do React desistir de
 * memoizar a lista de resultados.
 */

export interface SourcePreferences {
  /**
   * Ids das colunas visíveis, NA ORDEM em que aparecem.
   *
   * ⚠️ `null` e `[]` são coisas DIFERENTES: `null` é "nunca configurei, use o padrão da
   * fonte"; `[]` é "escolhi nenhuma coluna além do nome".
   *
   * Eram a mesma coisa, e o efeito era um defeito: desmarcar a ÚLTIMA coluna deixava a
   * lista vazia, caía no padrão, e a coluna voltava sozinha. Não havia como desligar
   * `setor` em Ações nem `grupo` em Condições.
   */
  readonly columns: readonly string[] | null;
  /**
   * As colunas ESPECIAIS que o usuário desligou — `level`, `rarity`, `traits`.
   *
   * Guardamos o que está DESLIGADO, e não o que está ligado, porque elas vêm ligadas por
   * padrão. Assim a ausência de preferência já significa "todas ligadas", e uma especial
   * nova numa fonte futura nasce visível sem precisar migrar nada do que está gravado.
   */
  readonly hiddenSpecials: readonly string[];
  /** O último filtro aplicado, por id de tópico. */
  readonly filters: Readonly<Record<string, FilterSelection>>;
}

export interface LayoutPreferences {
  /** Largura da coluna de detalhe, em pixels. */
  readonly detailWidth: number | null;
  /** O trilho de fontes recolhido por escolha do usuário. */
  readonly railCollapsed: boolean;
  /** A coluna de detalhe recolhida por escolha do usuário. */
  readonly detailCollapsed: boolean;
  readonly popoutWidth: number | null;
  readonly popoutHeight: number | null;
}

export interface Preferences {
  readonly sources: Readonly<Record<string, SourcePreferences>>;
  readonly layout: LayoutPreferences;
}

export const EMPTY_SOURCE_PREFERENCES: SourcePreferences = {
  columns: null,
  hiddenSpecials: [],
  filters: {},
};

export const DEFAULT_PREFERENCES: Preferences = {
  sources: {},
  layout: {
    detailWidth: null,
    railCollapsed: false,
    detailCollapsed: false,
    popoutWidth: null,
    popoutHeight: null,
  },
};

/** Onde as preferências moram. Chave única: elas são poucas e sempre lidas juntas. */
export const KEY_PREFERENCES = 'prefs/ui';

function textList(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

/** Número positivo e finito, ou nada. Um `Infinity` gravado viraria uma coluna infinita. */
function positive(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

function readSelection(value: unknown): FilterSelection | null {
  if (!isRecord(value)) return null;
  const values = textList(value['values']);
  if (values.length === 0) return null;
  const combine = value['combine'];
  return combine === 'all' || combine === 'any' ? { values, combine } : { values };
}

function readSource(value: unknown): SourcePreferences {
  if (!isRecord(value)) return EMPTY_SOURCE_PREFERENCES;

  const filters: Record<string, FilterSelection> = {};
  const raw = value['filters'];
  if (isRecord(raw)) {
    for (const [topic, selection] of Object.entries(raw)) {
      const decoded = readSelection(selection);
      if (decoded !== null) filters[topic] = decoded;
    }
  }

  // Chave ausente é "nunca configurei"; array presente, mesmo vazio, é escolha.
  const columns = Array.isArray(value['columns']) ? textList(value['columns']) : null;
  return { columns, hiddenSpecials: textList(value['hiddenSpecials']), filters };
}

/** Decodifica o que está gravado. Nunca lança; o ilegível vira o padrão. */
export function readPreferences(stored: unknown): Preferences {
  if (!isRecord(stored)) return DEFAULT_PREFERENCES;

  const sources: Record<string, SourcePreferences> = {};
  const raw = stored['sources'];
  if (isRecord(raw)) {
    for (const [id, value] of Object.entries(raw)) sources[id] = readSource(value);
  }

  const layout = isRecord(stored['layout']) ? stored['layout'] : {};
  return {
    sources,
    layout: {
      detailWidth: positive(layout['detailWidth']),
      railCollapsed: layout['railCollapsed'] === true,
      detailCollapsed: layout['detailCollapsed'] === true,
      popoutWidth: positive(layout['popoutWidth']),
      popoutHeight: positive(layout['popoutHeight']),
    },
  };
}

/** As preferências de uma fonte, com o padrão quando ela nunca foi configurada. */
export function sourcePreferences(prefs: Preferences, sourceId: string): SourcePreferences {
  return prefs.sources[sourceId] ?? EMPTY_SOURCE_PREFERENCES;
}

/** Troca as preferências de UMA fonte, sem tocar nas outras. */
export function withSource(
  prefs: Preferences,
  sourceId: string,
  patch: Partial<SourcePreferences>,
): Preferences {
  const atual = sourcePreferences(prefs, sourceId);
  return { ...prefs, sources: { ...prefs.sources, [sourceId]: { ...atual, ...patch } } };
}

export function withLayout(prefs: Preferences, patch: Partial<LayoutPreferences>): Preferences {
  return { ...prefs, layout: { ...prefs.layout, ...patch } };
}

/**
 * Move um item de lugar numa lista de ids.
 *
 * A ordem das colunas é escolha explícita, e não "a ordem em que foram clicadas": quem
 * marca `raridade` depois de `setor` pode querer a raridade primeiro, e sem isto ele
 * teria que desmarcar tudo e remarcar na ordem certa.
 */
export function moveColumn(
  columns: readonly string[],
  id: string,
  direction: -1 | 1,
): readonly string[] {
  const from = columns.indexOf(id);
  if (from < 0) return columns;
  const to = from + direction;
  if (to < 0 || to >= columns.length) return columns;

  const next = [...columns];
  const [item] = next.splice(from, 1);
  if (item === undefined) return columns;
  next.splice(to, 0, item);
  return next;
}
