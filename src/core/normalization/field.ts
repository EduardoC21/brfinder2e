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

import { raw, text, type Decoder } from './decoders';

export type FieldSource = 'document' | 'language' | 'sector' | 'derived';

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

/**
 * O SETOR da entrada: a pasta raiz onde ela está, ou o carimbo do pack.
 *
 * É o eixo de setorização das doze telas — o que separa talento de classe de talento de
 * perícia, ação básica de ação de arquétipo. Medido no `pf2e-8.5.0`, a pasta cobre onde
 * mais importa: 6.284 talentos com 7 raízes e ZERO sem pasta; 574 ações com 20 raízes e
 * zero sem pasta; 1.994 magias com 4 raízes e zero sem pasta.
 *
 * Onde ela não cobre — `class-features` tem 778 de 874 sem pasta, `equipment` tem 5.706 de
 * 5.869 — quem responde é o `sector` declarado no pack (ver `PackSource`).
 *
 * A resolução, em ordem:
 *
 *   documento numa pasta conhecida   o nome da pasta RAIZ
 *   documento sem pasta              o carimbo do pack
 *   pack sem tabela de pastas        o carimbo do pack
 *   pasta órfã (id fora da tabela)   vazio — é defeito do dado, não organização ausente
 *
 * Sem argumento: não há caminho a escolher nem padrão a inventar. O caminho é sempre
 * `folder`, e o padrão vem do pack, que é quem sabe.
 */
export function fromSector(): Field<string> {
  return build<string>({
    source: 'sector',
    path: 'folder',
    decoder: text,
    isOptional: false,
    fallback: null,
    transform: null,
  });
}

/**
 * Um campo CALCULADO a partir do documento inteiro, e não de um caminho.
 *
 * ⚠️ Existe porque há resposta que nenhum campo sozinho dá. O caso que a exigiu: uma arma
 * é "corpo a corpo" quando `system.range` é nulo — mas uma poção também tem `range` nulo, e
 * chamá-la de corpo a corpo seria absurdo. A conta precisa de `type` E de `system.range`.
 *
 * NÃO marca cobertura de caminho nenhum, e é de propósito: quem calcula tem de ler campos
 * que a receita já projeta ou já ignora. Assim um campo derivado nunca esconde do relatório
 * um dado que ninguém olhou — que é a garantia da seção 5.1 do briefing.
 *
 * Use com parcimônia: `from()` diz de onde o dado vem só de olhar a declaração, e isto não.
 */
export function fromDocument<T>(compute: (document: unknown) => T): Field<T> {
  return build<T>({
    source: 'derived',
    path: '(derivado)',
    decoder: raw,
    isOptional: false,
    fallback: null,
    transform: (value) => compute(value),
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
