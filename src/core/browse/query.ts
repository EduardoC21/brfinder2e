/**
 * Filtro e ordenação — puros, sem React e sem índice de busca.
 *
 * A busca por texto mora em `search.ts`; aqui está só o recorte por valor. Separados
 * porque são coisas diferentes: a busca ordena por relevância, o filtro só inclui ou
 * exclui. Juntá-los faria a ordenação depender de haver termo digitado.
 */

import { isRecord } from '../json';
import { readPath } from '../normalization/paths';
import { RARITY_ORDER, type Rarity } from './columns';
import { parseDurationCode } from './duration';
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

/**
 * Os custos, na ordem do JOGO: ◆ ◆◆ ◆◆◆ ◇ ↩ —.
 *
 * Domínio fechado, como a raridade, e por isso escrito. Pelo alfabeto — que era o que
 * valia até aqui, desde que o filtro existe — `passive` vinha antes de `reaction`, e o
 * traço aparecia no meio da lista em vez de fechá-la. Não foi regressão de agora: era
 * assim desde sempre, e só ficou visível em talentos, onde passiva são 3.977 de 6.284.
 */
const COST_ORDER: readonly string[] = ['1', '2', '3', 'free', 'reaction', 'passive'];

/**
 * A frequência como UM token: `1:day`, `3:day`. Vazio quando não há.
 *
 * Dois campos viram um pelo mesmo motivo do custo: a pessoa quer "as de uma vez por dia",
 * não "as de máximo um com período dia".
 */
export function frequencyToken(entity: BrowseEntity, field: string): string {
  const base = entity.base;
  if (!isRecord(base)) return '';
  const value = base[field];
  if (!isRecord(value)) return '';
  const max = Number(value['max']);
  const per = typeof value['per'] === 'string' ? value['per'] : '';
  if (per === '') return '';
  return `${String(Number.isFinite(max) ? max : 1)}:${per}`;
}

/**
 * Quanto dura cada unidade, da mais curta para a mais longa.
 *
 * `turn` antes de `round` porque o turno é parte da rodada. Ordenar frequência pelo
 * alfabeto poria "por dia" antes de "por rodada", que é o contrário do que a pessoa lê.
 */
const DURACAO: Readonly<Record<string, number>> = {
  turn: 0,
  round: 1,
  second: 2,
  minute: 3,
  hour: 4,
  day: 5,
  week: 6,
  month: 7,
  year: 8,
};

function pesoDaFrequencia(token: string): number {
  const [max, per] = token.split(':');
  const duracao = parseDurationCode(per ?? '');
  // Código desconhecido vai para o fim, e não para o meio fingindo que foi entendido.
  const unidade = duracao === null ? 99 : (DURACAO[duracao.unit] ?? 99);
  const conta = duracao === null ? 0 : duracao.count;
  return unidade * 10_000 + conta * 100 + Number(max ?? 1);
}

/**
 * O custo de conjurar como UM token, para o filtro.
 *
 * As 283 magias que levam mais de um turno viram UMA opção, `time`, e não dezessete. A
 * pergunta que a pessoa faz é "quais levam tempo", e não "quais levam exatamente 4 horas" —
 * dezessete opções de duração empurrariam as seis que importam para fora da tela.
 *
 * Faixa vira `1-3`, `1-2`, `2-3`. A faixa mista (`2 to 2 rounds`, 7 magias) cai em `time`,
 * porque é o extremo longo que decide se cabe no turno.
 */
export function castToken(entity: BrowseEntity, field: string): string {
  const base = entity.base;
  if (!isRecord(base)) return '';
  const cast = base[field];
  if (!isRecord(cast)) return '';
  const de = isRecord(cast['from']) ? cast['from'] : null;
  const ate = isRecord(cast['to']) ? cast['to'] : null;
  if (de === null) return '';

  const especie = (ponto: Record<string, unknown>): string => {
    const kind = typeof ponto['kind'] === 'string' ? ponto['kind'] : '';
    if (kind !== 'action') return kind;
    const count = ponto['count'];
    return typeof count === 'number' ? String(count) : '';
  };

  const inicio = especie(de);
  if (ate === null) return inicio;
  const fim = especie(ate);
  // Faixa que termina em duração é `time`: o extremo longo é o que decide.
  if (fim === 'time' || inicio === 'time') return 'time';
  return `${inicio}-${fim}`;
}

/**
 * A ordem dos custos de magia: ◆ ◆◆ ◆◆◆, as faixas, ◇, ↩, e por fim o que leva tempo.
 *
 * Domínio fechado, pelo mesmo motivo de `COST_ORDER`: alfabeticamente `free` viria antes de
 * `reaction` e `time` no meio, e nada disso é a ordem em que se lê um custo.
 */
const CAST_ORDER: readonly string[] = [
  '1',
  '2',
  '3',
  '1-2',
  '1-3',
  '2-3',
  'free',
  'reaction',
  'time',
];

/** Os valores distintos de um campo, com quantas entradas têm cada um. */
export interface FilterOption {
  readonly value: string;
  readonly count: number;
}

