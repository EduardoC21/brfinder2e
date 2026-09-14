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

import {
  DEFAULT_METHOD_ORDER,
  isTranslationMethodId,
  type TranslationMethodId,
} from '../translation/methods';
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
   * As colunas escolhidas para CADA Tipo, quando um só está marcado.
   *
   * `columns` acima é a visão geral (nenhum Tipo, ou vários); isto é o recorte. Chaveado
   * pelo valor do Tipo — `weapon`, `armor`, `Spells`… —, e é o que faz "armas com dano e
   * mãos" e "armaduras com CA e limite de Destreza" conviverem sem uma apagar a outra.
   *
   * Mesma regra do `columns`: `null` é "nunca configurei, use o preset do Tipo"; `[]` é
   * "escolhi nenhuma".
   */
  readonly columnsByType: Readonly<Record<string, readonly string[] | null>>;
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
  /**
   * O trilho de fontes recolhido por escolha do usuário.
   *
   * ⚠️ O painel de DETALHE não tem par aqui, e é de propósito. O estado dele é DERIVADO:
   * ele está aberto quando há o que mostrar (uma entrada escolhida ou uma camada aberta) e
   * o usuário não o fechou. Gravar isso fazia a página abrir com o painel escancarado e
   * vazio, porque a escolha sobrevivia ao recarregamento e a seleção não.
   */
  readonly railCollapsed: boolean;
  readonly popoutWidth: number | null;
  readonly popoutHeight: number | null;
}

/**
 * As preferências de TRADUÇÃO (Etapa 30, pelo autor). Globais: valem para toda fonte.
 *
 *   display    o que aparece quando a entrada TEM tradução — o original ("traduzo quando
 *              quero ler") ou a tradução ("li uma vez, quero sempre"). Sem tradução
 *              gravada, é sempre o original: nada se traduz sem pedir.
 *   language   a língua para a qual se traduz; cada língua é um conjunto próprio em
 *              `trans/<língua>/`.
 *   methods    as formas LIGADAS, na ordem da hierarquia — a primeira que estiver
 *              disponível traduz, e a gravada por uma forma mais alta sobrescreve a de
 *              uma mais baixa. Ver `core/translation/methods.ts`.
 */
export interface TranslationPreferences {
  readonly display: 'original' | 'translated';
  readonly language: string;
  readonly methods: readonly TranslationMethodId[];
}

export interface Preferences {
  readonly sources: Readonly<Record<string, SourcePreferences>>;
  readonly layout: LayoutPreferences;
  readonly translation: TranslationPreferences;
}

export const EMPTY_SOURCE_PREFERENCES: SourcePreferences = {
  columns: null,
  columnsByType: {},
  hiddenSpecials: [],
  filters: {},
};

export const DEFAULT_PREFERENCES: Preferences = {
  sources: {},
  layout: {
    detailWidth: null,
    railCollapsed: false,
    popoutWidth: null,
    popoutHeight: null,
  },
  /* O original primeiro: ninguém vê tradução sem ter pedido uma. */
  translation: { display: 'original', language: 'pt-BR', methods: DEFAULT_METHOD_ORDER },
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

  /* O mesmo, por Tipo. Chave que não guarda lista some, em vez de virar lista vazia. */
  const columnsByType: Record<string, readonly string[] | null> = {};
  const porTipo = value['columnsByType'];
  if (isRecord(porTipo)) {
    for (const [tipo, lista] of Object.entries(porTipo)) {
      if (Array.isArray(lista)) columnsByType[tipo] = textList(lista);
    }
  }

  return {
    columns,
    columnsByType,
    hiddenSpecials: textList(value['hiddenSpecials']),
    filters,
  };
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
  const translation = isRecord(stored['translation']) ? stored['translation'] : {};
  const methods = Array.isArray(translation['methods'])
    ? translation['methods'].filter(isTranslationMethodId)
    : null;
  return {
    sources,
    layout: {
      detailWidth: positive(layout['detailWidth']),
      railCollapsed: layout['railCollapsed'] === true,
      popoutWidth: positive(layout['popoutWidth']),
      popoutHeight: positive(layout['popoutHeight']),
    },
    translation: {
      display: translation['display'] === 'translated' ? 'translated' : 'original',
      language:
        typeof translation['language'] === 'string' && translation['language'] !== ''
          ? translation['language']
          : DEFAULT_PREFERENCES.translation.language,
      // Chave ausente é "nunca configurei"; lista presente, mesmo vazia, é escolha.
      methods: methods ?? DEFAULT_METHOD_ORDER,
    },
  };
}

export function withTranslation(
  prefs: Preferences,
  patch: Partial<TranslationPreferences>,
): Preferences {
  return { ...prefs, translation: { ...prefs.translation, ...patch } };
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
