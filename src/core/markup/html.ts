/**
 * Interpretador do HTML das descrições.
 *
 * Por que um próprio, e não `DOMParser` ou uma biblioteca:
 *
 *   `DOMParser` só existe no navegador, e a camada `core/` é testada em Node puro. Levá-lo
 *   para `platform/` partiria a análise em dois lugares sem ganho.
 *
 *   Uma biblioteca resolveria o caso geral, e o caso geral não é o nosso: medido nas 809
 *   descrições que temos, são DEZESSEIS tags, todas comuns, e ZERO descrições com HTML
 *   desbalanceado. Para esse recorte, um varredor de 80 linhas é mais previsível.
 *
 * A lista de tags permitidas é fechada. O que não estiver nela tem a tag descartada e o
 * conteúdo mantido — o texto nunca some, só perde a formatação. É a mesma regra do token
 * desconhecido: melhor feio na tela que perdido.
 */

export type HtmlNode =
  | {
      readonly kind: 'element';
      readonly tag: string;
      readonly className: string | null;
      /** Só existe quando a tag traz um dos três atributos de `ElementAttrs`. */
      readonly attrs?: ElementAttrs;
      readonly children: readonly HtmlNode[];
    }
  | { readonly kind: 'text'; readonly text: string };

/**
 * Os ÚNICOS atributos além de `class` que sobrevivem à leitura. Lista fechada, como a de
 * tags: o resto (`style`, `data-colwidth`, `border`) é descartado.
 *
 * `colspan`/`rowspan` — 64 no zip, 13 nas regras. Sem eles a nota de rodapé de Skill
 * Actions (`<td colspan="4">`) caía na primeira coluna, a mais estreita.
 *
 * `align: 'right'` — a leitura de UM valor de `style`: `float:right`. É o padrão de
 * diagramação das páginas de jornal, 5.400 no zip (5.517 só em `journals`): o rodapé
 * `<em>Section: …</em><span style="float:right"><em>Player Core pg. 227</em></span>` em
 * 50 das 67 páginas de regras, e o nível ao lado do título em Automatic Bonus
 * Progression. Não é "estilo inline permitido" — é um atributo semântico lido de onde o
 * Foundry o escreve.
 */
export interface ElementAttrs {
  readonly colspan?: number;
  readonly rowspan?: number;
  readonly align?: 'right';
}

/**
 * As tags que a tela sabe desenhar. Medidas nas descrições reais, por frequência:
 * p 4938, strong 3388, hr 666, td 452, li 320, span 130, tr 128, ul 86, h2 46, th 42,
 * em 38, table 14, tbody 14, section 12, thead 10, h3 8.
 */
export const ALLOWED_TAGS = new Set([
  'p',
  'strong',
  'em',
  'hr',
  'br',
  'ul',
  'ol',
  'li',
  'span',
  'h2',
  'h3',
  'h4',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'section',
  'div',
  /*
   * `sup` só aparece nas tabelas da tela do mestre: as letras E, G, D em sobrescrito ao
   * lado de cada ação (Exploração, Geral, Downtime). 44 usos. Sem ela na lista, a letra
   * caía no texto como se fosse parte do nome — "Squeeze E".
   */
  'sup',
]);

/** Tags que não têm fechamento. */
const VOID_TAGS = new Set(['br', 'hr', 'img', 'input', 'meta', 'link']);

/**
 * Tags que a abertura de uma nova FECHA implicitamente, como manda o HTML.
 *
 * `<p>` não pode conter `<p>`: o navegador fecha o anterior sozinho ao ver o próximo. O
 * parser não fazia isso, e o problema apareceu com a expansão do `@Localize` — a
 * descrição da Sickened é `<p>@Localize[…]</p>` e o texto da tabela já vem com os
 * próprios `<p>`, então saía `<p><p>…</p><p>…</p></p>` e o React desenhava parágrafo
 * dentro de parágrafo.
 *
 * A regra é do HTML, não do nosso caso: implementá-la conserta a expansão e qualquer
 * outro texto que venha assim.
 */
const CLOSES_PREVIOUS: Readonly<Record<string, readonly string[]>> = {
  p: ['p'],
  li: ['li'],
  tr: ['tr', 'td', 'th'],
  td: ['td', 'th'],
  th: ['td', 'th'],
};

