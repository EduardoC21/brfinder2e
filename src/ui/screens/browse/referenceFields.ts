import type { BrowseEntity } from '@core/browse/index';
import { isRecord } from '@core/json';

/**
 * A leitura de REFERÊNCIAS — o ponteiro de uma entrada para outra, guardado num campo.
 *
 * Três fontes usam: a perícia (ações), o antecedente (talento concedido), a divindade
 * (magias de clérigo) e o domínio (as duas magias). Uma leitura só, usada pela coluna (que
 * escreve os nomes) e pelo detalhe (que os transforma em botões).
 *
 * Arquivo `.ts` e sem componente: um módulo que exporta componente E função quebra o
 * recarregamento a quente do Vite.
 */

/** Uma referência `@UUID` guardada num campo. */
export interface Reference {
  readonly uuid: string;
  /**
   * O rótulo, quando a fonte o guarda junto. VAZIO quando não guarda — a divindade só
   * tem o UUID da magia, e aí quem escreve o nome é a tela, resolvendo pelo índice.
   */
  readonly name: string;
  /** O ranque, quando a referência é uma magia concedida por nível. */
  readonly rank?: number;
}

/**
 * As referências de um campo, já limpas. Aceita a LISTA e o item SOLTO: o antecedente
 * guarda `feats: [{…}]`, e o domínio guarda `spell: {…}`.
 *
 * Entrada sem UUID cai fora: sem UUID não há para onde ir, e sem nome não há o que
 * desenhar — mas nome vazio COM UUID fica, porque o nome pode vir do índice.
 */
export function references(entity: BrowseEntity, field: string): readonly Reference[] {
  const base = entity.base;
  if (!isRecord(base)) return [];
  const cru = base[field];
  const lista: unknown[] = Array.isArray(cru) ? cru : [cru];
  return lista
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .map((item) => {
      const rank = item['rank'];
      return {
        uuid: typeof item['uuid'] === 'string' ? item['uuid'] : '',
        name: typeof item['name'] === 'string' ? item['name'] : '',
        ...(typeof rank === 'number' ? { rank } : {}),
      };
    })
    .filter((item) => item.uuid !== '');
}

/**
 * Os nomes, para a COLUNA — onde referência é texto e não botão.
 *
 * `nameOf` resolve o nome de quem não o guarda (as magias da divindade); sem ele, essa
 * referência sai como o UUID cru, que é feio mas honesto.
 */
export function referenceNames(
  entity: BrowseEntity,
  field: string,
  nameOf: (uuid: string) => string | null = () => null,
): string {
  return references(entity, field)
    .map((item) => (item.name !== '' ? item.name : (nameOf(item.uuid) ?? item.uuid)))
    .join(', ');
}
