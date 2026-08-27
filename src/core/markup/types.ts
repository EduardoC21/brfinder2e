/**
 * Os tokens da marcação do Foundry — briefing, seção 7.6.
 *
 * TODO token guarda o `raw` dele, e o invariante que sustenta a camada inteira é:
 *
 *     join(tokens.map((t) => t.raw)) === texto original
 *
 * Ele é testado sobre a base inteira. Enquanto valer, nada se perde no caminho: o texto
 * original pode ser reconstruído a partir dos tokens, byte a byte.
 *
 * São três camadas, nunca duas (7.6):
 *
 *   1. `raw`     a string original, NUNCA modificada
 *   2. `tokens`  este parse, cada token com o raw dele
 *   3. `render`  o texto de leitura — Etapa 8, quando a tela de detalhe existir
 */

export interface TokenBase {
  /** O trecho exato do texto original que virou este token. */
  readonly raw: string;
}

/** Texto comum, incluindo o HTML. Não é marcação do Foundry. */
export interface TextToken extends TokenBase {
  readonly kind: 'text';
}

/**
 * Referência a outra entrada — 25.836 na base, a marcação mais comum de longe.
 *
 * ⚠️ Briefing 7.8: 3.477 apontam por NOME e só 311 por id. Resolver a referência é
 * assunto do índice, não do analisador; aqui fica o alvo como veio.
 */
export interface UuidToken extends TokenBase {
  readonly kind: 'uuid';
  /** `Compendium.pf2e.conditionitems.Item.TBSHQ…`, ou uma referência por nome. */
  readonly target: string;
  /** O `{Dazzled}` depois do colchete. Ausente quando não há. */
  readonly label: string | null;
}

/** Uma das marcações que levam um corpo entre colchetes e um rótulo opcional. */
export interface BodyToken extends TokenBase {
  readonly kind: 'check' | 'damage' | 'template' | 'localize' | 'embed';
  /** O conteúdo entre colchetes, cru. Separar os parâmetros é assunto da Etapa 8. */
  readonly body: string;
  readonly label: string | null;
}

/** `[[/r 2d6[fire]]]`, `[[/act trip]]`, `[[/gmr …]]`, `[[/br …]]`. */
export interface RollToken extends TokenBase {
  readonly kind: 'roll';
  /** `r`, `act`, `gmr` ou `br`. */
  readonly command: string;
  readonly body: string;
  readonly label: string | null;
}

/**
 * Marcação com a FORMA de token e um nome que não conhecemos.
 *
 * O briefing manda o desconhecido "cair em text e aparecer cru" — melhor feio na tela que
 * perdido. Um tipo próprio faz exatamente isso na hora de desenhar, e ainda permite
 * CONTAR: uma sintaxe nova numa versão futura do Foundry aparece no relatório em vez de
 * se esconder no meio do texto.
 */
export interface UnknownToken extends TokenBase {
  readonly kind: 'unknown';
  /** `@Foo` ou `[[/foo`, o que abriu o token. */
  readonly opener: string;
}

export type Token = TextToken | UuidToken | BodyToken | RollToken | UnknownToken;

/** Os tokens que a tela de detalhe destaca como referência cruzada (briefing 7.6). */
export const CROSS_REFERENCE_KINDS = ['uuid', 'damage', 'check', 'template'] as const;
