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
      readonly children: readonly HtmlNode[];
    }
  | { readonly kind: 'text'; readonly text: string };

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
]);

/** Tags que não têm fechamento. */
const VOID_TAGS = new Set(['br', 'hr', 'img', 'input', 'meta', 'link']);

const TAG = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^>])*)>/g;
const CLASS = /class\s*=\s*"([^"]*)"|class\s*=\s*'([^']*)'/;

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
    // Tag fora da lista: descarta o invólucro e sobe os filhos. O texto não some.
    if (ALLOWED_TAGS.has(frame.tag)) {
      top().push({
        kind: 'element',
        tag: frame.tag,
        className: frame.className,
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

    stack.push({ tag, className: readClass(attrs), children: [] });
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
