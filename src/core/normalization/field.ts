/**
 * `from(...)` e `fromLang(...)` — a declaração de um campo da receita.
 *
 * O construtor devolve um objeto imutável; cada modificador (`.optional()`,
 * `.withDefault()`, `.map()`) devolve uma cópia nova. Assim uma declaração nunca muda
 * embaixo de outra.
 *
 * `.withDefault()` e não `.default()`: `default` é palavra reservada e, embora funcione
 * como nome de método, atrapalha ferramenta e leitura.
 */

import type { Decoder } from './decoders';

export type FieldSource = 'document' | 'language';

export interface Field<T> {
  readonly source: FieldSource;
  /** Caminho no documento, ou modelo de chave da tabela de idioma. */
  readonly path: string;
  readonly decoder: Decoder<unknown>;
  /** Ausente vira `undefined` em vez de falhar. */
  readonly isOptional: boolean;
  /** Ausente vira este valor. Exclusivo com `isOptional`. */
  readonly fallback: { readonly value: unknown } | null;
  readonly transform: ((value: unknown) => unknown) | null;

  optional(): Field<T | undefined>;
  withDefault(value: T): Field<T>;
  map<U>(transform: (value: T) => U): Field<U>;
}

function build<T>(base: Omit<Field<T>, 'optional' | 'withDefault' | 'map'>): Field<T> {
  return {
    ...base,
    optional(): Field<T | undefined> {
      return build<T | undefined>({ ...base, isOptional: true, fallback: null });
    },
    withDefault(value: T): Field<T> {
      return build<T>({ ...base, isOptional: false, fallback: { value } });
    },
    map<U>(transform: (value: T) => U): Field<U> {
      const previous = base.transform;
      return build<U>({
        ...base,
        transform: (value) => transform((previous ? previous(value) : value) as T),
      });
    },
  };
}

/** Lê um caminho do documento do Foundry. */
export function from<T>(path: string, decoder: Decoder<T>): Field<T> {
  return build<T>({
    source: 'document',
    path,
    decoder,
    isOptional: false,
    fallback: null,
    transform: null,
  });
}

/**
 * Lê uma chave da tabela de idioma fundida (os quatro arquivos do briefing 7.7).
 *
 * O modelo aceita `{caminho.no.documento}`, resolvido antes da busca:
 *
 *   fromLang('PF2E.condition.{system.slug}.summary', text)
 *
 * Existe porque há conteúdo que só mora ali: `summary` está em 42 das 43 condições e não
 * existe em nenhum pack. Decidido na Etapa 2 — ver OPEN-DECISIONS, item 3.
 */
export function fromLang<T>(keyTemplate: string, decoder: Decoder<T>): Field<T> {
  return build<T>({
    source: 'language',
    path: keyTemplate,
    decoder,
    isOptional: false,
    fallback: null,
    transform: null,
  });
}

const PLACEHOLDER = /\{([^{}]+)\}/g;

/** Lista os caminhos do documento citados num modelo de chave de idioma. */
export function templatePlaceholders(template: string): string[] {
  return [...template.matchAll(PLACEHOLDER)].map(([, path]) => path ?? '');
}

/**
 * Troca `{caminho}` pelo valor lido do documento. Devolve `null` se algum não resolver.
 *
 * Resolve todos os marcadores ANTES de substituir, em vez de resolver dentro do callback
 * do `replace`. O resultado é o mesmo, mas sem a variável de controle que o compilador
 * não consegue acompanhar através da closure.
 */
export function resolveTemplate(
  template: string,
  read: (path: string) => string | null,
): string | null {
  const resolved = new Map<string, string>();
  for (const path of templatePlaceholders(template)) {
    const value = read(path);
    if (value === null) return null;
    resolved.set(path, value);
  }
  return template.replace(PLACEHOLDER, (_match, path: string) => resolved.get(path) ?? '');
}
