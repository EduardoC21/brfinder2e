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
/**
 * Como o texto abre as referências que ele cita.
 *
 * Ausente: os `@UUID` continuam marcados e NÃO clicáveis, que é o que eram antes. É por
 * isso que o par é opcional — 2.559 dos 19.157 links da base apontam para coisa que este
 * aplicativo nunca vai ter (efeito de VTT, bestiário), e eles precisam continuar legíveis
 * em vez de virarem botões que não fazem nada.
 */
export interface RichTextLinks {
  /** Este alvo existe na base? Só o que resolve vira botão. */
  readonly resolves: (target: string) => boolean;
  /** `novo` quer dizer "em painel novo" — Ctrl+clique ou clique do meio. */
  readonly open: (target: string, novo: boolean) => void;
}

export function RichText({
  nodes,
  links,
}: {
  readonly nodes: readonly DocNode[];
  readonly links?: RichTextLinks;
}) {
  return <>{renderChildren(nodes, links)}</>;
}

/**
 * Desenha os filhos de um bloco marcando QUAL deles o abre.
 *
 * Esse é o dado que separa rótulo de ênfase. Medido nas 809 descrições: 1.694 `<strong>`,
 * e 1.683 (99,4%) abrem o bloco em que estão — `Effect` 258, `Frequency` 191,
 * `Requirements` 173, `Success` 167, `Trigger` 165. Os 11 do meio são referências de mapa
 * (`A10`, `C45`), que são ênfase de verdade.
 *
 * Por posição, e NÃO por lista de palavras: uma lista quebraria na primeira fonte com um
 * rótulo que ninguém previu, e são doze fontes pela frente.
 */
function renderChildren(nodes: readonly DocNode[], links?: RichTextLinks): ReactNode[] {
  const abertura = nodes.findIndex((node) => node.kind !== 'token' || node.token.raw.trim() !== '');
  return nodes.map((node, index) => renderNode(node, index, links, index === abertura));
}

/*
 * `links` viaja por PARÂMETRO e não por contexto do React.
 *
 * Contexto seria menos ruído aqui — são três assinaturas —, mas estas três funções são
 * puras e testáveis sem montar árvore nenhuma, e um contexto as tornaria dependentes de um
 * provedor invisível. O ruído é local; a dependência escondida seria permanente.
 */
function renderNode(
  node: DocNode,
  key: number,
  links?: RichTextLinks,
  abreBloco = false,
): ReactNode {
  if (node.kind === 'token') return <TokenPiece key={key} token={node.token} links={links} />;

  const children = renderChildren(node.children, links);

  /*
   * O símbolo de custo embutido na prosa. O Foundry manda a letra da fonte de ícones
   * dele, que não distribuímos — trocamos pelo nosso losango, que é o mesmo componente
   * do cabeçalho do detalhe.
   */
  /*
   * `pf2-icon` é a SEGUNDA classe de glifo do Foundry, com as mesmas letras. Aparece nas
   * tabelas da tela do mestre — 24 vezes nas 60 páginas — e sem isto o "R" de reação e o
   * "1" de uma ação saíam como letra solta ao lado do nome: "Aid R".
   */
  if (node.tag === 'span' && (node.className === 'action-glyph' || node.className === 'pf2-icon')) {
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

  /*
   * A CÉLULA COMPACTA não quebra linha. É o conserto das tabelas: sem isto o navegador
   * repartia a largura pelo conteúdo, e "Arrest a Fall" virava duas linhas com o glifo
   * caindo numa terceira, enquanto a descrição ao lado sobrava.
   *
   * O corte é MEDIDO, não escolhido. Nas 2.301 células que não são a última coluna das
   * tabelas de regras, 2.282 têm o maior trecho com até 40 caracteres, 3 têm mais de 60,
   * e NENHUMA fica entre 41 e 60. Um rótulo cabe em 40; prosa passa de 60; não há nada no
   * meio para errar. O trecho é cada `<p>` da célula, e não a soma: uma lista de nove
   * ações curtas continua curta.
   */
  if ((node.tag === 'td' || node.tag === 'th') && maiorTrecho(node.children) <= LIMITE_COMPACTO) {
    return createElement(
      node.tag,
      { key, className: cx(styles[node.tag], styles['compacta']) },
      ...children,
    );
  }

  const classe =
    node.tag === 'strong' && abreBloco ? styles['blockLabel'] : (styles[node.tag] ?? undefined);
  return createElement(node.tag, { key, className: classe }, ...children);
}

function TokenPiece({
  token,
  links,
}: {
  readonly token: Token;
  readonly links?: RichTextLinks | undefined;
}) {
  const text = tokenText(token);

  switch (token.kind) {
    case 'text':
      return <Fragment>{text}</Fragment>;

    /*
     * A referência a outra entrada — 19.157 nas descrições que já importamos, e 16.598
     * delas (86,6%) apontam para uma entrada que a base TEM.
     *
     * Vira botão só quando resolve. As outras 2.559 apontam para efeito de VTT
     * (`spell-effects`, `feat-effects`) e para packs que este aplicativo não lê, e continuam
     * exatamente como eram: marcadas, legíveis, inertes. Um botão que não faz nada é pior
     * que texto — ele promete.
     *
     * Ctrl (ou ⌘) e o clique do MEIO abrem em painel novo, como no navegador e no
     * explorador de arquivos. O botão DIREITO não: ele é do menu de contexto em toda
     * plataforma, e sequestrá-lo brigaria primeiro com o navegador e depois com o Tauri.
     */
    case 'uuid': {
      if (links?.resolves(token.target) !== true) {
        return (
          <span className={cx(styles['xref'], styles['uuid'])} title={token.target}>
            {text}
          </span>
        );
      }
      return (
        <button
          type="button"
          className={cx(styles['xref'], styles['uuid'], styles['clicavel'])}
          title={token.target}
          onClick={(event) => {
            links.open(token.target, event.ctrlKey || event.metaKey);
          }}
          onAuxClick={(event) => {
            // Botão do meio. `preventDefault` impede a rolagem automática do navegador.
            if (event.button === 1) {
              event.preventDefault();
              links.open(token.target, true);
            }
          }}
        >
          {text}
        </button>
      );
    }

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

/** Até aqui é rótulo; acima é prosa. Ver o comentário em `renderNode`. */
const LIMITE_COMPACTO = 40;

/**
 * O maior trecho de uma célula: o maior `<p>` quando ela é uma lista, ou o texto inteiro
 * quando não é. Um `@UUID` conta pelo rótulo, que é o que se vê.
 */
function maiorTrecho(children: readonly DocNode[]): number {
  const paragrafos = children.filter((node) => node.kind !== 'token' && node.tag === 'p');
  if (paragrafos.length === 0) return plainText(children).trim().length;
  return Math.max(
    0,
    ...paragrafos.map((p) => (p.kind === 'token' ? 0 : plainText(p.children).trim().length)),
  );
}

/** O texto puro de uma subárvore, para ler o conteúdo de um `action-glyph`. */
function plainText(nodes: readonly DocNode[]): string {
  return nodes
    .map((node) => (node.kind === 'token' ? tokenText(node.token) : plainText(node.children)))
    .join('');
}
