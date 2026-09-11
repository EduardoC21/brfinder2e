import { parseDurationCode, type ColumnSpec, type FilterSpec } from '@core/browse/index';
import { strings } from '@i18n/index';
import {
  BOOK_FIELD,
  SANCTIFICATION_FIELD,
  bookLabel,
  capitalizar,
  fieldText,
  sanctificationLabel,
} from '@ui/text';

import { ATTRIBUTE_FIELDS, attributeName } from './backgroundFields';

const t = strings.browse;

/**
 * Os rótulos dos tópicos e dos valores, num lugar só.
 *
 * Estão fora do `FilterBar` porque o painel do tópico (que mora na lateral) precisa dos
 * mesmos textos. Duas cópias divergiriam no primeiro rótulo novo — foi assim que os dois
 * `×` apareceram.
 *
 * Texto de interface vive no `i18n`, nunca no descritor: o descritor é estrutura, e
 * estrutura não tem idioma.
 *
 * Arquivo `.ts` e não `.tsx`, sem componente nenhum: um módulo que exporta função E
 * componente quebra o recarregamento a quente do Vite, que só sabe atualizar em vivo um
 * arquivo cujos exports são todos componentes.
 */
/*
 * O NOME do tópico também começa com maiúscula, para seguir o mesmo padrão do valor e do
 * botão `Colunas`, que sempre foi assim.
 */
export function topicLabel(spec: FilterSpec): string {
  if (spec.kind === 'cost') return capitalizar(t.cost.label);
  return capitalizar(t.fieldLabel[spec.field] ?? spec.field);
}

/** O rótulo de um valor. Booleano e "sem valor" precisam de tradução; o resto é o dado. */
export function valueLabel(spec: FilterSpec, value: string): string {
  /*
   * Os limites de faixa moram na MESMA lista dos valores marcados (`min:30`), e por isso
   * passam por aqui: é este rótulo que o chip da barra desenha.
   */
  if (spec.kind === 'number' || spec.kind === 'area') {
    if (value.startsWith('min:')) return boundLabel(spec.unit, 'min', Number(value.slice(4)));
    if (value.startsWith('max:')) return boundLabel(spec.unit, 'max', Number(value.slice(4)));
  }
  /* A santificação VAZIA é resposta ("nenhuma"), e não ausência: vem antes do "sem valor". */
  if (spec.kind === 'options' && spec.field === SANCTIFICATION_FIELD) {
    return sanctificationLabel(value);
  }
  if (value === '') return t.noValue;
  if (spec.kind === 'defense') return defenseLabel(value);
  if (spec.kind === 'boolean') return capitalizar(value === 'true' ? t.yes : t.no);
  if (spec.kind === 'cost') return costLabel(value);
  if (spec.kind === 'rarity') return capitalizar(t.rarity[value] ?? value);
  if (spec.kind === 'frequency') return frequencyLabel(value);
  if (spec.field === BOOK_FIELD) return bookLabel(value);
  /*
   * O código do atributo por EXTENSO: `str` → `Strength`.
   *
   * Sem isto o filtro escrevia `Str` enquanto a coluna ao lado escrevia
   * `Strength ou Dexterity` — o mesmo dado com duas caras, e a de cá é a que não bate com
   * a tela de perícias.
   */
  if (ATTRIBUTE_FIELDS.has(spec.field)) return attributeName(value);
  // O resto passa pelo MESMO caminho da coluna e do detalhe — tamanho, visão, e o que vier.
  return fieldText(spec.field, value);
}

/**
 * `1:day` → "1× por dia".
 *
 * Escreve a mesma frase que o componente `Frequency` desenha, a partir do TOKEN em vez da
 * entrada. As duas leituras têm de bater — quem filtra por "1× por dia" espera ver
 * exatamente isso escrito na coluna.
 */
export function frequencyLabel(token: string): string {
  const [max, per] = token.split(':');
  const f = t.frequency;
  const duracao = parseDurationCode(per ?? '');
  const unidade = duracao === null ? undefined : f.units[duracao.unit];
  const quantas = f.times(Number(max ?? 1));
  if (duracao === null || unidade === undefined) {
    return `${quantas} ${f.unknown(per ?? '')}`;
  }
  return `${quantas} ${f.every(duracao.count, unidade)}`;
}

/** `will` → `Vontade`; `ac` → `CA`. As duas metades da defesa, na mesma tabela. */
export function defenseLabel(value: string): string {
  const d = t.defense;
  return capitalizar(d.save[value] ?? d.passive[value] ?? value);
}

function costLabel(token: string): string {
  switch (token) {
    case '1':
    case '2':
    case '3':
      return t.cost.actions(Number(token));
    case 'free':
      return t.cost.free;
    case 'reaction':
      return t.cost.reaction;
    case 'passive':
      return t.cost.passive;
    default:
      return token === '' ? t.noValue : token;
  }
}

/** O rótulo de uma coluna. Mesma tabela dos filtros: `custo` é `custo` nos dois lugares. */
export function columnLabel(spec: ColumnSpec): string {
  if (spec.kind === 'cost') return capitalizar(t.cost.label);
  return capitalizar(t.fieldLabel[spec.field] ?? spec.field);
}

/**
 * O rótulo de uma coluna especial: nível, raridade, traços.
 *
 * O CAMPO manda quando a fonte tem um: magia guarda `rank`, e a calha dela se chama
 * "Ranque", não "Nível". Sem isto, o cabeçalho dizia uma palavra e o filtro do mesmo dado
 * dizia outra.
 */
export function specialColumnLabel(id: string, field?: string | null): string {
  if (field != null && t.fieldLabel[field] !== undefined) return capitalizar(t.fieldLabel[field]);
  return capitalizar(t.specialLabel[id] ?? id);
}

/**
 * O rótulo de um LIMITE de faixa: `≥ 30 pés`.
 *
 * Mora aqui e não em `valueLabel` porque quem o desenha são dois — o chip do filtro
 * aplicado e o campo do painel —, e uma segunda cópia divergiria na primeira unidade nova.
 */
export function boundLabel(unit: string, which: 'min' | 'max', value: number): string {
  const n = t.number;
  const unidade = n.units[unit] ?? unit;
  const quanto = formatNumber(value);
  return which === 'min' ? n.atLeast(quanto, unidade) : n.atMost(quanto, unidade);
}

/** `5280` → `5.280`. Separador de milhar em pt-BR, que é o que a pessoa lê. */
export function formatNumber(value: number): string {
  return value.toLocaleString('pt-BR');
}
