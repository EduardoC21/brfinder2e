import type { ColumnSpec, FilterSpec, SourceSpec } from './spec';
import {
  applyFilters,
  plainValues,
  topicMatters,
  type BrowseEntity,
  type FilterState,
} from './query';

/**
 * O RECORTE: quais colunas e filtros fazem sentido para os Tipos marcados agora.
 *
 * O problema que isto resolve está em equipamento: nove espécies de item num catálogo só,
 * e **vinte e duas colunas** oferecidas de uma vez. Não são vinte e duas escolhas — são
 * nove conjuntos empilhados, e a pessoa que procura armadura não tem nada que ver com
 * `recarga` nem com `dano`.
 *
 * A regra, decidida com o autor e espelhada no Archives of Nethys (onde cada categoria tem
 * sua própria tabela):
 *
 *   universal        entra SEMPRE — preço, volume, livro, o próprio Tipo
 *   um Tipo marcado  entra o que pertence àquele Tipo, e o PRESET dele liga sozinho
 *   vários marcados  entra só o que os marcados têm EM COMUM, e nenhum preset liga
 *   nenhum marcado   só o universal
 *
 * Numa fórmula: `universal ∪ ⋂(marcados)`. Com nada marcado a interseção seria "tudo" pela
 * convenção matemática, e por isso o caso zero é escrito à parte: a visão geral é a mais
 * pobre de propósito, porque é a única em que uma coluna pode estar vazia em 90% das linhas.
 */

/** Os Tipos marcados agora, lidos do filtro que a fonte declarou como Tipo. */
export function selectedTypes(source: SourceSpec, filters: FilterState): readonly string[] {
  if (source.typeFilter === null) return [];
  const marcados = filters[source.typeFilter]?.values ?? [];
  // Um limite de faixa numérica nunca é um Tipo; `plainValues` tira os `min:`/`max:`.
  return plainValues(marcados).filter((valor) => valor !== '');
}

/** Vale para o recorte? Ver a regra no topo do arquivo. */
function noEscopo(kinds: readonly string[] | undefined, selecionados: readonly string[]): boolean {
  if (kinds === undefined) return true;
  if (selecionados.length === 0) return false;
  return selecionados.every((tipo) => kinds.includes(tipo));
}

export function columnsInScope(
  source: SourceSpec,
  selecionados: readonly string[],
): readonly ColumnSpec[] {
  return source.columns.filter((column) => noEscopo(column.kinds, selecionados));
}

export function filtersInScope(
  source: SourceSpec,
  selecionados: readonly string[],
): readonly FilterSpec[] {
  return source.filters.filter((filter) => noEscopo(filter.kinds, selecionados));
}

/**
 * As colunas que ligam sozinhas neste recorte.
 *
 * Só com UM Tipo marcado o preset dele vale. Com dois, o preset de qual? Ligar a união
 * daria colunas que metade das linhas não preenche; ligar a interseção daria quase nada.
 * Nos dois casos a pessoa já escolheu um recorte incomum, e aí a escolha das colunas é
 * dela — que é o que a preferência gravada guarda.
 */
export function presetFor(
  source: SourceSpec,
  selecionados: readonly string[],
): readonly string[] | null {
  if (selecionados.length !== 1) return null;
  return source.presets?.[selecionados[0] ?? ''] ?? null;
}

/**
 * A chave da preferência de colunas neste recorte.
 *
 * Vazia na visão geral e no recorte de vários; o valor do Tipo quando é um só. É o que faz
 * "armas com dano e mãos" e "armaduras com CA e limite de Destreza" conviverem sem uma
 * apagar a outra — e o que faz voltar a arma reencontrar as colunas de arma.
 */
export function scopeKey(selecionados: readonly string[]): string {
  return selecionados.length === 1 ? (selecionados[0] ?? '') : '';
}

/**
 * As entradas do recorte de TIPO — e só dele.
 *
 * É a base sobre a qual se pergunta "este filtro serve para o que está selecionado?".
 * Recortada só pelo Tipo, e não por todos os filtros ativos: se um tópico sumisse porque a
 * pessoa acabou de marcar nele a única opção que sobrou, ela perderia o caminho de volta.
 */
export function entitiesInScope(
  source: SourceSpec,
  entities: readonly BrowseEntity[],
  filters: FilterState,
): readonly BrowseEntity[] {
  const id = source.typeFilter;
  if (id === null) return entities;
  const spec = source.filters.find((entry) => entry.id === id);
  if (spec === undefined) return entities;
  const values = plainValues(filters[id]?.values ?? []);
  if (values.length === 0) return entities;
  return applyFilters(entities, [spec], { [id]: { values } });
}

/**
 * Os filtros que ainda têm o que oferecer. Ver `topicMatters` para a regra.
 *
 * Dois nunca somem, e por motivos diferentes:
 *
 *   o TIPO       porque ele é quem comanda o recorte; medido dentro do próprio recorte
 *                ele teria sempre um valor só, e desapareceria no primeiro clique
 *   o MARCADO    porque esconder um filtro que a pessoa está usando tira da tela a
 *                explicação de por que a lista encolheu
 */
export function filtersThatMatter(
  source: SourceSpec,
  specs: readonly FilterSpec[],
  entities: readonly BrowseEntity[],
  filters: FilterState,
): readonly FilterSpec[] {
  return specs.filter((spec) => {
    if (spec.id === source.typeFilter) return true;
    if ((filters[spec.id]?.values.length ?? 0) > 0) return true;
    return topicMatters(entities, spec);
  });
}
