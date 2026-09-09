import type { BrowseEntity } from '@core/browse/index';
import { isRecord } from '@core/json';
import { strings } from '@i18n/index';

/**
 * Os dois campos de antecedente que viram frase.
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
 * Nomeado, e não a string solta em dois arquivos: o rótulo do filtro e o texto da coluna
 * precisam concordar, e foi a divergência entre eles que fez o filtro escrever `Str`
 * enquanto a coluna escrevia `Strength`. Mesmo padrão de `BOOK_FIELD`.
 */
export const ATTRIBUTE_FIELD = 'boosts';

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
 * Vazio é `Livre`, e não nada: 9 dos 520 dão aumento livre, e isso é uma resposta.
 */
export function boostsText(entity: BrowseEntity, field: string): string {
  const base = entity.base;
  if (!isRecord(base)) return '';
  const valor = base[field];
  if (!Array.isArray(valor)) return '';

  const codigos = valor.filter((item): item is string => typeof item === 'string');
  if (codigos.length === 0) return b.freeBoost;

  return [...codigos]
    .sort((x, y) => ATTRIBUTE_ORDER.indexOf(x) - ATTRIBUTE_ORDER.indexOf(y))
    .map(attributeName)
    .join(` ${b.or} `);
}

/** Uma referência `@UUID` guardada num campo de lista. Ver a receita de antecedente. */
export interface Reference {
  readonly uuid: string;
  readonly name: string;
}

/**
 * As referências de um campo, já limpas.
 *
 * Uma definição só, usada pela coluna (que escreve os nomes) e pelo detalhe (que os
 * transforma em botões). Entrada sem nome cai fora: sem nome não há o que desenhar.
 */
export function references(entity: BrowseEntity, field: string): readonly Reference[] {
  const base = entity.base;
  if (!isRecord(base)) return [];
  const lista = base[field];
  if (!Array.isArray(lista)) return [];
  return lista
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .map((item) => ({
      uuid: typeof item['uuid'] === 'string' ? item['uuid'] : '',
      name: typeof item['name'] === 'string' ? item['name'] : '',
    }))
    .filter((item) => item.name !== '');
}

/** Os nomes, para a COLUNA — onde referência é texto e não botão. */
export function referenceNames(entity: BrowseEntity, field: string): string {
  return references(entity, field)
    .map((item) => item.name)
    .join(', ');
}
