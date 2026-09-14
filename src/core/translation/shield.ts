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
 * "saving throw" vira "salvar joga", "Fortitude" vira "fortaleza") vão em
 * `<span translate="no" i="n">skill feat</span>`, com o INGLÊS dentro, e `restore` joga
 * fora o que o tradutor fez com o termo e põe o da comunidade. Medido no motor (Etapa
 * 37), e é isto que decide a forma:
 *
 *   - elemento DESCONHECIDO (`<x-g>`) é tratado como BLOCO: quebra a frase ao redor
 *     ("Faça um corpo a corpo Golpe. .");
 *   - `<span translate="no">` é inline — a frase fica inteira — e o conteúdo pode voltar
 *     realinhado ("talento de perícia" → "de talento perícia"), o que não importa porque
 *     o conteúdo é descartado. Na Etapa 34 o português ia DENTRO, e aí importava.
 *
 * As REFERÊNCIAS ficam em `<x-ref>` — bloco — sempre. Medido: o motor às vezes DUPLICA
 * um elemento inline ("de {Bola de Fogo} de {Bola de Fogo}"), e um link duplicado é
 * dado quebrado; em bloco, 1.762 marcas da amostra voltaram uma a uma. O rótulo que o
 * pacote conhece pelo nome ("Sneak Attack" → "Ataque Furtivo"), ou que o glossário
 * conhece inteiro, volta por ele; o que ninguém conhece FICA NO ORIGINAL — medido, o
 * motor sozinho fazia de "Aonaurious" "Amenitário" e de "Alglenweis" "Alglenweis (em
 * inglês)": nome próprio não se adivinha. Um termo do glossário duplicado só duplicaria
 * uma palavra — e a segunda cópia sai na volta.
 *
 * E os RÓTULOS DE BLOCO: `<strong>Sacred Animal</strong> fox`, `<strong>Trigger</strong>
 * A creature…` — um negrito curto no começo de um parágrafo, item ou frase, seguido de
 * texto. Medido: como inline, o motor engolia o rótulo, trocava rótulo e valor de lugar
 * ("raposa <strong>animal sagrada</strong>") ou duplicava a tag. Vira `<x-lab>` — bloco —
 * e rótulo e valor traduzem cada um sozinho; `restore` devolve o `<strong>`. Só em texto —
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
const GLOSSARIO = /<span translate="no" i="(\d+)">([\s\S]*?)<\/span>/g;
const ROTULO = /<x-lab i="(\d+)">([\s\S]*?)<\/x-lab>/g;
/**
 * Um negrito CURTO (até 40 caracteres, sem ponto) no começo de um bloco, depois de um
 * `<br>`, ou depois do fim de uma frase — e seguido de texto. É o rótulo do Foundry. O
 * glossário já passou, então o rótulo pode ter um termo protegido dentro
 * ("Bloodline <span…>Skills</span>").
 */
const ROTULO_EM_NEGRITO =
  /(^|<(?:p|li|td|th|div)(?:\s[^>]*)?>|<br\s*\/?>|[.!?;:]\s+)<strong>((?:[^<.]|<span translate="no" i="\d+">[^<.]*<\/span>)+?)<\/strong>(?=\s*(?:[^\s<]|<span translate="no"))/g;
/**
 * Um número com sinal — "+2 bonus", "–4 penalty" — vai protegido como termo, com o
 * mesmo texto na volta. Medido: "a –4 status penalty" virou "de de 4 euros".
 */
const NUMERO_COM_SINAL = /[+\u2013\u2212-]\d+(?:\/\d+)?/g;
/** "5th-rank", "17th level": o ordinal inglês vai como "5º" — medido, o motor perdia o número. */
const ORDINAL = /\b(\d+)(?:st|nd|rd|th)\b/g;

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** "STRENGTH OR DEXTERITY": um título em caixa alta, no dado — o termo vai em caixa alta. */
function ehCaixaAlta(texto: string): boolean {
  return texto.length > 1 && texto === texto.toUpperCase() && texto !== texto.toLowerCase();
}

/** "Hit Points": cada palavra em maiúscula. Uma palavra só não conta — é a frase. */
function ehTitulo(texto: string): boolean {
  const palavras = texto.split(/\s+/);
  return palavras.length > 1 && palavras.every((p) => /^\p{Lu}/u.test(p));
}
const CONECTIVOS: ReadonlySet<string> = new Set([
  'de',
  'da',
  'do',
  'das',
  'dos',
  'e',
  'a',
  'em',
  'com',
]);
function emTitulo(termo: string): string {
  return termo
    .split(' ')
    .map((p, i) =>
      i > 0 && CONECTIVOS.has(p.toLowerCase())
        ? p.toLowerCase()
        : p.charAt(0).toUpperCase() + p.slice(1),
    )
    .join(' ');
}

