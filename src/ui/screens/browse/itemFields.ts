import { fieldValue, type BrowseEntity, type StatFormat } from '@core/browse/index';
import { isRecord } from '@core/json';
import { strings } from '@i18n/index';
import { bulkText, capitalizar, fieldText, priceText } from '@ui/text';

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
 * O dano INTEIRO: o direto, o persistente e o respingo.
 *
 * `1 Acid, 1d6 Acid persistente, 1 de respingo` — a mesma frase que a descrição do item
 * escreve por extenso.
 *
 * ⚠️ As três partes são necessárias, e a falta delas foi um defeito de verdade: os quatro
 * graus do Acid Flask têm o MESMO `1` de dano direto, e só se distinguem pelo persistente
 * (1d6 · 2d6 · 3d6 · 4d6) e pelo respingo (1 · 2 · 3 · 4). Mostrando só o direto, os quatro
 * liam igual na lista e no detalhe.
 *
 * O TIPO do dano fica em inglês, como todo dado de jogo — é a mesma decisão dos traços
 * (OPEN-DECISIONS #4). Quem traduz é a Etapa 15, e traduz tudo de uma vez.
 */
export function itemDamageText(entity: BrowseEntity, field: string): string {
  return damageOf(entity, field, false);
}

/**
 * O mesmo dano, ABREVIADO para a coluna: `1d8 S`, `1 Acid +1d6`.
 *
 * Três economias, e cada uma tem motivo:
 *
 *   a LETRA nos danos físicos       `Bludgeoning` são doze caracteres numa coluna que
 *                                   existe para ser varrida de relance. Só nos três
 *                                   físicos, que é onde a convenção do livro existe:
 *                                   `fire` continua `Fire`, porque `F` não diz nada.
 *   o `+` no lugar da palavra       `persistente` são onze caracteres que se repetem em
 *                                   toda linha que os tem; o sinal diz o mesmo.
 *   o tipo repetido some            `1 Acid +1d6` — quando o persistente é do MESMO tipo,
 *                                   repeti-lo é ruído. Quando difere (Blood Bomb corta e
 *                                   faz sangramento), ele é a informação e fica.
 *
 * O RESPINGO fica de fora da coluna e só aparece no detalhe: ele acompanha o grau da bomba
 * junto com o persistente, então não separa nada que o persistente já não separe — e
 * medido, sem ele o maior valor da coluna cai de 26 para 16 caracteres.
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

const D = strings.browse.damage;

function tipoEscrito(tipo: string, curto: boolean): string {
  if (tipo === '') return '';
  if (curto && FISICO[tipo] !== undefined) return FISICO[tipo];
  /* O tipo de dano por extenso passa pelos termos: "Fogo" no modo traduzido (Etapa 33). */
  return capitalizar(fieldText('damageType', tipo));
}

/** `1d8` + `slashing` → `1d8 S`. Sem tipo, só a fórmula. */
function parte(formula: string, tipo: string, curto: boolean): string {
  const escrito = tipoEscrito(tipo, curto);
  return escrito === '' ? formula : `${formula} ${escrito}`;
}

function damageOf(entity: BrowseEntity, field: string, curto: boolean): string {
  const base = entity.base;
  if (!isRecord(base)) return '';

  const partes: string[] = [];
  const dano = base[field];

  if (isRecord(dano)) {
    const formula = typeof dano['formula'] === 'string' ? dano['formula'] : '';
    const tipoDireto = typeof dano['type'] === 'string' ? dano['type'] : '';
    if (formula !== '') partes.push(parte(formula, tipoDireto, curto));

    const persistente = dano['persistent'];
    if (isRecord(persistente)) {
      const dele = typeof persistente['formula'] === 'string' ? persistente['formula'] : '';
      const tipo = typeof persistente['type'] === 'string' ? persistente['type'] : '';
      if (dele !== '') {
        const mostrar = curto && tipo === tipoDireto ? '' : tipo;
        partes.push(
          curto
            ? `+${parte(dele, mostrar, true)}`
            : `${parte(dele, mostrar, false)} ${D.persistent}`,
        );
      }
    }
  }

  /*
   * O respingo é campo IRMÃO, e não parte de `damage` — ele mora noutro caminho do
   * documento (ver a receita). A mesma leitura de irmão que `itemPriceText` faz com o lote.
   *
   * Só no detalhe: na coluna ele não separa nada que o persistente já não separe.
   */
  const respingo = Number(fieldValue(entity, 'splash'));
  if (!curto && Number.isFinite(respingo) && respingo > 0) {
    partes.push(`${String(respingo)} ${D.splash}`);
  }

  return curto ? partes.join(' ') : partes.join(', ');
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
