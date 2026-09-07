/**
 * Filtro e ordenação — puros, sem React e sem índice de busca.
 *
 * A busca por texto mora em `search.ts`; aqui está só o recorte por valor. Separados
 * porque são coisas diferentes: a busca ordena por relevância, o filtro só inclui ou
 * exclui. Juntá-los faria a ordenação depender de haver termo digitado.
 */

import { isRecord } from '../json';
import { parseCastTime, type CastPoint } from '../normalization/cast';
import { readPath } from '../normalization/paths';
import { RARITY_ORDER, type Rarity } from './columns';
import { distanceFeet } from './distance';
import { parseDurationCode } from './duration';
import type { Combine, DefenseFields, FilterSpec } from './spec';

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
 * O custo de conjurar como UM token, para o filtro: o TEXTO CRU, em caixa baixa.
 *
 * Havia um agrupamento aqui — as 283 que levam mais de um turno viravam uma opção só,
 * `time` —, e ele custava mais do que economizava: "leva tempo" não responde se dá para
 * conjurar entre dois combates, e `2 to 2 rounds` caía nesse balaio junto com `1 day`,
 * que é quatro ordens de grandeza mais longo.
 *
 * São 27 formatos no dado e 26 opções aqui: `Reaction` com R maiúsculo existe em uma
 * magia, e a caixa baixa a junta com as outras 95. Nenhuma tabela escrita à mão — o
 * token É o dado, e um formato novo numa versão futura aparece sozinho.
 */
export function castToken(entity: BrowseEntity, field: string): string {
  const base = entity.base;
  if (!isRecord(base)) return '';
  const cast = base[field];
  if (!isRecord(cast)) return '';
  const raw = cast['raw'];
  return typeof raw === 'string' ? raw.trim().toLowerCase() : '';
}

/** Quanto dura cada unidade, em segundos. Rodada e turno valem 6s, como no jogo. */
const SEGUNDOS: Readonly<Record<string, number>> = {
  second: 1,
  turn: 6,
  round: 6,
  minute: 60,
  hour: 3600,
  day: 86_400,
  week: 604_800,
  month: 2_592_000,
  year: 31_536_000,
};

function segundosDoPonto(ponto: CastPoint): number {
  if (ponto.time === null) return 0;
  return ponto.time.count * (SEGUNDOS[ponto.time.unit] ?? 0);
}

/**
 * A ordem dos custos de magia: ◆ ◆◆ ◆◆◆, as faixas, ◇, ↩, e o que leva tempo.
 *
 * Não é uma tabela de tokens escritos à mão — com 26 opções ela seria uma segunda cópia do
 * dado, que envelheceria calada. É uma CONTA sobre o custo já decodificado, e o que leva
 * tempo se ordena pela duração de verdade: `2 rodadas` (12s) antes de `1 dia` (86.400s).
 *
 * A faixa mista `2 to 2 rounds` cai no grupo do tempo pelo extremo LONGO, que é o que
 * decide se ela cabe num turno — e lá dentro fica em primeiro, porque 12s é o menor.
 */
export function castRank(token: string): number {
  const cast = parseCastTime(token);
  if (cast.from.kind === 'unknown') return 1_000_000;

  const tempo = Math.max(segundosDoPonto(cast.from), segundosDoPonto(cast.to ?? cast.from));
  if (tempo > 0) return 1000 + tempo;

  if (cast.to !== null) {
    // Faixa de ações: 1-2, 1-3, 2-3, sempre depois das contagens simples.
    return 10 + (cast.from.count ?? 0) * 3 + (cast.to.count ?? 0);
  }
  if (cast.from.kind === 'action') return cast.from.count ?? 0;
  if (cast.from.kind === 'free') return 30;
  if (cast.from.kind === 'reaction') return 40;
  return 1_000_000;
}

/**
 * A CD passiva dobra no salvamento de mesmo nome.
 *
 * `fortitude-dc` é "o ataque rola contra a CD de Fortitude", e `fortitude` é "faça um
 * salvamento de Fortitude" — mecânicas diferentes, mas a MESMA defesa, e o livro escreve
 * as duas como "Defesa Fortitude" (conferido no AoN em Murderous Vine, que a fonte guarda
 * como `fortitude-dc`). Separá-las dava um filtro com quatro opções para três defesas.
 */
const CD_PASSIVA: Readonly<Record<string, string>> = {
  'fortitude-dc': 'fortitude',
  'reflex-dc': 'reflex',
  'will-dc': 'will',
};

