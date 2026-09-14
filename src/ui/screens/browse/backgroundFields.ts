import type { BrowseEntity } from '@core/browse/index';
import type { BoostsFormat } from '@core/browse/spec';
import { isRecord } from '@core/json';
import { strings } from '@i18n/index';
import { isTranslatedMode } from '@ui/text';

import { references, type Reference } from './referenceFields';

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
 * `str` → `Strength` no DETALHE; `For` na COLUNA.
 *
 * Por extenso, em inglês, no detalhe: é dado de JOGO, e dado de jogo fica em inglês até a
 * tradução (OPEN-DECISIONS #4); e é o vocabulário da tela de perícias, que mostra
 * `Strength` porque é o que a tabela do jornal escreve.
 *
 * Na coluna, a abreviação de três letras da ficha — For, Des, Con, Int, Sab, Car —, em
 * todo o projeto (decisão do autor, 26b): "Strength ou Dexterity" numa célula é largo
 * demais para o que diz, e a sigla é a forma que todo jogador lê na ficha.
 *
 * A ordem das chaves é a da ficha, e é ela que `boostsText` usa para ordenar o par.
 */
const ATTRIBUTE_NAME: Readonly<Record<string, string>> = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
};

const ATTRIBUTE_SHORT: Readonly<Record<string, string>> = {
  str: 'For',
  dex: 'Des',
  con: 'Con',
  int: 'Int',
  wis: 'Sab',
  cha: 'Car',
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

/** Um código desconhecido volta como veio, em vez de sumir. No modo traduzido, em português. */
export function attributeName(code: string): string {
  if (isTranslatedMode())
    return strings.browse.terms.attributes[code] ?? ATTRIBUTE_NAME[code] ?? code;
  return ATTRIBUTE_NAME[code] ?? code;
}

/** `Strength` → `Força` no modo traduzido; o que não é atributo volta como veio. */
export function attributeNameByName(name: string): string {
  if (!isTranslatedMode()) return name;
  const code = Object.keys(ATTRIBUTE_NAME).find((key) => ATTRIBUTE_NAME[key] === name);
  return code === undefined ? name : (strings.browse.terms.attributes[code] ?? name);
}

/** `str` → `For`; o desconhecido volta como veio. */
export function attributeShort(code: string): string {
  return ATTRIBUTE_SHORT[code] ?? code;
}

/**
 * O campo cujo valor é o NOME do atributo por extenso, e não o código: a perícia, que
 * vem da tabela do jornal escrita "Strength". Na coluna vira a sigla como os outros.
 */
export const ATTRIBUTE_NAME_FIELDS: ReadonlySet<string> = new Set(['attribute']);

/** `Strength` → `For`; o que não é atributo volta como veio. */
export function attributeShortByName(name: string): string {
  const code = Object.keys(ATTRIBUTE_NAME).find((key) => ATTRIBUTE_NAME[key] === name);
  return code === undefined ? name : attributeShort(code);
}

/** Um atributo que a subclasse abre, com as habilidades que o abrem. */
export interface KeyAlternative {
  readonly ability: string;
  readonly features: readonly Reference[];
}

/** `[{ability, features}]` do campo de alternativas, tolerando o que não tiver a forma. */
export function keyAlternatives(entity: BrowseEntity, field: string): readonly KeyAlternative[] {
  const base = entity.base;
  if (!isRecord(base) || !Array.isArray(base[field])) return [];
  return (base[field] as unknown[]).flatMap((item) =>
    isRecord(item) && typeof item['ability'] === 'string'
      ? [{ ability: item['ability'], features: references({ ...entity, base: item }, 'features') }]
      : [],
  );
}

const b = strings.browse.background;

/**
 * `['dex','str']` → `Strength ou Dexterity` (`For ou Des` com `short`). Lista vazia → `Livre`.
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
export function boostsText(
  entity: BrowseEntity,
  field: string,
  format: BoostsFormat,
  short = false,
): string {
  const base = entity.base;
  if (!isRecord(base)) return '';
  const valor = base[field];
  if (!Array.isArray(valor)) return '';
  const nome = short ? attributeShort : attributeName;

  const codigos = valor.filter((item): item is string => typeof item === 'string');
  /*
   * O que a SUBCLASSE abre (a classe): com a lista principal vazia, as opções são a
   * resposta — o psíquico é "Int ou Car"; com a lista cheia, é "Des ou outro" — o ladino
   * é Destreza, e o "outro" depende da facção, que o detalhe nomeia.
   */
  const alternativas =
    format.alternatives === undefined ? [] : keyAlternatives(entity, format.alternatives);
  if (codigos.length === 0 && alternativas.length > 0) {
    return alternativas.map((a) => nome(a.ability)).join(` ${b.or} `);
  }
  // Vazio é "Livre" só onde a fonte diz isso (antecedente); na divindade é ausência.
  if (codigos.length === 0) return format.free === true ? b.freeBoost : '';

  /*
   * TODOS ganhos, na ordem da fonte — que é a do livro: "Constitution, Wisdom, Free". O
   * `free` aqui é código na lista (a ancestralidade tem um slot livre ao lado dos fixos),
   * e não a lista vazia do antecedente.
   */
  if (format.all === true) {
    return codigos.map((c) => (c === 'free' ? b.freeBoost : nome(c))).join(', ');
  }

  const principal = [...codigos]
    .sort((x, y) => ATTRIBUTE_ORDER.indexOf(x) - ATTRIBUTE_ORDER.indexOf(y))
    .map(nome)
    .join(` ${b.or} `);
  return alternativas.length > 0 ? `${principal} ${b.or} ${b.other}` : principal;
}
