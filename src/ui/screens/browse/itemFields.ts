import { fieldValue, type BrowseEntity, type StatFormat } from '@core/browse/index';
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

/**
 * `250` → `2 PO, 5 PP`. Vazio quando não há preço — 367 itens não têm.
 *
 * O LOTE entra junto quando existe: o AoN escreve `1 sp (price for 10)` nas flechas, e sem
 * isso uma flecha pareceria custar dez vezes o que custa. São 48 itens, quase todos
 * munição.
 */
export function itemPriceText(entity: BrowseEntity, field: string): string {
  const escrito = priceText(Number(fieldValue(entity, field)));
  if (escrito === '') return '';
  const lote = Number(fieldValue(entity, 'pricePer'));
  if (!Number.isFinite(lote) || lote <= 1) return escrito;
  return `${escrito} ${strings.browse.price.per(lote)}`;
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
  return damageOf(entity, field, false);
}

/**
 * O mesmo dano, ABREVIADO: `1d6 B`.
 *
 * É o que o Archives of Nethys põe na tabela de armas, e o motivo é largura: `Bludgeoning`
 * são doze caracteres numa coluna que existe para ser varrida de relance. A letra só vale
 * para os três danos FÍSICOS, que é onde a convenção existe — `fire` continua `Fire`,
 * porque `F` não quer dizer nada.
 */
export function itemDamageShort(entity: BrowseEntity, field: string): string {
  return damageOf(entity, field, true);
}

/** As três letras que o livro usa. Fora daqui, a palavra. */
const FISICO: Readonly<Record<string, string>> = {
  bludgeoning: 'B',
  piercing: 'P',
  slashing: 'S',
};

function damageOf(entity: BrowseEntity, field: string, curto: boolean): string {
  const base = entity.base;
  if (!isRecord(base)) return '';
  const dano = base[field];
  if (!isRecord(dano)) return '';
  const formula = typeof dano['formula'] === 'string' ? dano['formula'] : '';
  if (formula === '') return '';
  const tipo = typeof dano['type'] === 'string' ? dano['type'] : '';
  if (tipo === '') return formula;
  const escrito = curto ? (FISICO[tipo] ?? capitalizar(tipo)) : capitalizar(tipo);
  return `${formula} ${escrito}`;
}

/** O rótulo do volume, para quem precisa dele fora de um campo rotulado. */
export const BULK_LABEL = strings.browse.bulk.label;

/**
 * Um número da ficha do item, escrito como o livro escreve.
 *
 * Conferido nas tabelas de armadura e de escudo do Archives of Nethys:
 *
 *   CA               `0`, `1`, `2`          sem sinal — é valor, não modificador
 *   limite de Des    `+5`, `+3`, `+0`       COM sinal — é um teto de bônus
 *   testes           `-1`, `-2`, e vazio    com sinal, e o zero some
 *   deslocamento     `-5 ft.`, e vazio      com sinal e unidade, e o zero some
 *   Força            `0`, `1`, `4`          sem sinal
 *   dureza e PV      `3`, `20`              sem sinal
 *
 * O zero some só na PENALIDADE, e é a diferença que importa: "sem penalidade" se diz não
 * dizendo nada, enquanto uma CA zero é informação de verdade — a armadura destreinada dá
 * exatamente isso, e o AoN escreve o zero.
 */
export function statText(entity: BrowseEntity, field: string, formato: StatFormat): string {
  const cru = fieldValue(entity, field);
  if (cru === '') return '';
  const numero = Number(cru);
  if (!Number.isFinite(numero)) return cru;
  if (numero === 0 && formato.hideZero === true) return '';

  const sinal = formato.signed === true && numero >= 0 ? '+' : '';
  const unidade = formato.unit === undefined ? '' : ` ${formato.unit}`;
  /* O Limiar de Quebra: metade dos PV, e é assim que o livro escreve — `20 (10)`. */
  const metade =
    formato.half === true ? ` (${Math.floor(numero / 2).toLocaleString('pt-BR')})` : '';
  return `${sinal}${numero.toLocaleString('pt-BR')}${unidade}${metade}`;
}