/**
 * Contra o que a magia trabalha. UMA lista, porque podem ser duas.
 *
 * ⚠️ O modelo não é o campo `defense` sozinho — ele não basta. Medido nas 1.994, e
 * conferido contra o Archives of Nethys entrada por entrada:
 *
 *   1. Se há defesa PASSIVA declarada, é contra ela que o ataque rola: `ac`, ou a CD de um
 *      salvamento. Ela SUBSTITUI a CA — Murderous Vine ataca a CD de Fortitude, e o AoN
 *      escreve "Defesa Fortitude", não "CA".
 *   2. Senão, o traço `attack` já diz CA. É assim que a fonte modela: Phase Bolt tem
 *      `defense: null` e o traço `attack`, e o texto dele diz "spell attack roll against
 *      your target's AC". São 82 magias em que a CA existe SÓ no traço — sem esta regra, o
 *      filtro de defesa achava 6 de 94.
 *   3. O salvamento SOMA, não substitui. Pulverizing Wake ataca e ainda pede Fortitude
 *      básico, e o AoN escreve "Defense AC and basic Fortitude". São 6 assim.
 *
 * O preço: QUATRO magias trazem o traço `attack` sem ataque nenhum, e ganham um "CA" que o
 * livro não dá — `Incarnate Ancestry` e `Lucky Month` (que têm `attack` como ÚNICO traço,
 * o que denuncia o defeito), `Unseen Heralds` e `Shambling Horror`. É erro da fonte, não
 * nosso, e some sozinho quando o Foundry o corrigir.
 */
export function defenseTokens(entity: BrowseEntity, fields: DefenseFields): readonly string[] {
  const tokens: string[] = [];

  const passiva = fieldValue(entity, fields.passiveField);
  if (passiva !== '') tokens.push(CD_PASSIVA[passiva] ?? passiva);
  else if (fieldList(entity, fields.traitsField).includes(fields.attackTrait)) tokens.push('ac');

  const save = fieldValue(entity, `${fields.field}.statistic`);
  if (save !== '' && !tokens.includes(save)) tokens.push(save);

  return tokens;
}

/** A CA primeiro, como na linha do livro ("AC and basic Fortitude"); depois os salvamentos. */
const DEFENSE_ORDER: readonly string[] = ['ac', 'fortitude', 'reflex', 'will'];

/** O prefixo que marca um LIMITE numérico dentro dos valores marcados de um tópico. */
const MIN = 'min:';
const MAX = 'max:';

export interface Bounds {
  readonly min: number | null;
  readonly max: number | null;
}

/**
 * Os limites numéricos guardados na seleção do tópico.
 *
 * Moram no MESMO `values: string[]` das opções marcadas, como `min:30` e `max:60`, em vez
 * de um campo novo em `FilterSelection`. Assim eles atravessam sem mudança o que já existe:
 * a gravação da preferência, o botão que remove um filtro aplicado, a contagem no crachá do
 * tópico e o "limpar tudo". Um campo à parte obrigaria a mexer nos quatro.
 */
export function readBounds(values: readonly string[]): Bounds {
  let min: number | null = null;
  let max: number | null = null;
  for (const value of values) {
    if (value.startsWith(MIN)) {
      const n = Number(value.slice(MIN.length));
      if (Number.isFinite(n)) min = n;
    } else if (value.startsWith(MAX)) {
      const n = Number(value.slice(MAX.length));
      if (Number.isFinite(n)) max = n;
    }
  }
  return { min, max };
}

/** Os valores que NÃO são limite — as opções marcadas de verdade. */
export function plainValues(values: readonly string[]): readonly string[] {
  return values.filter((value) => !value.startsWith(MIN) && !value.startsWith(MAX));
}

/** Escreve (ou apaga, com `null`) um dos limites, preservando o resto da seleção. */
export function writeBound(
  values: readonly string[],
  which: 'min' | 'max',
  value: number | null,
): readonly string[] {
  const prefixo = which === 'min' ? MIN : MAX;
  const resto = values.filter((entry) => !entry.startsWith(prefixo));
  return value === null ? resto : [...resto, `${prefixo}${String(value)}`];
}

/**
 * O número que um tópico numérico lê de uma entrada. `null` quando não há número nenhum.
 *
 * A área guarda número (`{type, value}`); a distância guarda PROSA (`30 feet`, `1 mile`,
 * `touch`), e por isso passa por `distanceFeet`. Quem devolve `null` fica de fora quando
 * há limite marcado: não dá para afirmar que `planetary` passa de 30 pés.
 */
export function numberOf(entity: BrowseEntity, spec: FilterSpec): number | null {
  if (spec.kind !== 'number' && spec.kind !== 'area') return null;
  const campo = spec.kind === 'area' ? `${spec.field}.value` : spec.field;
  const valor = readPath(entity.base, campo).value;
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  if (typeof valor === 'string') return distanceFeet(valor);
  return null;
}

