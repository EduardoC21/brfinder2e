import { parseDurationCode, type ColumnSpec, type FilterSpec } from '@core/browse/index';
import { strings } from '@i18n/index';
import { BOOK_FIELD, bookLabel, capitalizar } from '@ui/text';

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
  if (value === '') return t.noValue;
  if (spec.kind === 'boolean') return capitalizar(value === 'true' ? t.yes : t.no);
  if (spec.kind === 'cost') return costLabel(value);
  if (spec.kind === 'rarity') return capitalizar(t.rarity[value] ?? value);
  if (spec.kind === 'frequency') return frequencyLabel(value);
  if (spec.field === BOOK_FIELD) return bookLabel(value);
  return capitalizar(value);
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

/** O rótulo de uma coluna especial: nível, raridade, traços. Mesmo padrão do resto. */
export function specialColumnLabel(id: string): string {
  return capitalizar(t.specialLabel[id] ?? id);
}
