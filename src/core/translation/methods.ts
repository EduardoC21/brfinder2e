/**
 * AS FORMAS DE TRADUÇÃO, e a hierarquia entre elas (Etapa 30, pelo autor).
 *
 * O texto do jogo está em inglês e a tradução é SOB DEMANDA: por entrada, quando a
 * pessoa pede. Há mais de um jeito de obter uma tradução, e eles não valem o mesmo — a
 * que a pessoa escreveu à mão vale mais que a de um modelo, e a de um modelo bom vale
 * mais que a de um modelo fraco. Por isso as formas são uma LISTA ORDENADA nas
 * preferências: ao traduzir, a primeira que estiver disponível responde; ao mostrar, a
 * tradução gravada de uma forma mais alta na lista sobrescreve a de uma mais baixa.
 *
 * O que cada forma é, e o que ela pede num app que é um EXECUTÁVEL (Tauri) e funciona
 * sem internet depois de sincronizado:
 *
 *   manual      o que a pessoa escreveu ou corrigiu. Sempre disponível; nunca é
 *               sobrescrita por outra forma. É a única que vale para a ficha exportada.
 *   community   o pacote da comunidade — a tradução pt-BR do sistema pf2e para o Foundry
 *               (mclemente/fvtt-ptbr-pf2e-translation). Desde a versão 3.3.0 ela traduz
 *               só a INTERFACE e os TERMOS (nomes e descrições de traços, perícias,
 *               ações do sistema): a tradução dos compêndios foi abandonada. Vale como
 *               glossário; não traduz prosa. Baixado na sincronização, como o zip — é
 *               conteúdo de terceiros, nunca embutido.
 *   llm         um modelo de linguagem por API (a chave é da pessoa, guardada no cofre do
 *               sistema, nunca em `prefs/`). Melhor prosa; precisa de internet e custa.
 *   local       um modelo de tradução que roda dentro do app, sem internet — o motor do
 *               Firefox (Bergamot, WASM) com o par en→pt, uns 20 MB baixados uma vez.
 *               Qualidade de tradutor automático: serve para ler, não para publicar.
 *
 * Nenhuma delas existe ainda além do contrato: esta etapa é o esqueleto — a preferência,
 * a camada de armazenamento e o lugar de cada provedor. `Preferences.translation.methods`
 * é a lista ligada, na ordem; o que não está nela está desligado.
 */

export type TranslationMethodId = 'manual' | 'community' | 'llm' | 'local';

export interface TranslationMethod {
  readonly id: TranslationMethodId;
  /** Traduz PROSA (descrições) ou só TERMOS (nomes, traços, rótulos)? */
  readonly scope: 'prose' | 'terms';
  /** Precisa de internet na hora de traduzir. */
  readonly online: boolean;
}

/** As formas, na ordem padrão da hierarquia — a que vale mais primeiro. */
export const TRANSLATION_METHODS: readonly TranslationMethod[] = [
  { id: 'manual', scope: 'prose', online: false },
  { id: 'community', scope: 'terms', online: false },
  { id: 'llm', scope: 'prose', online: true },
  { id: 'local', scope: 'prose', online: false },
];

export const DEFAULT_METHOD_ORDER: readonly TranslationMethodId[] = TRANSLATION_METHODS.map(
  (method) => method.id,
);

/** As línguas que o app sabe pedir. Só pt-BR tem caminho hoje; as outras entram pelo mesmo contrato. */
export const TRANSLATION_LANGUAGES: readonly string[] = ['pt-BR'];

export function isTranslationMethodId(value: unknown): value is TranslationMethodId {
  return TRANSLATION_METHODS.some((method) => method.id === value);
}

/**
 * O contrato de um provedor. `availability` responde ANTES de traduzir — é o que as
 * configurações mostram ao lado de cada forma ("sem chave", "modelo não baixado") — e
 * `translate` recebe o HTML original e devolve o HTML traduzido, preservando as marcas
 * `@UUID`/`@Embed`/`@Damage` do Foundry, que nunca se traduzem.
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
