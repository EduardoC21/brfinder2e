import type { BrowseEntity } from '@core/browse/index';
import { isRecord } from '@core/json';
import { strings } from '@i18n/index';

/**
 * O aumento de atributo, que antecedente e divindade escrevem do mesmo jeito.
 *
 * Mesma razão de `itemFields` e `spellFields`: a lista e o detalhe desenham os mesmos
 * valores, e uma segunda cópia divergiria no primeiro ajuste.
 *
 * Arquivo `.ts` e sem componente nenhum: um módulo que exporta componente E função quebra
 * o recarregamento a quente do Vite.
 */

/**
 * `str` → `Strength`.
 *
 * O nome por extenso, em INGLÊS, e não a abreviação em português. Duas razões:
 *
 *   é dado de JOGO, e dado de jogo fica em inglês até a Etapa 15 (OPEN-DECISIONS #4);
 *   é o MESMO vocabulário da tela de perícias, que mostra `Strength` porque é o que a
 *   tabela do jornal escreve. Duas telas dizendo `For` e `Strength` para a mesma coisa
 *   fariam a pessoa duvidar de que é a mesma coisa.
 *
 * A ordem das chaves é a da ficha — For, Des, Con, Int, Sab, Car —, e é ela que
 * `boostsText` usa para ordenar o par.
 */
const ATTRIBUTE_NAME: Readonly<Record<string, string>> = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
};

const ATTRIBUTE_ORDER: readonly string[] = Object.keys(ATTRIBUTE_NAME);

/**
 * O campo cujos valores são CÓDIGOS de atributo.
 *
 * Nomeados, e não a string solta em dois arquivos: o rótulo do filtro e o texto da coluna
 * precisam concordar, e foi a divergência entre eles que fez o filtro escrever `Str`
 * enquanto a coluna escrevia `Strength`. Mesmo padrão de `BOOK_FIELD`. Dois campos: o
 * aumento do antecedente e o atributo divino, que a fonte escreve com os mesmos códigos.
 */
export const ATTRIBUTE_FIELDS: ReadonlySet<string> = new Set(['boosts', 'divineAttribute']);

/** Um código desconhecido volta como veio, em vez de sumir. */
export function attributeName(code: string): string {
  return ATTRIBUTE_NAME[code] ?? code;
}

const b = strings.browse.background;

/**
 * `['dex','str']` → `Strength ou Dexterity`. Lista vazia → `Livre`.
 *
 * O `ou` é a informação: são duas opções entre as quais se escolhe UMA, e não duas coisas
 * que se ganham. Um `chips` desenharia as duas lado a lado, que se lê como "ganha as duas".
 *
 * A ordem é a da FICHA e não a do dado: a fonte guarda `['dex','str']` em ordem alfabética
 * do código, e o livro escreve "Strength or Dexterity". Ordenar aqui faz a linha bater com
 * o texto da descrição logo abaixo dela.
 *
 * Vazio é `Livre` quando `free` diz que é: 9 dos 520 antecedentes dão aumento livre, e
 * isso é uma resposta. Na divindade o vazio é ausência (7 filosofias), e a linha some.
 */
export function boostsText(entity: BrowseEntity, field: string, free = false): string {
  const base = entity.base;
  if (!isRecord(base)) return '';
  const valor = base[field];
  if (!Array.isArray(valor)) return '';

  const codigos = valor.filter((item): item is string => typeof item === 'string');
  // Vazio é "Livre" só onde a fonte diz isso (antecedente); na divindade é ausência.
  if (codigos.length === 0) return free ? b.freeBoost : '';

  return [...codigos]
    .sort((x, y) => ATTRIBUTE_ORDER.indexOf(x) - ATTRIBUTE_ORDER.indexOf(y))
    .map(attributeName)
    .join(` ${b.or} `);
}