function ordenar(counts: Map<string, number>, spec: FilterSpec): readonly FilterOption[] {
  const lista = [...counts].map(([value, count]) => ({ value, count }));

  if (spec.kind === 'cast') {
    return lista.sort((a, b) => {
      const ia = CAST_ORDER.indexOf(a.value);
      const ib = CAST_ORDER.indexOf(b.value);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
  }

  if (spec.kind === 'cost') {
    return lista.sort((a, b) => {
      // Um custo que a receita ainda não conheça vai para o fim, e não para o meio.
      const ia = COST_ORDER.indexOf(a.value);
      const ib = COST_ORDER.indexOf(b.value);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
  }

  /* Domínio fechado: a ordem é a do JOGO, e vem escrita em `RARITY_ORDER`. */
  if (spec.kind === 'rarity') {
    return lista.sort(
      (a, b) => RARITY_ORDER.indexOf(a.value as Rarity) - RARITY_ORDER.indexOf(b.value as Rarity),
    );
  }

  if (spec.kind === 'frequency') {
    return lista.sort((a, b) => {
      if (a.value === '') return 1;
      if (b.value === '') return -1;
      return pesoDaFrequencia(a.value) - pesoDaFrequencia(b.value);
    });
  }

  return lista.sort((a, b) => {
    // "sem valor" por último; o resto em ordem alfabética, não por contagem — a lista
    // precisa ficar no mesmo lugar entre uma busca e outra.
    if (a.value === '') return 1;
    if (b.value === '') return -1;
    /*
     * `numeric: true` porque número como texto ordena errado: o filtro de nível dos
     * talentos sairia 0, 1, 10, 11, …, 2, 20, 3. De quebra arruma os livros, que têm
     * número no nome (`Pathfinder #146` antes de `#174`).
     */
    return a.value.localeCompare(b.value, undefined, { numeric: true });
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

  /*
   * A raridade nasce com as quatro em zero. Sem isto, "única" sumiria da lista enquanto
   * não houvesse nenhuma na base — e a ausência da opção não diz "não há", diz nada.
   */
  if (spec.kind === 'rarity') {
    for (const rarity of RARITY_ORDER) counts.set(rarity, 0);
  }

  for (const entity of entities) {
    if (spec.kind === 'list') {
      // Uma entrada com três traços conta em três opções. A soma passa do total, e está
      // certo: a contagem responde "quantas entradas têm este traço".
      for (const item of fieldList(entity, spec.field)) {
        counts.set(item, (counts.get(item) ?? 0) + 1);
      }
      continue;
    }
    const value = valorDoTopico(entity, spec);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return ordenar(counts, spec);
}

/** O valor que um tópico lê de uma entrada. Uma definição só, usada na conta e no casamento. */
function valorDoTopico(entity: BrowseEntity, spec: FilterSpec): string {
  if (spec.kind === 'cost') return costToken(entity);
  if (spec.kind === 'cast') return castToken(entity, spec.field);
  if (spec.kind === 'frequency') return frequencyToken(entity, spec.field);
  return fieldValue(entity, spec.field);
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

  return values.includes(valorDoTopico(entity, spec));
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

/** Por que coluna a lista está ordenada, e em que sentido. */
export type SortColumn = 'name' | 'level';
export type SortDirection = 'asc' | 'desc';
export interface Sort {
  readonly column: SortColumn;
  readonly direction: SortDirection;
}

/** A ordem em que a lista abre: alfabética pelo nome. */
export const DEFAULT_SORT: Sort = { column: 'name', direction: 'asc' };

/**
 * Ordena por nome ou por nível.
 *
 * Nível é comparado como NÚMERO, e desempatado pelo NOME. Sem o desempate, os 891
 * talentos de nível 1 sairiam na ordem em que o filtro os deixou — que muda a cada
 * clique, e uma lista que se reembaralha sozinha é pior que uma desordenada.
 *
 * Escrito à mão, e não com biblioteca de tabela: são duas comparações, e uma biblioteca
 * traria junto um modelo de DOM próprio que brigaria com a grade compartilhada da lista.
 */
/**
 * Ordena por nome ou pela calha numérica.
 *
 * ⚠️ `levelField` é PARÂMETRO, e não a string `'level'` fixa no código. Era fixa, e era
 * dívida: magia não tem `level`, tem `rank` — o Remaster renomeou "spell level" para
 * "spell rank" para não confundir com o nível do personagem. Com a string fixa, ordenar
 * magias por posto comparava `undefined` com `undefined` e não ordenava nada.
 */
export function sortEntities(
  entities: readonly BrowseEntity[],
  sort: Sort,
  levelField: string,
): BrowseEntity[] {
  const sinal = sort.direction === 'asc' ? 1 : -1;
  if (sort.column === 'name') return [...entities].sort((a, b) => sinal * byName(a, b));

  return [...entities].sort((a, b) => {
    const na = Number(fieldValue(a, levelField));
    const nb = Number(fieldValue(b, levelField));
    // Entrada sem nível válido vai para o fim NOS DOIS SENTIDOS: ela não participa da
    // pergunta "do menor para o maior", e pô-la no topo do decrescente seria mentira.
    const va = Number.isFinite(na);
    const vb = Number.isFinite(nb);
    if (!va || !vb) return va === vb ? byName(a, b) : va ? -1 : 1;
    return na === nb ? byName(a, b) : sinal * (na - nb);
  });
}
