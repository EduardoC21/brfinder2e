/**
 * Caminhos dentro de um documento, e o inventário de tudo que existe nele.
 *
 * É a base da garantia da seção 5.1 do briefing: o motor anota todo caminho que leu, e a
 * diferença entre o que o documento tem e o que a receita leu vira o relatório de não
 * mapeados. Sem um inventário confiável, essa diferença não existe.
 *
 * Notação: `system.value.isValued` para objetos, `system.rules[].key` para dentro de
 * array. O `[]` é literal e faz parte do segmento.
 */

import { isRecord } from '../json';

export interface PathRead {
  /** `false` quando a chave não existe. Diferente de existir valendo `null`. */
  readonly found: boolean;
  readonly value: unknown;
}

const NOT_FOUND: PathRead = { found: false, value: undefined };

export function splitPath(path: string): string[] {
  return path.split('.');
}

/** Lê um caminho de ponto. Não entra em array — para isso existe o decodificador `listOf`. */
export function readPath(root: unknown, path: string): PathRead {
  let current: unknown = root;
  for (const segment of splitPath(path)) {
    if (!isRecord(current)) return NOT_FOUND;
    if (!Object.hasOwn(current, segment)) return NOT_FOUND;
    current = current[segment];
  }
  return { found: true, value: current };
}

/**
 * Todo caminho-folha do documento, com um valor de exemplo.
 *
 * Percorre TODOS os elementos de cada array, não só o primeiro. É o que faz aparecer a
 * chave rara que só existe em 3 dos 6.283 talentos — exatamente o caso do
 * `system.subfeatures`, que o briefing (5.1) conta que quase ficou de fora.
 */
export function collectPaths(
  document: unknown,
  into = new Map<string, unknown>(),
): Map<string, unknown> {
  walk(document, '', into);
  return into;
}

function walk(value: unknown, prefix: string, into: Map<string, unknown>): void {
  if (Array.isArray(value)) {
    // O caminho do array é registrado SEMPRE, cheio ou vazio.
    //
    // Sem isto a frequência mente: um campo presente em 43 documentos aparecia como
    // "35/43" (os vazios) mais "35/43[]" (os cheios), e a leitura óbvia — "falta em 8" —
    // era falsa. Achado ao usar o relatório pela primeira vez, nas 43 condições.
    remember(into, prefix, value);
    for (const item of value) walk(item, `${prefix}[]`, into);
    return;
  }

  if (isRecord(value)) {
    const keys = Object.keys(value);
    if (keys.length === 0) {
      remember(into, prefix, value);
      return;
    }
    for (const key of keys) {
      walk(value[key], prefix === '' ? key : `${prefix}.${key}`, into);
    }
    return;
  }

  remember(into, prefix, value);
}

function remember(into: Map<string, unknown>, path: string, value: unknown): void {
  if (path === '') return;
  const existing = into.get(path);
  // Guarda o primeiro exemplo, mas troca um vazio por um preenchido: `[]` não ensina nada.
  if (existing === undefined || (isEmptyContainer(existing) && !isEmptyContainer(value))) {
    into.set(path, value);
  }
}

function isEmptyContainer(value: unknown): boolean {
  if (Array.isArray(value)) return value.length === 0;
  return isRecord(value) && Object.keys(value).length === 0;
}

/**
 * Cobertura: o que a receita leu, ignorou ou adiou.
 *
 * Dois conjuntos, e a diferença entre eles é o coração do relatório:
 *
 * - `subtree` — o caminho e TUDO abaixo dele estão cobertos. É o que um decodificador de
 *   folha (`text`, `bool`, `textList`) faz: consome o valor inteiro.
 * - `exact` — só aquele caminho. É o que `shape` faz: ele declara as chaves que conhece,
 *   então uma chave nova dentro do objeto continua aparecendo como não mapeada.
 *
 * Essa distinção é o que impede `shape({ license, title })` sobre `system.publication`
 * de esconder `system.publication.remaster` — que é falso em 5.872 entidades (7.8).
 */
export interface Coverage {
  readonly exact: Set<string>;
  readonly subtree: Set<string>;
}

export function emptyCoverage(): Coverage {
  return { exact: new Set(), subtree: new Set() };
}

/** Remove o `[]` de cada segmento, para `a.b` cobrir `a.b[].c`. */
function normalize(segment: string): string {
  return segment.endsWith('[]') ? segment.slice(0, -2) : segment;
}

export function isCovered(path: string, coverage: Coverage): boolean {
  if (coverage.exact.has(path) || coverage.subtree.has(path)) return true;

  const segments = splitPath(path).map(normalize);
  let prefix = '';
  for (const segment of segments) {
    prefix = prefix === '' ? segment : `${prefix}.${segment}`;
    if (coverage.subtree.has(prefix)) return true;
  }
  return false;
}
