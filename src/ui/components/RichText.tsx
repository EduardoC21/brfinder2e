import { createElement, Fragment, type ReactNode } from 'react';

import { actionGlyph, tokenText, type DocNode, type Token } from '@core/markup/index';
import { ActionCost } from '@ui/components/ActionCost';
import { cx } from '@ui/cx';

import styles from './RichText.module.css';

/**
 * Desenha o documento da seção 7.6 — a terceira camada, `render`.
 *
 * Recebe DADO (`DocNode[]`, produzido em `core/markup/document.ts`) e devolve elementos.
 * Nada de `dangerouslySetInnerHTML`: o HTML já foi interpretado em árvore, com lista de
 * tags permitidas, então não há string de HTML sendo injetada em lugar nenhum.
 *
 * Os quatro tokens que o briefing 7.6 chama de referência cruzada — `@UUID`, `@Damage`,
 * `@Check`, `@Template` — ganham destaque. E o destaque NÃO é sublinhado azul: o Anexo A
 * pede que se destaquem "sem virar um mar de links azuis". Aqui é uma linha inferior
 * pontilhada em latão, que é a cor de dado de jogo no sistema.
 */
export function RichText({ nodes }: { readonly nodes: readonly DocNode[] }) {
  return <>{nodes.map((node, index) => renderNode(node, index))}</>;
}

function renderNode(node: DocNode, key: number): ReactNode {
  if (node.kind === 'token') return <TokenPiece key={key} token={node.token} />;

  const children = node.children.map((child, index) => renderNode(child, index));

  /*
   * O símbolo de custo embutido na prosa. O Foundry manda a letra da fonte de ícones
   * dele, que não distribuímos — trocamos pelo nosso losango, que é o mesmo componente
   * do cabeçalho do detalhe.
   */
  if (node.tag === 'span' && node.className === 'action-glyph') {
    const glyph = actionGlyph(plainText(node.children));
    if (glyph !== null) {
      const count = glyph === '1' || glyph === '2' || glyph === '3' ? Number(glyph) : null;
      return <ActionCost key={key} kind={count === null ? glyph : 'action'} count={count} />;
    }
  }

  // Void: `hr` e `br` não aceitam filhos, e passá-los é erro de runtime no React.
  if (node.tag === 'hr' || node.tag === 'br') {
    return createElement(node.tag, { key, className: styles[node.tag] });
  }

  return createElement(node.tag, { key, className: styles[node.tag] ?? undefined }, ...children);
}

function TokenPiece({ token }: { readonly token: Token }) {
  const text = tokenText(token);

  switch (token.kind) {
    case 'text':
      return <Fragment>{text}</Fragment>;

    case 'uuid':
      return (
        <span className={cx(styles['xref'], styles['uuid'])} title={token.target}>
          {text}
        </span>
      );

    case 'damage':
    case 'check':
    case 'template':
      return (
        <span className={cx(styles['xref'], styles[token.kind])} title={token.body}>
          {text}
        </span>
      );

    case 'roll':
      return (
        <span className={cx(styles['xref'], styles['roll'])} title={token.raw}>
          {text}
        </span>
      );

    // `@Localize` e `@Embed` puxam conteúdo de outro lugar. Sem resolvê-los, mostrar a
    // chave crua seria pior que mostrar nada legível — então ficam discretos, com o alvo
    // no title, até a resolução existir.
    case 'localize':
    case 'embed':
      return (
        <span className={styles['pending']} title={token.raw}>
          {text}
        </span>
      );

    case 'unknown':
      return <Fragment>{text}</Fragment>;
  }
}

/** O texto puro de uma subárvore, para ler o conteúdo de um `action-glyph`. */
function plainText(nodes: readonly DocNode[]): string {
  return nodes
    .map((node) => (node.kind === 'token' ? tokenText(node.token) : plainText(node.children)))
    .join('');
}
