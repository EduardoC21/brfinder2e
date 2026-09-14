/**
 * A BLINDAGEM (Etapa 34, pelo autor): o que a tradução automática NÃO pode tocar.
 *
 * O texto do Foundry é HTML com marcação própria — `@UUID[…]{Rótulo}`, `@Damage[…]`,
 * `@Embed[…]`, `[[/r 2d6]]` — e um tradutor que a veja como texto a quebra: traduz
 * "Fireball" dentro do alvo, tira um colchete, junta duas marcas. A blindagem passa o
 * texto pelo MESMO tokenizador da leitura (`parseMarkup`) e troca cada marca por um
 * elemento inline que o tradutor preserva (o modo HTML do Bergamot mantém tags e
 * atributos):
 *
 *   `@UUID[alvo]{Fireball}`   →  `<x-ref i="1">Fireball</x-ref>`   o rótulo é texto; traduz
 *   `@Damage[2d6[fire]]`      →  `<x-tok i="2"></x-tok>`           sem rótulo; nada traduz
 *
 * e `restore` refaz cada marca a partir do índice, com o rótulo traduzido no lugar do
 * original. Se alguma marca não voltar (o tradutor a engoliu), `restore` FALHA — melhor
 * não gravar do que gravar texto quebrado.
 *
 * E o GLOSSÁRIO: termos do jogo que o tradutor genérico erra ("Strike" vira "greve",
 * "saving throw" vira "salvar joga", "Fortitude" vira "fortaleza") viram um elemento
 * próprio, `<x-g i="n">skill feat</x-g>`, com o INGLÊS dentro: o tradutor vê a frase
 * inteira (e acerta a volta dela), e `restore` joga fora o que ele fez com o termo e põe
 * o da comunidade. Na Etapa 34 o termo ia em `<span translate="no">` já em português —
 * medido na 35, o Bergamot mexe na ORDEM das palavras dentro do `translate="no"`
 * ("talento de perícia" voltou "de talento perícia"): ele não traduz, mas realinha. O
 * rótulo de referência que o pacote conhece pelo nome ("Sneak Attack" → "Ataque
 * Furtivo") segue a mesma regra: vai em inglês, e volta pelo nome. Só em texto — nunca
 * dentro de uma tag HTML.
 */

import { parseMarkup } from '../markup/parse';

export interface Phrase {
  readonly en: string;
  readonly pt: string;
  /** Casa só com a grafia exata (nomes de ação e de entrada: "Strike", não "strike"). */
  readonly exact?: boolean;
}

export interface ShieldOptions {
  /** Termos do glossário: os fixos do app mais os que vierem do pacote. */
  readonly phrases?: readonly Phrase[];
  /** O nome em português de um rótulo de referência, quando o pacote o tem. */
  readonly nameOf?: (label: string) => string | null;
}

export interface Shielded {
  /** O HTML pronto para o tradutor. */
  readonly text: string;
  /** Quantas marcas foram protegidas — para o teste e para o relatório. */
  readonly marks: number;
  /** Refaz o HTML do Foundry a partir do traduzido. Lança quando uma marca sumiu. */
  restore(translated: string): string;
}

export class ShieldError extends Error {}

const ETIQUETA = /(<[^>]+>)/;
const REF = /<x-ref i="(\d+)">([\s\S]*?)<\/x-ref>/g;
const TOK = /<x-tok i="(\d+)"><\/x-tok>/g;
const GLOSSARIO = /<x-g i="(\d+)">([\s\S]*?)<\/x-g>/g;

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** "STRENGTH OR DEXTERITY": um título em caixa alta, no dado — o termo vai em caixa alta. */
function ehCaixaAlta(texto: string): boolean {
  return texto.length > 1 && texto === texto.toUpperCase() && texto !== texto.toLowerCase();
}

function comCaixaDe(modelo: string, termo: string): string {
  if (ehCaixaAlta(modelo)) return termo.toUpperCase();
  const primeira = modelo.charAt(0);
  if (primeira === primeira.toUpperCase() && primeira !== primeira.toLowerCase()) {
    return termo.charAt(0).toUpperCase() + termo.slice(1);
  }
  return termo;
}

/**
 * Aplica o glossário a um trecho de TEXTO (fora de tags): termo → `<x-g i="n">termo</x-g>`,
 * e o português vai para `termos`, na caixa do original. Uma passada só, com todos os
 * termos numa alternância (do mais longo ao mais curto): passadas sucessivas deixariam
 * um termo casar dentro do que outro já protegeu.
 */
