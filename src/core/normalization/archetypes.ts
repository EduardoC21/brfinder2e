/**
 * A leitura do jornal `Archetypes`: uma página, um arquétipo — e o que a página diz dele.
 *
 * O jornal é a fonte LIMPA de arquétipo, e o próprio livro o organiza: 8 páginas de nível
 * 1 são as seções, e o que vem depois de cada uma é o que ela contém. Medido no
 * `pf2e-8.5.0`, 265 páginas:
 *
 *   Index                   0 (fora: é sumário)
 *   Rules                   8 (fora daqui: são regra, e entram na fonte de Regras)
 *   Multiclass Archetypes  29
 *   Class Archetypes       14   o nome vem "(Class Archetype)"
 *   Archetype Artifacts     3
 *   Undead Archetypes       6
 *   Mythic Destinies       13   os caminhos míticos, sem dedicação
 *   Archetypes            184   os gerais
 *
 * Cada página tem a prosa de abertura e depois UM `<h2>` POR TALENTO —
 * `@UUID[…feats-srd…]{Acrobat Dedication} <span>Feat 2</span>` — seguido dos traços, dos
 * pré-requisitos e do `@Embed` do talento. 2.125 dos 2.142 talentos de arquétipo são
 * citados por alguma página, em ordem de nível: a lista de talentos de um arquétipo vem
 * DAQUI, e não do pré-requisito (que só cobre 1.580). A dedicação é o primeiro talento
 * cujo nome termina em " Dedication" — os 232 do pack terminam assim. A raridade vem no
 * nome: 8 "(Uncommon)", 5 "(Rare)", o resto comum. O livro vem de "Source: … pg. N", em
 * 256 das 257.
 *
 * As categorias finas do Archives of Nethys (Combat Style, Faction, Profession, Mystical…)
 * NÃO existem no zip — nem traço, nem pasta, nem flag. A divisão em seis é a do livro.
 */

import { pageUuid } from './rules';
import { slugify } from './slug';

/** O Tipo, pela seção do jornal. */
const SECAO_PARA_TIPO: Readonly<Record<string, string>> = {
  Archetypes: 'general',
  'Multiclass Archetypes': 'multiclass',
  'Class Archetypes': 'class',
  'Mythic Destinies': 'mythic',
  'Undead Archetypes': 'undead',
  'Archetype Artifacts': 'artifact',
};

/** As seções do jornal que NÃO são arquétipo: o sumário e as regras. */
export const SECOES_FORA = new Set(['Index', 'Rules']);

export interface ArchetypeFeat {
  readonly uuid: string;
  readonly name: string;
  /** O "Feat N" ao lado do título; nulo quando a página não o escreve. */
  readonly level: number | null;
}

export interface ArchetypePage {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly kind: string;
  readonly rarity: string;
  readonly dedication: ArchetypeFeat | null;
  readonly prerequisites: string;
  readonly feats: readonly ArchetypeFeat[];
  /** O livro, como a página o escreve: "Pathfinder Player Core"; vazio na 1 sem linha. */
  readonly sourceTitle: string;
  /** A prosa de abertura, antes do primeiro `<h2>`. */
  readonly intro: string;
  /** A página inteira, com as referências relativas reescritas. */
  readonly content: string;
  readonly uuid: string;
}

interface Pagina {
  readonly id: string;
  readonly name: string;
  readonly level: number;
  readonly sort: number;
  readonly content: string;
}

const SUFIXO = /\s*\((Uncommon|Rare|Class Archetype)\)\s*$/;
const H2 = /<h2[^>]*>([\s\S]*?)<\/h2>/g;
const FEAT_NO_H2 =
  /@UUID\[(Compendium\.pf2e\.feats-srd\.Item\.[A-Za-z0-9]{16})\]\{([^}]*)\}(?:[\s\S]*?Feat\s+(\d+))?/;
const PREREQ = /<p><strong>Prerequisites<\/strong>\s*([\s\S]*?)<\/p>/;
const SOURCE = /<em>Source: ([^<]*?)(?: pg\. [^<]*)?<\/em>/;
const RELATIVA = /@UUID\[\.([A-Za-z0-9]+)\]/g;
const ETIQUETA = /<[^>]*>/g;

function absolutizar(html: string, jornal: string): string {
  return html.replace(RELATIVA, (_, pagina: string) => `@UUID[${pageUuid(jornal, pagina)}]`);
}

/** Os talentos citados nos `<h2>`, na ordem da página. Um `<h2>` sem `@UUID` não é talento. */
function talentosDosTitulos(content: string): ArchetypeFeat[] {
  const out: ArchetypeFeat[] = [];
  for (const match of content.matchAll(H2)) {
    const titulo = match[1] ?? '';
    const feat = FEAT_NO_H2.exec(titulo);
    if (feat === null) continue;
    const [, uuid, name, level] = feat;
    out.push({
      uuid: uuid ?? '',
      name: name ?? '',
      level: level === undefined ? null : Number(level),
    });
  }
  return out;
}

/** O parágrafo de pré-requisitos logo depois da dedicação, como texto puro. */
function prerequisitosDa(content: string, dedication: ArchetypeFeat | null): string {
  if (dedication === null) return '';
  const inicio = content.indexOf(dedication.uuid);
  if (inicio < 0) return '';
  const trecho = content.slice(inicio);
  const proximo = trecho.indexOf('<h2', 1);
  const bloco = proximo < 0 ? trecho : trecho.slice(0, proximo);
  const match = PREREQ.exec(bloco);
  return match?.[1] === undefined ? '' : match[1].replace(ETIQUETA, '').trim();
}

export function archetypePages(
  jornal: string,
  paginas: readonly Pagina[],
): readonly ArchetypePage[] {
  const ordenadas = [...paginas].sort((a, b) => a.sort - b.sort);
  const saida: ArchetypePage[] = [];
  let secao = '';

  for (const pagina of ordenadas) {
    if (pagina.level === 1) {
      secao = pagina.name;
      continue;
    }
    const kind = SECAO_PARA_TIPO[secao];
    if (kind === undefined) continue;

    const sufixo = SUFIXO.exec(pagina.name)?.[1];
    const name = pagina.name.replace(SUFIXO, '');
    const rarity = sufixo === 'Uncommon' ? 'uncommon' : sufixo === 'Rare' ? 'rare' : 'common';
    const content = absolutizar(pagina.content, jornal);
    const feats = talentosDosTitulos(content);
    const dedication = feats.find((feat) => feat.name.endsWith(' Dedication')) ?? null;
    const primeiroTitulo = content.search(/<h2/);
    const intro = primeiroTitulo < 0 ? content : content.slice(0, primeiroTitulo);

    saida.push({
      id: pagina.id,
      name,
      slug: slugify(name),
      kind,
      rarity,
      dedication,
      prerequisites: prerequisitosDa(content, dedication),
      feats,
      sourceTitle: SOURCE.exec(content)?.[1]?.replace(/&amp;/g, '&') ?? '',
      intro: intro.trim(),
      content,
      uuid: pageUuid(jornal, pagina.id),
    });
  }
  return saida;
}
