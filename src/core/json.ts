/**
 * Leitura defensiva de JSON desconhecido.
 *
 * Tudo que chega da rede é `unknown`. As regras de lint `no-unsafe-*` proíbem tratar
 * isso como string sem checar — e é proposital: o briefing (seção 3.4) diz que os erros
 * das tentativas anteriores vieram de acreditar na documentação em vez de olhar o dado.
 *
 * Cada função aqui recebe o caminho do campo e o usa na mensagem de erro. Assim a falha
 * diz "packs[3].path: esperado string, recebido number", não "cannot read property".
 */

export type JsonRecord = Readonly<Record<string, unknown>>;

/** Erro de formato: o JSON veio, mas não tem a forma que esperávamos. */
export class JsonShapeError extends Error {
  readonly path: string;

  constructor(path: string, expected: string, got: unknown) {
    super(`${path}: esperado ${expected}, recebido ${describe(got)}`);
    this.name = 'JsonShapeError';
    this.path = path;
  }
}

function describe(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return `array(${String(value.length)})`;
  switch (typeof value) {
    case 'string':
      return `string(${JSON.stringify(value.slice(0, 40))})`;
    case 'number':
      return `number(${String(value)})`;
    case 'boolean':
      return `boolean(${String(value)})`;
    case 'bigint':
      return `bigint(${value.toString()})`;
    case 'symbol':
      return `symbol(${value.toString()})`;
    case 'undefined':
      return 'undefined';
    case 'function':
      return 'function';
    default:
      return 'object';
  }
}

export function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function asRecord(value: unknown, path: string): JsonRecord {
  if (!isRecord(value)) throw new JsonShapeError(path, 'object', value);
  return value;
}

export function asArray(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new JsonShapeError(path, 'array', value);
  return value as readonly unknown[];
}

export function asString(value: unknown, path: string): string {
  if (typeof value !== 'string') throw new JsonShapeError(path, 'string', value);
  return value;
}

export function asNumber(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new JsonShapeError(path, 'number', value);
  }
  return value;
}

/** Lê um campo de um record. Devolve `undefined` se ausente — quem chama decide. */
export function field(record: JsonRecord, key: string): unknown {
  return record[key];
}

/** Lê um campo obrigatório e valida que é string. */
export function stringField(record: JsonRecord, key: string, path: string): string {
  return asString(record[key], `${path}.${key}`);
}

/** Lê um campo obrigatório e valida que é número. */
export function numberField(record: JsonRecord, key: string, path: string): number {
  return asNumber(record[key], `${path}.${key}`);
}
