/**
 * AS FORMAS DE TRADUÇÃO (Etapa 30; enxugadas na Etapa 42, pelo autor: "só o modelo de
 * linguagem").
 *
 * O texto do jogo está em inglês e a tradução é SOB DEMANDA: por entrada, quando a
 * pessoa pede. Hoje há UMA forma que traduz prosa e uma que vale mais que ela:
 *
 *   manual   o que a pessoa escreveu ou corrigiu. Nunca é sobrescrita por outra forma. É
 *            a única que vale para a ficha exportada. (A edição ainda não existe; a regra
 *            já vale na gravação.)
 *   llm      um modelo de linguagem por API — BYOK: a chave é da pessoa, guardada em
 *            `platform/secrets.ts`, nunca em `prefs/`. O glossário entra no prompt e na
 *            blindagem. Precisa de internet; o Gemini tem nível gratuito.
 *   shared   a tradução de máquina de OUTRA pessoa, aceita da central (Etapa 55). Não é
 *            protegida como a manual: "↻ Traduzir" a sobrescreve.
 *
 * O que já foi forma e deixou de ser: o PACOTE DA COMUNIDADE (Etapa 31) é glossário e
 * nomes — alimenta a blindagem, o prompt e a tela — e não traduz prosa: virou
 * infraestrutura, com o próprio bloco nas configurações. O MODELO LOCAL (Bergamot,
 * Etapas 34–38) foi medido contra o modelo de linguagem na 40 e saiu na 42: qualidade de
 * tradutor automático, e o offline deixou de importar.
 *
 * Os ids antigos (`community`, `local`) continuam VÁLIDOS numa tradução gravada: o
 * registro diz de onde veio, e uma tradução feita pelo motor local ainda se lê até ser
 * refeita.
 */

export type TranslationMethodId = 'manual' | 'llm' | 'shared' | 'community' | 'local';

/** `shared` (Etapa 55): a tradução ACEITA da central — de máquina, feita por outra pessoa. */
const IDS: ReadonlySet<string> = new Set(['manual', 'llm', 'shared', 'community', 'local']);

/** As línguas que o app sabe pedir. Só pt-BR tem caminho hoje; as outras entram pelo mesmo contrato. */
export const TRANSLATION_LANGUAGES: readonly string[] = ['pt-BR'];

export function isTranslationMethodId(value: unknown): value is TranslationMethodId {
  return typeof value === 'string' && IDS.has(value);
}

/**
 * O contrato de um provedor. `availability` responde ANTES de traduzir — é o que as
 * configurações mostram ("sem chave") — e `translate` recebe o HTML original e devolve o
 * HTML traduzido, preservando as marcas `@UUID`/`@Embed`/`@Damage` do Foundry, que nunca
 * se traduzem (é a blindagem que garante).
 */
export type ProviderAvailability =
  | { readonly kind: 'ready' }
  | { readonly kind: 'needs-setup'; readonly what: string }
  | { readonly kind: 'unavailable'; readonly why: string };

export interface TranslationRequest {
  readonly language: string;
  readonly entityType: string;
  readonly key: string;
  /** O campo de `desc/` — `main`, `page`… */
  readonly field: string;
  readonly html: string;
}

export interface TranslationProvider {
  readonly id: TranslationMethodId;
  availability(language: string): Promise<ProviderAvailability>;
  translate(request: TranslationRequest): Promise<string>;
}
