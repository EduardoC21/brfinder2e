/**
 * O analisador da marcação do Foundry — briefing, seção 7.6.
 *
 * ⚠️ A ARMADILHA, e a razão deste arquivo existir: a marcação ANINHA colchetes.
 *
 *     @Damage[(4d6+@actor.abilities.str.mod)[bludgeoning]|options:area-damage]
 *     [[/r 2d6[fire]]]
 *
 * Uma expressão regular ingênua (`\[[^\]]*\]`) para no PRIMEIRO `]` e corta o token no
 * meio. O texto continua na tela, então ninguém percebe — e o invariante de ida e volta
 * quebra em silêncio. Medido nas descrições que já temos: 142 ocorrências de colchete
 * dentro de colchete. Por isso aqui se conta PROFUNDIDADE, caractere a caractere.
 *
 * Segunda razão para não ser regex: `@Damage[...]` e `[[/r ...]]` compartilham o mesmo
 * problema, mas com delimitadores diferentes. Um varredor com contador resolve os dois
 * com o mesmo código.
 */

import type { BodyToken, Token } from './types';

/** Os `@Nome` que conhecemos, e para que tipo de token cada um vai. */
const AT_KINDS: Readonly<Record<string, BodyToken['kind'] | 'uuid'>> = {
  UUID: 'uuid',
  Check: 'check',
  Damage: 'damage',
  Template: 'template',
  Localize: 'localize',
  Embed: 'embed',
};

/** Os comandos de rolagem. Briefing 7.6: são exatamente estes quatro na base inteira. */
const ROLL_COMMANDS = new Set(['r', 'act', 'gmr', 'br']);

const AT_START = /^@([A-Za-z]+)\[/;
const ROLL_START = /^\[\[\/([a-z]+)/;

/**
 * Consome um trecho delimitado, contando profundidade.
 *
 * Começa em `start`, que precisa ser a posição do primeiro delimitador de abertura.
 * Devolve o índice logo DEPOIS do fecha correspondente, ou `-1` se não fechar.
 *
 * Serve tanto para `[...]` quanto para `[[...]]`: os dois colchetes de abertura contam
 * dois níveis, e o `]]` final zera. É o mesmo algoritmo, e é o que a expressão regular
 * não faz.
 */
function scanBalanced(text: string, start: number, open: string, close: string): number {
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    const char = text[i];
    if (char === open) depth++;
    else if (char === close) {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

/** Lê um `{rótulo}` logo depois de `at`, se houver. Também conta profundidade. */
function scanLabel(text: string, at: number): { label: string; end: number } | null {
  if (text[at] !== '{') return null;
  const end = scanBalanced(text, at, '{', '}');
  if (end < 0) return null;
  return { label: text.slice(at + 1, end - 1), end };
}

/**
 * Quebra o texto em tokens.
 *
 * Garante `join(tokens.map((t) => t.raw)) === text`. Tudo que não for reconhecido como
 * marcação vira texto — inclusive um `@` solto ou um `[` sem fecha.
 */
export function parseMarkup(text: string): Token[] {
  const tokens: Token[] = [];
  let cursor = 0;
  let textStart = 0;

  const flushText = (until: number): void => {
    if (until > textStart) tokens.push({ kind: 'text', raw: text.slice(textStart, until) });
  };

  while (cursor < text.length) {
    const char = text[cursor];

    if (char === '@') {
      const token = readAtToken(text, cursor);
      if (token) {
        flushText(cursor);
        tokens.push(token.token);
        cursor = token.end;
        textStart = cursor;
        continue;
      }
    } else if (char === '[' && text[cursor + 1] === '[') {
      const token = readRollToken(text, cursor);
      if (token) {
        flushText(cursor);
        tokens.push(token.token);
        cursor = token.end;
        textStart = cursor;
        continue;
      }
    }

    cursor++;
  }

  flushText(text.length);
  return tokens;
}

function readAtToken(text: string, at: number): { token: Token; end: number } | null {
  const match = AT_START.exec(text.slice(at, at + 40));
  if (!match) return null;

  const name = match[1];
  if (name === undefined) return null;

  const bracket = at + 1 + name.length;
  const bodyEnd = scanBalanced(text, bracket, '[', ']');
  // Colchete que não fecha não é token: o texto segue como texto, e o invariante vale.
  if (bodyEnd < 0) return null;

  const body = text.slice(bracket + 1, bodyEnd - 1);
  const labelled = scanLabel(text, bodyEnd);
  const end = labelled?.end ?? bodyEnd;
  const raw = text.slice(at, end);
  const label = labelled?.label ?? null;

  const kind = AT_KINDS[name];
  if (kind === undefined) {
    return { token: { kind: 'unknown', raw, opener: `@${name}` }, end };
  }
  if (kind === 'uuid') {
    return { token: { kind: 'uuid', raw, target: body, label }, end };
  }
  return { token: { kind, raw, body, label }, end };
}

function readRollToken(text: string, at: number): { token: Token; end: number } | null {
  const match = ROLL_START.exec(text.slice(at, at + 20));
  if (!match) return null;

  const command = match[1];
  if (command === undefined) return null;

  const bodyEnd = scanBalanced(text, at, '[', ']');
  if (bodyEnd < 0) return null;

  // O corpo fica entre `[[/cmd` e `]]`.
  const body = text.slice(at + 3 + command.length, bodyEnd - 2);
  const labelled = scanLabel(text, bodyEnd);
  const end = labelled?.end ?? bodyEnd;
  const raw = text.slice(at, end);
  const label = labelled?.label ?? null;

  if (!ROLL_COMMANDS.has(command)) {
    return { token: { kind: 'unknown', raw, opener: `[[/${command}` }, end };
  }
  return { token: { kind: 'roll', raw, command, body, label }, end };
}

/**
 * O invariante da seção 7.6, como função.
 *
 * Existe para o teste de contrato poder afirmá-lo sobre a base inteira, e para qualquer
 * um poder checar sem reimplementar a junção.
 */
export function roundTrips(text: string): boolean {
  return (
    parseMarkup(text)
      .map((token) => token.raw)
      .join('') === text
  );
}
