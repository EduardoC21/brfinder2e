/**
 * Expansão de `@Localize[chave]`.
 *
 * `@Localize` não é uma referência a outra entrada: é um pedaço de texto que mora na
 * tabela de idioma em vez de morar no pack. O Foundry troca pelo conteúdo na hora de
 * desenhar; nós trocamos na hora de NORMALIZAR, uma vez só, porque é aqui que a tabela
 * está na mão — a tela não a recebe.
 *
 * Não é caso de borda. Medido na base inteira: **7.629 ocorrências, e 100% das chaves
 * existem na tabela fundida**. Sem expandir, a condição Sickened não tem descrição
 * nenhuma — a dela é literalmente `<p>@Localize[PF2E.condition.sickened.rules]</p>`, e o
 * que aparecia na tela era `PF2E.condition.sickened.rules`.
 *
 * O texto expandido é HTML e pode conter marcação, inclusive outro `@Localize`. Daí o
 * limite de profundidade: cadeia funciona, ciclo para.
 */

import { parseMarkup } from './parse';

/** Fundo do poço. Nenhuma cadeia real chega perto; o limite existe contra ciclo. */
const PROFUNDIDADE_MAXIMA = 4;

/**
 * Troca cada `@Localize[chave]` pelo texto da tabela.
 *
 * Chave ausente fica como está, e de propósito: some da tela como texto quebrado, que é
 * visível, em vez de virar string vazia, que é silêncio.
 */
export function expandLocalize(text: string, table: ReadonlyMap<string, string>): string {
  return expandir(text, table, 0);
}

function expandir(text: string, table: ReadonlyMap<string, string>, nivel: number): string {
  if (nivel >= PROFUNDIDADE_MAXIMA || !text.includes('@Localize[')) return text;

  /*
   * Resolve primeiro, junta depois. Marcar "mudou" dentro do `.map` seria mais curto e o
   * compilador não acompanha atribuição feita dentro de closure — ele passaria a tratar a
   * bandeira como sempre falsa, e a recursão nunca aconteceria.
   */
  const tokens = parseMarkup(text);
  const resolvidos = tokens.map((token) =>
    token.kind === 'localize' ? (table.get(token.body.trim()) ?? null) : null,
  );

  const saida = tokens.map((token, i) => resolvidos[i] ?? token.raw).join('');
  const mudou = resolvidos.some((valor) => valor !== null);
  return mudou ? expandir(saida, table, nivel + 1) : saida;
}
