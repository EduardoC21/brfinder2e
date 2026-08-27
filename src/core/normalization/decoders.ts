/**
 * Decodificadores: transformam `unknown` em um tipo, ou falham dizendo onde.
 *
 * Decidido na Etapa 2: o decodificador é **obrigatório** em todo `from()`. O JSON do
 * Foundry chega sem tipo nenhum, e tratar campo não validado como string foi o erro das
 * duas tentativas anteriores (briefing 3.4).
 *
 * Cada decodificador também declara sua COBERTURA — quais caminhos ele consumiu. É isso
 * que alimenta o relatório de não mapeados. Ver `paths.ts`, `Coverage`.
 */

import type { Coverage } from './paths';

export class DecodeError extends Error {
  readonly path: string;

  constructor(path: string, expected: string, got: unknown) {
    super(`${path}: esperado ${expected}, recebido ${describe(got)}`);
    this.name = 'DecodeError';
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
    case 'undefined':
      return 'ausente';
    case 'object':
      return `object{${Object.keys(value).slice(0, 6).join(',')}}`;
    default:
      return typeof value;
  }
}

export interface Decoder<T> {
  /** Nome legível, usado em mensagem de erro e no relatório. */
  readonly label: string;
  decode(value: unknown, path: string): T;
  /** Registra em `coverage` o que este decodificador consumiu a partir de `path`. */
  cover(value: unknown, path: string, coverage: Coverage): void;
}

/** Decodificador de folha: consome o valor inteiro naquele caminho. */
function leaf<T>(label: string, decode: (value: unknown, path: string) => T): Decoder<T> {
  return {
    label,
    decode,
    cover(_value, path, coverage) {
      coverage.subtree.add(path);
    },
  };
}

export const text: Decoder<string> = leaf('texto', (value, path) => {
  if (typeof value !== 'string') throw new DecodeError(path, 'texto', value);
  return value;
});

/**
 * HTML cru, **nunca modificado**. Briefing 7.6: a string original é a camada 1 de três, e
 * o invariante de ida e volta depende de ela não ser tocada.
 */
export const html: Decoder<string> = leaf('html', (value, path) => {
  if (typeof value !== 'string') throw new DecodeError(path, 'html (texto)', value);
  return value;
});

export const bool: Decoder<boolean> = leaf('booleano', (value, path) => {
  if (typeof value !== 'boolean') throw new DecodeError(path, 'booleano', value);
  return value;
});

export const int: Decoder<number> = leaf('inteiro', (value, path) => {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new DecodeError(path, 'inteiro', value);
  }
  return value;
});

export const decimal: Decoder<number> = leaf('número', (value, path) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new DecodeError(path, 'número', value);
  }
  return value;
});

export const textList: Decoder<readonly string[]> = leaf('lista de texto', (value, path) => {
  if (!Array.isArray(value)) throw new DecodeError(path, 'lista de texto', value);
  return value.map((item, index) => {
    if (typeof item !== 'string') throw new DecodeError(`${path}[${String(index)}]`, 'texto', item);
    return item;
  });
});

/**
 * Escape hatch: consome a subárvore sem inspecionar.
 *
 * Use com parcimônia e só quando o valor for guardado inteiro de propósito. Ele apaga o
 * caminho do relatório, que é justamente a proteção que não queremos perder.
 */
export const raw: Decoder<unknown> = leaf('cru', (value) => value);

/** Aceita `null` além do tipo interno. `null` é comum no Foundry (ex.: `system.group`). */
export function nullable<T>(inner: Decoder<T>): Decoder<T | null> {
  return {
    label: `${inner.label} ou nulo`,
    decode: (value, path) => (value === null ? null : inner.decode(value, path)),
    cover: (value, path, coverage) => {
      if (value === null) coverage.subtree.add(path);
      else inner.cover(value, path, coverage);
    },
  };
}

/**
 * Objeto com chaves declaradas.
 *
 * Cobre SÓ as chaves declaradas: chave nova dentro do objeto continua aparecendo no
 * relatório de não mapeados. É de propósito.
 */
export function shape<T extends Record<string, Decoder<unknown>>>(
  fields: T,
): Decoder<{ [K in keyof T]: T[K] extends Decoder<infer U> ? U : never }> {
  const keys = Object.keys(fields);
  return {
    label: `objeto{${keys.join(',')}}`,
    decode(value, path) {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new DecodeError(path, `objeto{${keys.join(',')}}`, value);
      }
      const record = value as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      for (const key of keys) {
        const decoder = fields[key];
        if (!decoder) continue;
        out[key] = decoder.decode(record[key], `${path}.${key}`);
      }
      return out as { [K in keyof T]: T[K] extends Decoder<infer U> ? U : never };
    },
    cover(value, path, coverage) {
      coverage.exact.add(path);
      if (typeof value !== 'object' || value === null || Array.isArray(value)) return;
      const record = value as Record<string, unknown>;
      for (const key of keys) {
        fields[key]?.cover(record[key], `${path}.${key}`, coverage);
      }
    },
  };
}

/** Lista de qualquer coisa. Cobre `path[]` com o decodificador interno. */
export function listOf<T>(inner: Decoder<T>): Decoder<readonly T[]> {
  return {
    label: `lista de ${inner.label}`,
    decode(value, path) {
      if (!Array.isArray(value)) throw new DecodeError(path, `lista de ${inner.label}`, value);
      return value.map((item, index) => inner.decode(item, `${path}[${String(index)}]`));
    },
    cover(value, path, coverage) {
      coverage.exact.add(path);
      if (!Array.isArray(value)) return;
      for (const item of value) inner.cover(item, `${path}[]`, coverage);
    },
  };
}

/** O resultado de `oneOf`: qual forma casou, e o valor já decodificado. */
export interface Variant<T> {
  readonly variant: string;
  readonly value: T;
}

/**
 * Campo com formas alternativas.
 *
 * O caso que motiva isto está no briefing 7.8: `ChoiceSet` tem CINCO formas de `choices`
 * em 641 ocorrências. Forma não reconhecida vira erro com o valor real na mensagem — o
 * que impede uma sexta forma aparecer numa versão futura e passar batido.
 */
export function oneOf<T extends Record<string, Decoder<unknown>>>(
  variants: T,
): Decoder<Variant<T[keyof T] extends Decoder<infer U> ? U : never>> {
  const names = Object.keys(variants);
  return {
    label: `uma de {${names.join('|')}}`,
    decode(value, path) {
      for (const name of names) {
        const decoder = variants[name];
        if (!decoder) continue;
        try {
          return {
            variant: name,
            value: decoder.decode(value, path) as T[keyof T] extends Decoder<infer U> ? U : never,
          };
        } catch {
          // Forma não casou; tenta a próxima.
        }
      }
      throw new DecodeError(path, `uma de {${names.join('|')}}`, value);
    },
    cover(value, path, coverage) {
      for (const name of names) {
        const decoder = variants[name];
        if (!decoder) continue;
        try {
          decoder.decode(value, path);
          decoder.cover(value, path, coverage);
          return;
        } catch {
          // segue
        }
      }
      // Nenhuma forma casou: não cobre nada, e o erro já foi reportado em decode().
    },
  };
}

/** Aplica uma função depois de decodificar. A cobertura é a do decodificador interno. */
export function mapped<A, B>(inner: Decoder<A>, transform: (value: A) => B): Decoder<B> {
  return {
    label: inner.label,
    decode: (value, path) => transform(inner.decode(value, path)),
    cover: (value, path, coverage) => {
      inner.cover(value, path, coverage);
    },
  };
}
