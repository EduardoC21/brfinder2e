/**
 * O índice de busca — o diferencial central do produto (briefing, seção 1).
 *
 * Sobre a biblioteca: MiniSearch, ~10 KiB, índice invertido com prefixo, tolerância a erro
 * de digitação e peso por campo. Escrever isso à mão seria um projeto dentro do projeto, e
 * a alternativa ingênua (`includes` sobre o nome) não acha "Power Attack" quando você
 * digita "attack pow", que é exatamente o tipo de coisa que o Pathbuilder erra.
 *
 * Duas configurações não são padrão e importam (briefing 7.8):
 *
 *   ACENTO   `processTerm` tira diacrítico e caixa. O dado dos packs é inglês, mas a
 *            tradução sob demanda vai trazer português, e aí "ilusão" tem que achar
 *            "ilusao".
 *   APÓSTROFO  o tokenizador padrão QUEBRA em `'`, então "Archwizard's Spellcraft" viraria
 *            ["archwizard", "s", "spellcraft"] e digitar "archwizards" não acharia nada.
 *            Aqui o apóstrofo é REMOVIDO antes de tokenizar, e o termo vira "archwizards".
 */

import MiniSearch from 'minisearch';

import { fieldValue, type BrowseEntity } from './query';

/** Tira acento e caixa. `NFD` separa a letra do diacrítico; o range apaga o diacrítico. */
export function foldTerm(term: string): string {
  return term.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Remove apóstrofo (reto e curvo) e depois quebra em não-letras. */
export function tokenize(text: string): string[] {
  return text
    .replace(/['’]/g, '')
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length > 0);
}

export interface SearchIndex {
  /** Chaves das entidades que casam, da mais relevante para a menos. */
  search(term: string): readonly string[];
}

/**
 * Monta o índice.
 *
 * `searchFields` vem do descritor da fonte, em ordem de peso: o primeiro pesa 3, o resto
 * pesa 1. Assim "blinded" acha a condição Blinded antes de achar outra que só cite
 * "blinded" no resumo.
 */
export function createSearchIndex(
  entities: readonly BrowseEntity[],
  searchFields: readonly string[],
): SearchIndex {
  const [primary] = searchFields;

  const mini = new MiniSearch<Record<string, string>>({
    idField: 'key',
    fields: [...searchFields],
    processTerm: (term) => {
      const folded = foldTerm(term);
      return folded.length > 0 ? folded : null;
    },
    tokenize,
    searchOptions: {
      prefix: true,
      // Tolerância proporcional ao tamanho do termo: 2 letras erradas num nome longo,
      // nenhuma num termo curto. Sem teto, "cat" acharia metade da base.
      fuzzy: (term) => (term.length > 4 ? 0.2 : 0),
      ...(primary === undefined ? {} : { boost: { [primary]: 3 } }),
    },
  });

  mini.addAll(
    entities.map((entity) => {
      const document: Record<string, string> = { key: entity.key };
      for (const field of searchFields) document[field] = fieldValue(entity, field);
      return document;
    }),
  );

  return {
    search(term) {
      const trimmed = term.trim();
      if (trimmed.length === 0) return [];
      return mini.search(trimmed).map((result) => result.id as string);
    },
  };
}
