import { fieldValue, type BrowseEntity } from '@core/browse/index';
import { isRecord } from '@core/json';
import { strings } from '@i18n/index';
import { bulkText, capitalizar, priceText } from '@ui/text';

/**
 * Os três campos de equipamento que viram frase.
 *
 * Moram fora da lista e do detalhe porque os dois desenham os mesmos valores — a mesma
 * razão de `spellFields`. Devolvem TEXTO: nenhum deles tem glifo.
 *
 * Arquivo `.ts` e sem componente nenhum: um módulo que exporta componente E função quebra
 * o recarregamento a quente do Vite.
 */

/** `250` → `2 PO, 5 PP`. Vazio quando não há preço — 363 itens não têm. */
export function itemPriceText(entity: BrowseEntity, field: string): string {
  return priceText(Number(fieldValue(entity, field)));
}

/** `0` → nada, `0.1` → `L`, `2` → `2`. */
export function itemBulkText(entity: BrowseEntity, field: string): string {
  return bulkText(Number(fieldValue(entity, field)));
}

/**
 * `1d8 Slashing`.
 *
 * O TIPO do dano fica em inglês, como todo dado de jogo — é a mesma decisão dos traços
 * (OPEN-DECISIONS #4). Quem traduz é a Etapa 15, e traduz tudo de uma vez.
 */
export function itemDamageText(entity: BrowseEntity, field: string): string {
  const base = entity.base;
  if (!isRecord(base)) return '';
  const dano = base[field];
  if (!isRecord(dano)) return '';
  const formula = typeof dano['formula'] === 'string' ? dano['formula'] : '';
  if (formula === '') return '';
  const tipo = typeof dano['type'] === 'string' ? dano['type'] : '';
  return tipo === '' ? formula : `${formula} ${capitalizar(tipo)}`;
}

/** O rótulo do volume, para quem precisa dele fora de um campo rotulado. */
export const BULK_LABEL = strings.browse.bulk.label;