function comCaixaDe(modelo: string, termo: string, en = ''): string {
  /* Caixa alta só quando ela é da FRASE: "GM" é sigla, e "MESTRE" estava errado. */
  if (ehCaixaAlta(modelo) && !ehCaixaAlta(en)) return termo.toUpperCase();
  /* "Hit Points" no texto → "Pontos de Vida", não "Pontos de vida". */
  if (ehTitulo(modelo) && !ehTitulo(en)) return emTitulo(termo);
  const primeira = modelo.charAt(0);
  const enPrimeira = en.charAt(0);
  /*
   * Capitaliza só quando a maiúscula é da FRASE ("Saving throw" no começo), e não do
   * termo ("Reflex saves" começa com maiúscula por Reflexos, e "Salvamentos de Reflexos"
   * no meio da frase estava errado — Etapa 38).
   */
  if (
    primeira === primeira.toUpperCase() &&
    primeira !== primeira.toLowerCase() &&
    enPrimeira === enPrimeira.toLowerCase()
  ) {
    return termo.charAt(0).toUpperCase() + termo.slice(1);
  }
  /*
   * Original todo em minúscula → termo todo em minúscula (Etapa 38): a tabela do pacote
   * capitaliza ("Salvamentos", "Golpe Reativo"), e "o mesmo CA e Salvamentos que você"
   * ficava com maiúscula no meio da frase. Só chega aqui o termo não exato, que casa em
   * qualquer caixa — o nome (exato) já vem na caixa certa.
   */
  if (modelo === modelo.toLowerCase()) return termo.toLowerCase();
  return termo;
}

/**
 * Aplica o glossário a um trecho de TEXTO (fora de tags): termo → `<x-g i="n">termo</x-g>`,
 * e o português vai para `termos`, na caixa do original. Uma passada só, com todos os
 * termos numa alternância (do mais longo ao mais curto): passadas sucessivas deixariam
 * um termo casar dentro do que outro já protegeu.
 */
function comNumeros(texto: string, termos: string[]): string {
  return texto
    .replace(NUMERO_COM_SINAL, (numero) => {
      termos.push(numero);
      return `<span translate="no" i="${String(termos.length)}">${numero}</span>`;
    })
    .replace(ORDINAL, (ordinal, numero: string) => {
      termos.push(`${numero}º`);
      return `<span translate="no" i="${String(termos.length)}">${ordinal}</span>`;
    });
}

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
    termos.push(comCaixaDe(match, phrase.pt, phrase.en));
    return `<span translate="no" i="${String(termos.length)}">${match}</span>`;
  });
}

