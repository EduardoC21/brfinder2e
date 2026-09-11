import { describe, expect, it } from 'vitest';

import { actionGlyph, parseDescription, tokenText } from './document';
import { decodeEntities, parseHtml, type HtmlNode } from './html';

const texto = (nodes: readonly unknown[]): string =>
  nodes
    .map((n) => {
      const node = n as { kind: string; token?: { raw: string }; children?: unknown[] };
      if (node.kind === 'token') return node.token?.raw ?? '';
      return texto(node.children ?? []);
    })
    .join('');

/** O primeiro elemento com a tag, em profundidade. */
function achar(node: HtmlNode | undefined, tag: string): (HtmlNode & { kind: 'element' }) | null {
  if (node?.kind !== 'element') return null;
  if (node.tag === tag) return node;
  for (const child of node.children) {
    const found = achar(child, tag);
    if (found !== null) return found;
  }
  return null;
}

describe('parseHtml', () => {
  it('monta a árvore das tags permitidas', () => {
    expect(parseHtml('<p>oi <strong>tudo</strong></p>')).toEqual([
      {
        kind: 'element',
        tag: 'p',
        className: null,
        children: [
          { kind: 'text', text: 'oi ' },
          {
            kind: 'element',
            tag: 'strong',
            className: null,
            children: [{ kind: 'text', text: 'tudo' }],
          },
        ],
      },
    ]);
  });

  it('lê a classe, que é como o Foundry marca o símbolo de ação', () => {
    const [node] = parseHtml('<span class="action-glyph">1</span>');
    expect(node).toMatchObject({ kind: 'element', tag: 'span', className: 'action-glyph' });
  });

  it('guarda colspan e rowspan, e só eles', () => {
    const [table] = parseHtml(
      '<table><tr><td colspan="4" data-colwidth="281,0">nota</td></tr></table>',
    );
    const td = achar(table, 'td');
    expect(td?.attrs).toEqual({ colspan: 4 });
    const [semSpan] = parseHtml('<p><td colspan="1">x</td></p>');
    expect(achar(semSpan, 'td')?.attrs).toBeUndefined();
  });

  it('lê o float:right como align, e descarta o resto do style', () => {
    const [p] = parseHtml(
      '<p><em>Section</em><span style="float:right"><em>pg. 227</em></span></p>',
    );
    expect(achar(p, 'span')?.attrs).toEqual({ align: 'right' });
    const [outro] = parseHtml('<p><span style="text-align:right">x</span></p>');
    expect(achar(outro, 'span')?.attrs).toBeUndefined();
  });

  it('tag sem fechamento não engole o resto', () => {
    expect(parseHtml('a<hr />b').map((n) => n.kind)).toEqual(['text', 'element', 'text']);
    expect(parseHtml('a<br>b').map((n) => n.kind)).toEqual(['text', 'element', 'text']);
  });

  /** A mesma regra do token desconhecido: melhor perder a formatação que perder o texto. */
  it('tag fora da lista some, mas o conteúdo fica', () => {
    expect(parseHtml('<blink>importante</blink>')).toEqual([{ kind: 'text', text: 'importante' }]);
  });

  it('HTML torto não derruba nada, e o texto sobrevive', () => {
    expect(texto(parseDescription('<p>aberto sem fechar'))).toBe('aberto sem fechar');
    expect(texto(parseDescription('</p>fecha sem abrir'))).toBe('fecha sem abrir');
  });
});

describe('decodeEntities', () => {
  it('decodifica as nomeadas e as numéricas', () => {
    expect(decodeEntities('a &amp; b &mdash; c')).toBe('a & b — c');
    expect(decodeEntities('&#8212;')).toBe('—');
    expect(decodeEntities('&#x2014;')).toBe('—');
  });

  it('deixa em paz o que não conhece', () => {
    expect(decodeEntities('&naoexiste;')).toBe('&naoexiste;');
  });
});

describe('parseDescription', () => {
  /**
   * A ordem é o ponto: o HTML é interpretado PRIMEIRO, e a marcação só nas folhas de
   * texto. Um trecho entre tokens pode ter tag desbalanceada — `<p>Anula ` é pedaço
   * válido do documento e HTML inválido.
   */
  it('aplica a marcação dentro da árvore, não sobre o HTML cru', () => {
    const nodes = parseDescription('<p>Anula @UUID[Compendium.x.Item.Y]{Dazzled}.</p>');
    expect(nodes).toHaveLength(1);
    const p = nodes[0];
    if (p?.kind !== 'element') throw new Error('esperava elemento');
    expect(p.tag).toBe('p');
    expect(p.children.map((c) => (c.kind === 'token' ? c.token.kind : c.kind))).toEqual([
      'text',
      'uuid',
      'text',
    ]);
  });

  it('a marcação aninhada continua inteira dentro do HTML', () => {
    const nodes = parseDescription('<p>Sofre @Damage[2d6[fire]] de dano.</p>');
    const p = nodes[0];
    if (p?.kind !== 'element') throw new Error('esperava elemento');
    const dano = p.children.find((c) => c.kind === 'token' && c.token.kind === 'damage');
    expect(dano?.kind === 'token' ? dano.token.raw : null).toBe('@Damage[2d6[fire]]');
  });
});

describe('tokenText', () => {
  it('o rótulo vence, porque é o que o autor escreveu para ser lido', () => {
    const [node] = parseDescription('@UUID[Compendium.pf2e.x.Item.TkIya]{Dazzled}');
    if (node?.kind !== 'token') throw new Error('esperava token');
    expect(tokenText(node.token)).toBe('Dazzled');
  });

  it('sem rótulo, cai no último segmento do alvo', () => {
    const [node] = parseDescription('@UUID[Compendium.pf2e.x.Item.TkIya]');
    if (node?.kind !== 'token') throw new Error('esperava token');
    expect(tokenText(node.token)).toBe('TkIya');
  });

  it('desconhecido aparece cru, como manda o briefing', () => {
    const [node] = parseDescription('@Inventado[algo]');
    if (node?.kind !== 'token') throw new Error('esperava token');
    expect(tokenText(node.token)).toBe('@Inventado[algo]');
  });
});

describe('actionGlyph', () => {
  /** O Foundry embute a letra da fonte de ícones dele, que não distribuímos. */
  it('traduz a letra da fonte de ícones para o nosso vocabulário', () => {
    expect(actionGlyph('1')).toBe('1');
    expect(actionGlyph('A')).toBe('1');
    expect(actionGlyph('2')).toBe('2');
    expect(actionGlyph('3')).toBe('3');
    expect(actionGlyph('R')).toBe('reaction');
    expect(actionGlyph('F')).toBe('free');
  });

  it('o que não reconhece devolve nulo, e a tela mostra o texto como veio', () => {
    expect(actionGlyph('x')).toBeNull();
  });
});

describe('fechamento implícito', () => {
  it('parágrafo não fica dentro de parágrafo', () => {
    // Como fica depois da expansão do @Localize: o texto da tabela traz os próprios <p>.
    const nodes = parseDescription('<p><p>um</p><p>dois</p></p>');
    expect(nodes).toHaveLength(2);
    expect(nodes.every((n) => n.kind === 'element' && n.tag === 'p')).toBe(true);
  });

  it('item de lista sem fechar não engole o próximo', () => {
    const nodes = parseDescription('<ul><li>um<li>dois</ul>');
    const ul = nodes[0];
    expect(ul?.kind === 'element' ? ul.children.length : 0).toBe(2);
  });
});
