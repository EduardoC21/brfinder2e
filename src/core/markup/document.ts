/**
 * A terceira camada da seção 7.6: o documento pronto para desenhar.
 *
 *   raw       a string original, nunca modificada
 *   tokens    o parse da marcação        (parse.ts)
 *   document  HTML interpretado, com os tokens dentro dos nós de TEXTO   (aqui)
 *
 * A ordem importa e é o motivo de existir este arquivo: a descrição é HTML **com**
 * marcação dentro, e um trecho de texto entre tokens pode ter tag desbalanceada —
 * `<p>Anula ` é um pedaço válido do documento e um HTML inválido. Por isso o HTML é
 * interpretado PRIMEIRO, em árvore, e a marcação é aplicada só nas folhas de texto.
 *
 * O resultado é DADO, não componente: `core/` não pode importar React (ver a FRONTEIRA em
 * eslint.config.js), e a UI tem um desenhista por espécie de nó.
 */

import { parseHtml, type HtmlNode } from './html';
import { checkLabel, damageLabel, templateLabel } from './label';
import { parseMarkup } from './parse';
import type { Token } from './types';

export type DocNode =
  | {
      readonly kind: 'element';
      readonly tag: string;
      readonly className: string | null;
      readonly children: readonly DocNode[];
    }
  | { readonly kind: 'token'; readonly token: Token };

export function parseDescription(html: string): DocNode[] {
  return convert(parseHtml(html));
}

function convert(nodes: readonly HtmlNode[]): DocNode[] {
  const out: DocNode[] = [];
  for (const node of nodes) {
    if (node.kind === 'text') {
      for (const token of parseMarkup(node.text)) out.push({ kind: 'token', token });
      continue;
    }
    out.push({
      kind: 'element',
      tag: node.tag,
      className: node.className,
      children: convert(node.children),
    });
  }
  return out;
}

/**
 * O texto de LEITURA de um token.
 *
 * O rótulo vence quando existe, porque é o que o autor do conteúdo escreveu para ser lido:
 * `@UUID[…]{Dazzled}` deve aparecer como "Dazzled", não como o identificador. Sem rótulo,
 * cai no melhor que houver — e o desconhecido cai no `raw`, cru, como manda o briefing.
 */
export function tokenText(token: Token): string {
  switch (token.kind) {
    case 'text':
      return token.raw;
    case 'uuid':
      // Sem rótulo, o último segmento do alvo é o mais legível que temos sem consultar o
      // índice: `Compendium.pf2e.conditionitems.Item.TkIya` vira `TkIya`. Resolver o nome
      // de verdade é trabalho do índice, e fica para quando a navegação entre entradas
      // existir.
      return token.label ?? token.target.split('.').pop() ?? token.target;
    case 'check':
      return token.label ?? checkLabel(token.body);
    case 'damage':
      return token.label ?? damageLabel(token.body);
    case 'template':
      return token.label ?? templateLabel(token.body);
    case 'localize':
    case 'embed':
      return token.label ?? token.body;
    case 'roll':
      return token.label ?? token.body.trim();
    case 'unknown':
      return token.raw;
  }
}

/**
 * O símbolo de custo em ações que vem DENTRO do texto.
 *
 * O Foundry embute `<span class="action-glyph">1</span>` no meio da prosa — 63 vezes só
 * nas descrições que temos. A letra é a fonte de ícones dele, que não distribuímos.
 * Aqui ela é traduzida para o mesmo vocabulário do resto do app.
 */
export function actionGlyph(text: string): string | null {
  const chave = text.trim().toLowerCase();
  switch (chave) {
    case '1':
    case 'a':
      return '1';
    case '2':
    case 'd':
      return '2';
    case '3':
    case 't':
      return '3';
    case 'r':
      return 'reaction';
    case 'f':
      return 'free';
    default:
      return null;
  }
}
