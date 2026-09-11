/**
 * O ÍNDICE DE PÁGINAS DE JORNAL — a segunda tabela de consulta do motor, ao lado da de
 * idioma.
 *
 * Existe porque há entrada que mora em DOIS lugares: a ancestralidade tem a mecânica no
 * pack `ancestries` (50 documentos, PV, tamanho, aumentos…) e o texto no jornal
 * `Ancestries` (50 páginas com o mesmo nome, 4.693 a 13.239 caracteres, contra 231 a
 * 1.123 do resumo do pack). Uma receita lê UM documento; para ler a página também, ela
 * precisa de uma tabela onde a página esteja pelo nome — como `fromLang` lê a tabela de
 * idioma pela chave.
 *
 * A chave é `<jornal>/<página>`. Medido no `pf2e-8.5.0`: os 50 nomes do pack batem com
 * 50 dos 55 nomes de página (os outros 5 são divisórias: Versatile Heritages, Common,
 * Uncommon, Rare, Index). Classe e arquétipo têm a mesma forma — jornal `Classes` (31
 * páginas), `Archetypes` (265) —, e é por isso que o índice não sabe de ancestralidade.
 */

import { isRecord } from '../json';

export type JournalPages = ReadonlyMap<string, string>;

/** A chave de uma página: `Ancestries/Dwarf`. */
export function journalKey(journal: string, page: string): string {
  return `${journal}/${page}`;
}

/** Os documentos do pack `journals` → `{ 'Ancestries/Dwarf': '<p>…' }`. */
export function indexJournalPages(documents: readonly unknown[]): JournalPages {
  const index = new Map<string, string>();
  for (const document of documents) {
    if (!isRecord(document) || typeof document['name'] !== 'string') continue;
    const journal = document['name'];
    const pages = document['pages'];
    if (!Array.isArray(pages)) continue;
    for (const page of pages as unknown[]) {
      if (!isRecord(page) || typeof page['name'] !== 'string') continue;
      const text = page['text'];
      const content = isRecord(text) && typeof text['content'] === 'string' ? text['content'] : '';
      index.set(journalKey(journal, page['name']), content);
    }
  }
  return index;
}
