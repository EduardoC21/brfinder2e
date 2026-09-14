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
 * "saving throw" vira "salvar joga", "Fortitude" vira "fortaleza") são trocados ANTES
 * pelo termo da comunidade, dentro de `<span translate="no">`, que o Bergamot deixa em
 * paz. O rótulo de uma referência que o pacote conhece pelo nome ("Sneak Attack" →
 * "Ataque Furtivo") também entra assim, em vez de ir para o tradutor. Só em texto —
 * nunca dentro de uma tag HTML.
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
const SEM_TRADUCAO = /<span translate="no">([\s\S]*?)<\/span>/g;

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function comCaixaDe(modelo: string, termo: string): string {
  const primeira = modelo.charAt(0);
  if (primeira === primeira.toUpperCase() && primeira !== primeira.toLowerCase()) {
    return termo.charAt(0).toUpperCase() + termo.slice(1);
  }
  return termo;
}

/**
 * Aplica o glossário a um trecho de TEXTO (fora de tags): termo → `<span translate="no">`.
 * Uma passada só, com todos os termos numa alternância (do mais longo ao mais curto):
 * passadas sucessivas deixariam um termo casar dentro do que outro já protegeu.
 */
function comGlossario(texto: string, phrases: readonly Phrase[]): string {
  const porTermo = new Map(phrases.map((phrase) => [phrase.en.toLowerCase(), phrase]));
  const regex = new RegExp(`\\b(?:${phrases.map((p) => escapeRegex(p.en)).join('|')})\\b`, 'gi');
  return texto.replace(regex, (match) => {
    const phrase = porTermo.get(match.toLowerCase());
    if (phrase === undefined) return match;
    if (phrase.exact === true && match !== phrase.en) return match;
    return `<span translate="no">${comCaixaDe(match, phrase.pt)}</span>`;
  });
}

/** O glossário só em texto: o HTML é fatiado em tags e trechos, e só os trechos mudam. */
function glossarioForaDasTags(html: string, phrases: readonly Phrase[]): string {
  if (phrases.length === 0) return html;
  return html
    .split(ETIQUETA)
    .map((parte) => (parte.startsWith('<') ? parte : comGlossario(parte, phrases)))
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
  const marcas: { raw: string; label: string | null }[] = [];
  const partes: string[] = [];

  for (const token of parseMarkup(html)) {
    if (token.kind === 'text') {
      partes.push(glossarioForaDasTags(token.raw, phrases));
      continue;
    }
    const i = marcas.length + 1;
    const label = 'label' in token ? token.label : null;
    marcas.push({ raw: token.raw, label });
    if (label === null || label === '') {
      partes.push(`<x-tok i="${String(i)}"></x-tok>`);
      continue;
    }
    /* O rótulo que o pacote conhece não vai ao tradutor: entra pronto e protegido. */
    const nome = options.nameOf?.(label) ?? null;
    partes.push(
      nome === null
        ? `<x-ref i="${String(i)}">${label}</x-ref>`
        : `<x-ref i="${String(i)}"><span translate="no">${nome}</span></x-ref>`,
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
        const novo = label.replace(SEM_TRADUCAO, '$1').trim();
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
      return out.replace(SEM_TRADUCAO, '$1');
    },
  };
}
