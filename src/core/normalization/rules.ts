/**
 * As páginas de REGRA, lidas dos jornais `GM Screen` e `Remaster Changes`.
 *
 * Como perícia e domínio, regra não é documento no Foundry: é página de jornal. A tela do
 * mestre tem 60, e elas vêm ORGANIZADAS — medido no `pf2e-8.5.0`, na ordem de `sort`:
 *
 *   ## GM Screen                        (índice, 2.471 caracteres)
 *   ## Player Screen                    (índice, 360)
 *   ## Playing the Game                 (divisória, 30)      21 páginas
 *   ## Running the Game                 (divisória, 49)      17 páginas
 *   ## Subsystems and Variant Rules     (divisória, 54)      17 páginas
 *
 * As cinco de `title.level: 1` são as SEÇÕES, e cada página pertence à seção de nível 1
 * que vem antes dela. Isso dá o Tipo da tela sem inventar nada — é a estrutura do próprio
 * livro (Player Core, GM Core), que o Foundry preservou na ordem.
 *
 * Três das cinco são só divisórias ("Sources: Pathfinder Player Core", 30 a 54
 * caracteres) e não viram entrada. Duas têm conteúdo de verdade — os índices, com a
 * tabela de links para as outras páginas — e viram entrada da própria seção. O corte é
 * por TAMANHO, e o número é medido: a menor página de conteúdo tem 103 caracteres
 * (`Simple DCs`), a maior divisória tem 54. O limiar fica no meio.
 *
 * ⚠️ REFERÊNCIA RELATIVA. Os índices apontam para as outras páginas como
 * `@UUID[.ZrEmfrgDlmlhdvQg]{Basic Actions}` — o ponto na frente quer dizer "página deste
 * mesmo jornal", uma forma que nenhuma outra fonte usa. São 66 nos jornais, todas para o
 * próprio jornal. Aqui elas viram a forma canônica, e o índice passa a ser um sumário
 * clicável de graça.
 */

import { slugify } from './slug';

export interface RulePage {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  /** A seção de nível 1 que vem antes — ou a própria página, quando ela é a seção. */
  readonly section: string;
  /** O HTML da página, com as referências relativas já reescritas. */
  readonly content: string;
  /** `Compendium.pf2e.journals.JournalEntry.<jornal>.JournalEntryPage.<página>`. */
  readonly uuid: string;
}

interface Pagina {
  readonly id: string;
  readonly name: string;
  readonly level: number;
  readonly sort: number;
  readonly content: string;
}

/**
 * Abaixo disto, uma página de nível 1 é divisória e não vira entrada. Medido: as três
 * divisórias têm 30, 49 e 54 caracteres de texto; a menor página de conteúdo tem 103.
 */
const MINIMO_DE_CONTEUDO = 100;

const ETIQUETA = /<[^>]*>/g;
const RELATIVA = /@UUID\[\.([A-Za-z0-9]+)\]/g;

function tamanhoDoTexto(html: string): number {
  return html.replace(ETIQUETA, '').trim().length;
}

/** `@UUID[.abc]` → `@UUID[Compendium.pf2e.journals.JournalEntry.<jornal>.JournalEntryPage.abc]`. */
function absolutizar(html: string, jornal: string): string {
  return html.replace(RELATIVA, (_, pagina: string) => `@UUID[${pageUuid(jornal, pagina)}]`);
}

export function pageUuid(jornal: string, pagina: string): string {
  return `Compendium.pf2e.journals.JournalEntry.${jornal}.JournalEntryPage.${pagina}`;
}

/**
 * Lê as páginas de um jornal e devolve as que viram regra, com a seção de cada uma.
 *
 * Recebe já na forma plana, sem `unknown`: quem lê o documento cru é a receita. Aqui é
 * só a conta da seção, que é o que merece teste.
 */
export function sectionPages(jornal: string, paginas: readonly Pagina[]): readonly RulePage[] {
  const ordenadas = [...paginas].sort((a, b) => a.sort - b.sort);
  const saida: RulePage[] = [];
  let secao = '';

  for (const pagina of ordenadas) {
    if (pagina.level === 1) {
      secao = pagina.name;
      // Divisória: só marca a seção e some. Índice: é a seção E uma entrada dela.
      if (tamanhoDoTexto(pagina.content) < MINIMO_DE_CONTEUDO) continue;
    }
    saida.push({
      id: pagina.id,
      name: pagina.name,
      slug: slugify(pagina.name),
      section: secao === '' ? pagina.name : secao,
      content: absolutizar(pagina.content, jornal),
      uuid: pageUuid(jornal, pagina.id),
    });
  }
  return saida;
}
