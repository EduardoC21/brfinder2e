/**
 * A TABELA DE TALENTOS por nome — a terceira tabela de consulta do motor, ao lado da de
 * idioma e da de páginas de jornal.
 *
 * Existe por um defeito da fonte que o autor achou: a página do Guardian, no jornal
 * `Archetypes`, não cita a dedicação — vai da prosa direto aos traços e ao TEXTO dela,
 * sem o `<h2>@UUID{Guardian Dedication}` que as outras 28 de multiclasse têm. E todo
 * arquétipo tem uma dedicação. A receita de arquétipo faz então o caminho inverso: acha
 * "<Nome> Dedication" aqui, e confirma pelo texto — os 80 primeiros caracteres da
 * descrição do talento têm de estar na página. Só com as duas coisas ela aceita.
 *
 * O texto guardado é curto de propósito: é chave de conferência, não conteúdo.
 */

import { isRecord } from '../json';

export interface FeatSummary {
  readonly uuid: string;
  readonly level: number | null;
  /** Os primeiros 80 caracteres da descrição, sem tags, para conferir contra a página. */
  readonly snippet: string;
}

export type FeatsByName = ReadonlyMap<string, FeatSummary>;

const ETIQUETA = /<[^>]*>/g;
const TAMANHO_DO_TRECHO = 80;

/** Texto puro, espaços normalizados — a mesma limpeza dos dois lados da conferência. */
export function plainSnippet(html: string, size = TAMANHO_DO_TRECHO): string {
  return html.replace(ETIQUETA, ' ').replace(/\s+/g, ' ').trim().slice(0, size);
}

/** Os documentos do pack `feats-srd` → `{ 'Guardian Dedication': {uuid, level, snippet} }`. */
export function indexFeats(documents: readonly unknown[]): FeatsByName {
  const index = new Map<string, FeatSummary>();
  for (const document of documents) {
    if (!isRecord(document) || typeof document['name'] !== 'string') continue;
    if (typeof document['_id'] !== 'string') continue;
    const system = document['system'];
    if (!isRecord(system)) continue;
    const level = isRecord(system['level']) ? system['level']['value'] : undefined;
    const description = isRecord(system['description'])
      ? system['description']['value']
      : undefined;
    index.set(document['name'], {
      uuid: `Compendium.pf2e.feats-srd.Item.${document['_id']}`,
      level: typeof level === 'number' ? level : null,
      snippet: typeof description === 'string' ? plainSnippet(description) : '',
    });
  }
  return index;
}