/** O glossário só em texto: o HTML é fatiado em tags e trechos, e só os trechos mudam. */
function glossarioForaDasTags(html: string, phrases: readonly Phrase[], termos: string[]): string {
  return html
    .split(ETIQUETA)
    .map((parte) =>
      parte.startsWith('<')
        ? parte
        : comNumeros(phrases.length === 0 ? parte : comGlossario(parte, phrases, termos), termos),
    )
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
  /* O glossário conhece o rótulo INTEIRO? ("Strike", "flat-footed") Então volta por ele. */
  const porTermo = new Map(phrases.map((phrase) => [phrase.en.toLowerCase(), phrase]));
  const termoInteiro = (label: string): string | null => {
    const phrase = porTermo.get(label.toLowerCase());
    if (phrase === undefined) return null;
    if (phrase.exact === true && label !== phrase.en) return null;
    return comCaixaDe(label, phrase.pt, phrase.en);
  };

  /* "Enfeebled 1", "Stunned 2": o nome com o valor atrás — o nome resolve, o valor fica. */
  const nomeDoRotulo = (label: string): string | null => {
    const direto = options.nameOf?.(label) ?? termoInteiro(label);
    if (direto !== null) return direto;
    const m = /^(.*\S)\s+(\d+)$/.exec(label);
    if (m === null) return null;
    const base = options.nameOf?.(m[1] ?? '') ?? termoInteiro(m[1] ?? '');
    return base === null ? null : `${base} ${m[2] ?? ''}`;
  };

  for (const token of parseMarkup(html)) {
    if (token.kind === 'text') {
      partes.push(glossarioForaDasTags(token.raw, phrases, termos));
      continue;
    }
    const i = marcas.length + 1;
    const label = 'label' in token ? token.label : null;
    /* O rótulo que o pacote ou o glossário conhece volta pronto; o tradutor só vê o inglês. */
    const nome = label === null || label === '' ? null : nomeDoRotulo(label);
    marcas.push({ raw: token.raw, label, nome });
    partes.push(
      label === null || label === ''
        ? `<x-tok i="${String(i)}"></x-tok>`
        : `<x-ref i="${String(i)}">${label}</x-ref>`,
    );
  }

  /* Os rótulos de bloco viram bloco de verdade para o tradutor. */
  let rotulos = 0;
  const text = partes
    .join('')
    .replace(ROTULO_EM_NEGRITO, (match, antes: string, rotulo: string) => {
      if (rotulo.replace(/<[^>]+>/g, '').length > 40) return match;
      rotulos += 1;
      return `${antes}<x-lab i="${String(rotulos)}">${rotulo}</x-lab>`;
    });

  return {
    text,
    marks: marcas.length,
    restore(translated: string): string {
      const vistas = new Set<number>();
      /* O motor engole o espaço depois de um bloco ("leva  <x-tok/>Dano"): devolve-se. */
      const comEspaco = (raw: string, offset: number, match: string, whole: string): string => {
        const depois = offset + match.length;
        const colado =
          /[\p{L}\p{N}]/u.test(whole.charAt(depois)) ||
          whole.startsWith('<span translate="no"', depois);
        return colado ? `${raw} ` : raw;
      };
      let out = translated.replace(
        REF,
        (match: string, n: string, _label: string, offset: number, whole: string) => {
          const i = Number(n);
          const marca = marcas[i - 1];
          if (marca?.label == null) throw new ShieldError(`marca ${n} sem rótulo`);
          vistas.add(i);
          /* O rótulo traduzido pelo motor (`label`) é descartado: só o nome conhecido entra. */
          const raw = comRotulo(marca.raw, marca.label, marca.nome ?? marca.label);
          return comEspaco(raw, offset, match, whole);
        },
      );
      out = out.replace(TOK, (match: string, n: string, offset: number, whole: string) => {
        const i = Number(n);
        const marca = marcas[i - 1];
        if (marca === undefined) throw new ShieldError(`marca ${n} desconhecida`);
        vistas.add(i);
        return comEspaco(marca.raw, offset, match, whole);
      });
      /*
       * O ponto que fecha a frase logo depois de um bloco vira segmento sozinho, e o motor
       * o devolve como ". ." — medido: 30 das 105 entradas da amostra, e nenhum ". ." no
       * original. Só depois de uma marca refeita.
       */
      out = out.replace(/([\]}])\. \./g, '$1.');
      if (vistas.size !== marcas.length) {
        throw new ShieldError(
          `${String(marcas.length - vistas.size)} marca(s) sumiram na tradução`,
        );
      }
      if (/<x-(ref|tok)\b/.test(out)) throw new ShieldError('marca mal formada na tradução');
      /* Os rótulos de bloco voltam a ser negrito; um que sumiu é texto perdido — falha. */
      let devolvidos = 0;
      out = out.replace(ROTULO, (_, _n: string, dentro: string) => {
        devolvidos += 1;
        return `<strong>${dentro.trim()}</strong>`;
      });
      if (devolvidos !== rotulos) {
        throw new ShieldError(`${String(rotulos - devolvidos)} rótulo(s) sumiram na tradução`);
      }
      if (/<\/?x-lab\b/.test(out)) throw new ShieldError('rótulo mal formado na tradução');
      /*
       * Os termos do glossário: o que o tradutor fez com o inglês sai, o da comunidade
       * entra. Um termo que o tradutor engoliu não é erro — fica o que ele escreveu.
       */
      const usados = new Set<number>();
      out = out.replace(
        GLOSSARIO,
        (match: string, n: string, dentro: string, offset: number, whole: string) => {
          const i = Number(n);
          /* A segunda cópia de um termo que o motor duplicou sai. */
          if (usados.has(i)) return '';
          usados.add(i);
          /* "void healing" voltava "vaziocura": o espaço depois do termo também some. */
          return comEspaco(termos[i - 1] ?? dentro, offset, match, whole);
        },
      );
      return out.replace(/<\/?span translate="no"[^>]*>/g, '');
    },
  };
}