const TAG = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^>])*)>/g;
const CLASS = /class\s*=\s*"([^"]*)"|class\s*=\s*'([^']*)'/;
const COLSPAN = /colspan\s*=\s*["']?(\d+)/;
const ROWSPAN = /rowspan\s*=\s*["']?(\d+)/;
const FLOAT_RIGHT = /style\s*=\s*["'][^"']*float\s*:\s*right/;

const ENTITIES: Readonly<Record<string, string>> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  mdash: '—',
  ndash: '–',
  hellip: '…',
  times: '×',
  rsquo: '’',
  lsquo: '‘',
  ldquo: '“',
  rdquo: '”',
};

/** Decodifica as entidades que aparecem de verdade, mais as numéricas. */
export function decodeEntities(text: string): string {
  if (!text.includes('&')) return text;
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (todo, corpo: string) => {
    if (corpo.startsWith('#')) {
      const code =
        corpo.startsWith('#x') || corpo.startsWith('#X')
          ? Number.parseInt(corpo.slice(2), 16)
          : Number.parseInt(corpo.slice(1), 10);
      return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : todo;
    }
    return ENTITIES[corpo.toLowerCase()] ?? todo;
  });
}

interface Frame {
  readonly tag: string;
  readonly className: string | null;
  readonly attrs: ElementAttrs | undefined;
  readonly children: HtmlNode[];
}

export function parseHtml(html: string): HtmlNode[] {
  const root: HtmlNode[] = [];
  const stack: Frame[] = [];
  const top = (): HtmlNode[] => stack[stack.length - 1]?.children ?? root;

  let cursor = 0;
  TAG.lastIndex = 0;

  const pushText = (raw: string): void => {
    if (raw === '') return;
    top().push({ kind: 'text', text: decodeEntities(raw) });
  };

  const close = (frame: Frame): void => {
    // Parágrafo que ficou vazio é sobra de fechamento implícito, não conteúdo.
    if (frame.tag === 'p' && frame.children.length === 0) return;
    // Tag fora da lista: descarta o invólucro e sobe os filhos. O texto não some.
    if (ALLOWED_TAGS.has(frame.tag)) {
      top().push({
        kind: 'element',
        tag: frame.tag,
        className: frame.className,
        ...(frame.attrs === undefined ? {} : { attrs: frame.attrs }),
        children: frame.children,
      });
    } else {
      top().push(...frame.children);
    }
  };

  let match: RegExpExecArray | null;
  while ((match = TAG.exec(html)) !== null) {
    pushText(html.slice(cursor, match.index));
    cursor = match.index + match[0].length;

    const isClosing = match[1] === '/';
    const tag = (match[2] ?? '').toLowerCase();
    const attrs = match[3] ?? '';

    if (isClosing) {
      // Fecha até encontrar a tag correspondente. Se ela não estiver aberta, ignora — o
      // HTML medido é bem formado, mas isto impede que um dado torto derrube a tela.
      const at = stack.findLastIndex((frame) => frame.tag === tag);
      if (at < 0) continue;
      while (stack.length > at) {
        const frame = stack.pop();
        if (frame) close(frame);
      }
      continue;
    }

    if (VOID_TAGS.has(tag) || attrs.trimEnd().endsWith('/')) {
      if (ALLOWED_TAGS.has(tag)) {
        top().push({ kind: 'element', tag, className: readClass(attrs), children: [] });
      }
      continue;
    }

    const fecha = CLOSES_PREVIOUS[tag];
    if (fecha !== undefined) {
      while (stack.length > 0) {
        const topo = stack[stack.length - 1];
        if (topo === undefined || !fecha.includes(topo.tag)) break;
        stack.pop();
        close(topo);
      }
    }

    stack.push({ tag, className: readClass(attrs), attrs: readAttrs(attrs), children: [] });
  }

  pushText(html.slice(cursor));

  // Sobrou coisa aberta: fecha na ordem, sem perder nada.
  while (stack.length > 0) {
    const frame = stack.pop();
    if (frame) close(frame);
  }

  return root;
}

function readClass(attrs: string): string | null {
  const match = CLASS.exec(attrs);
  return match?.[1] ?? match?.[2] ?? null;
}

/** Os atributos de `ElementAttrs` que a tag traz, ou `undefined` quando não traz nenhum. */
function readAttrs(attrs: string): ElementAttrs | undefined {
  const lidos: { colspan?: number; rowspan?: number; align?: 'right' } = {};
  const colspan = COLSPAN.exec(attrs)?.[1];
  if (colspan !== undefined && Number(colspan) > 1) lidos.colspan = Number(colspan);
  const rowspan = ROWSPAN.exec(attrs)?.[1];
  if (rowspan !== undefined && Number(rowspan) > 1) lidos.rowspan = Number(rowspan);
  if (FLOAT_RIGHT.test(attrs)) lidos.align = 'right';
  return Object.keys(lidos).length === 0 ? undefined : lidos;
}