/** Os extremos do dado. Os dois SEMPRE existem — quem não tem devolve `null` inteiro. */
export interface Extent {
  readonly min: number;
  readonly max: number;
}

/** O menor e o maior valor que existem no dado, para a dica do painel. */
export function numericExtent(entities: readonly BrowseEntity[], spec: FilterSpec): Extent | null {
  let min: number | null = null;
  let max: number | null = null;
  for (const entity of entities) {
    const n = numberOf(entity, spec);
    if (n === null) continue;
    if (min === null || n < min) min = n;
    if (max === null || n > max) max = n;
  }
  return min === null || max === null ? null : { min, max };
}

/** Os valores distintos de um campo, com quantas entradas têm cada um. */
export interface FilterOption {
  readonly value: string;
  readonly count: number;
}

function ordenar(counts: Map<string, number>, spec: FilterSpec): readonly FilterOption[] {
  const lista = [...counts].map(([value, count]) => ({ value, count }));

  if (spec.kind === 'cast') {
    return lista.sort((a, b) => {
      if (a.value === '') return 1;
      if (b.value === '') return -1;
      const diferenca = castRank(a.value) - castRank(b.value);
      // `1 week` e `7 days` duram o mesmo; empate desfeito pelo texto, para a ordem ser
      // sempre a mesma entre uma abertura e outra do painel.
      return diferenca === 0 ? a.value.localeCompare(b.value) : diferenca;
    });
  }

  if (spec.kind === 'defense') {
    return lista.sort((a, b) => {
      if (a.value === '') return 1;
      if (b.value === '') return -1;
      const ia = DEFENSE_ORDER.indexOf(a.value);
      const ib = DEFENSE_ORDER.indexOf(b.value);
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
  // Tópico só de faixa não tem opção nenhuma: o que ele oferece são dois campos.
  if (spec.kind === 'number') return [];

  const counts = new Map<string, number>();

  /*
   * A raridade nasce com as quatro em zero. Sem isto, "única" sumiria da lista enquanto
   * não houvesse nenhuma na base — e a ausência da opção não diz "não há", diz nada.
   */
  if (spec.kind === 'rarity') {
    for (const rarity of RARITY_ORDER) counts.set(rarity, 0);
  }

  for (const entity of entities) {
    // Defesa é MULTIVALOR como os traços: 6 magias contam em duas opções, e está certo.
    if (spec.kind === 'defense') {
      for (const token of defenseTokens(entity, spec)) {
        counts.set(token, (counts.get(token) ?? 0) + 1);
      }
      if (defenseTokens(entity, spec).length === 0) counts.set('', (counts.get('') ?? 0) + 1);
      continue;
    }
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
  // A área tem DUAS perguntas no mesmo tópico; a das opções é o tipo.
  if (spec.kind === 'area') return fieldValue(entity, `${spec.field}.type`);
  return fieldValue(entity, spec.field);
}

/** O modo em vigor: o que o usuário escolheu, ou o padrão do descritor. */
export function combineOf(spec: FilterSpec, state: FilterState): Combine {
  return state[spec.id]?.combine ?? (spec.kind === 'list' ? spec.combine : 'any');
}

/** Uma entrada casa com o tópico? */
function matches(entity: BrowseEntity, spec: FilterSpec, selection: FilterSelection): boolean {
  const { values } = selection;

  if (spec.kind === 'defense') {
    const tokens = defenseTokens(entity, spec);
    // Sem defesa nenhuma casa com a opção "sem valor", como em qualquer outro tópico.
    if (tokens.length === 0) return values.includes('');
    return values.some((value) => tokens.includes(value));
  }

  if (spec.kind === 'number' || spec.kind === 'area') {
    /*
     * A área combina TIPO e TAMANHO no mesmo tópico, e os dois se somam (E): marcar
     * "explosão" e "até 20" pede as explosões de até 20 pés. São a mesma pergunta feita em
     * duas metades — separá-las em dois botões na barra faria a pessoa procurar "área" e
     * achar dois, sem saber qual abre o quê.
     */
    if (spec.kind === 'area') {
      const tipos = plainValues(values);
      if (tipos.length > 0 && !tipos.includes(fieldValue(entity, `${spec.field}.type`))) {
        return false;
      }
    }
    const { min, max } = readBounds(values);
    if (min === null && max === null) return true;
    const numero = numberOf(entity, spec);
    if (numero === null) return false;
    if (min !== null && numero < min) return false;
    if (max !== null && numero > max) return false;
    return true;
  }

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
