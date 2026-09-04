import type { FilterSpec } from '@core/browse/index';
import { strings } from '@i18n/index';

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
export function topicLabel(spec: FilterSpec): string {
  if (spec.kind === 'cost') return t.cost.label;
  return t.fieldLabel[spec.field] ?? spec.field;
}

/** O rótulo de um valor. Booleano e "sem valor" precisam de tradução; o resto é o dado. */
export function valueLabel(spec: FilterSpec, value: string): string {
  if (value === '') return t.noValue;
  if (spec.kind === 'boolean') return value === 'true' ? t.yes : t.no;
  if (spec.kind === 'cost') return costLabel(value);
  return value;
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