function comGlossario(texto: string, phrases: readonly Phrase[], termos: string[]): string {
  /* O PRIMEIRO termo de cada chave vence: os fixos do app vêm antes dos do pacote. */
  const porTermo = new Map<string, Phrase>();
  for (const phrase of phrases) {
    const chave = phrase.en.toLowerCase();
    if (!porTermo.has(chave)) porTermo.set(chave, phrase);
  }
  const regex = new RegExp(`\\b(?:${phrases.map((p) => escapeRegex(p.en)).join('|')})\\b`, 'gi');
  return texto.replace(regex, (match) => {
    const phrase = porTermo.get(match.toLowerCase());
    if (phrase === undefined) return match;
    /* O exato aceita a caixa alta: "STRENGTH" num título é o atributo, não outra coisa. */
    if (phrase.exact === true && match !== phrase.en && !ehCaixaAlta(match)) return match;
    termos.push(comCaixaDe(match, phrase.pt));
    return `<x-g i="${String(termos.length)}">${match}</x-g>`;
  });
}

/** O glossário só em texto: o HTML é fatiado em tags e trechos, e só os trechos mudam. */
function glossarioForaDasTags(html: string, phrases: readonly Phrase[], termos: string[]): string {
  if (phrases.length === 0) return html;
  return html
    .split(ETIQUETA)
    .map((parte) => (parte.startsWith('<') ? parte : comGlossario(parte, phrases, termos)))
    .join('');
}

/** A marca com o rótulo trocado: o `{…}` do fim do `raw` vira `{novo}`. */
function comRotulo(raw: string, label: string, novo: string): string {
  const fim = `{${label}}`;
  if (!raw.endsWith(fim)) return raw;
  return `${raw.slice(0, raw.length - fim.length)}{${novo}}`;
}

export function shield(html: string, options: ShieldOptions = {}): Shielded {
  const phrases = [...(options.phrases ?? [])].sort((a, b) => b.en.length - a.en.length);
  const marcas: { raw: string; label: string | null; nome: string | null }[] = [];
  const termos: string[] = [];
  const partes: string[] = [];

  for (const token of parseMarkup(html)) {
    if (token.kind === 'text') {
      partes.push(glossarioForaDasTags(token.raw, phrases, termos));
      continue;
    }
    const i = marcas.length + 1;
    const label = 'label' in token ? token.label : null;
    /* O rótulo que o pacote conhece pelo nome volta pelo nome; o tradutor só vê o inglês. */
    const nome = label === null || label === '' ? null : (options.nameOf?.(label) ?? null);
    marcas.push({ raw: token.raw, label, nome });
    partes.push(
      label === null || label === ''
        ? `<x-tok i="${String(i)}"></x-tok>`
        : `<x-ref i="${String(i)}">${label}</x-ref>`,
    );
  }

  return {
    text: partes.join(''),
    marks: marcas.length,
    restore(translated: string): string {
      const vistas = new Set<number>();
      let out = translated.replace(REF, (_, n: string, label: string) => {
        const i = Number(n);
        const marca = marcas[i - 1];
        if (marca?.label == null) throw new ShieldError(`marca ${n} sem rótulo`);
        vistas.add(i);
        const novo = marca.nome ?? label.trim();
        return comRotulo(marca.raw, marca.label, novo === '' ? marca.label : novo);
      });
      out = out.replace(TOK, (_, n: string) => {
        const i = Number(n);
        const marca = marcas[i - 1];
        if (marca === undefined) throw new ShieldError(`marca ${n} desconhecida`);
        vistas.add(i);
        return marca.raw;
      });
      if (vistas.size !== marcas.length) {
        throw new ShieldError(
          `${String(marcas.length - vistas.size)} marca(s) sumiram na tradução`,
        );
      }
      if (/<x-(ref|tok)\b/.test(out)) throw new ShieldError('marca mal formada na tradução');
      /*
       * Os termos do glossário: o que o tradutor fez com o inglês sai, o da comunidade
       * entra. Um termo que o tradutor engoliu não é erro — fica o que ele escreveu.
       */
      out = out.replace(
        GLOSSARIO,
        (_, n: string, dentro: string) => termos[Number(n) - 1] ?? dentro,
      );
      return out.replace(/<\/?x-g\b[^>]*>/g, '');
    },
  };
}
