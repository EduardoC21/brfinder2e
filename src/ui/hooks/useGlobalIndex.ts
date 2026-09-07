import { useEffect, useMemo, useState } from 'react';

import {
  byName as compararPorNome,
  createTextIndex,
  fieldValue,
  type BrowseEntity,
  type SearchIndex,
  type SourceSpec,
  type TextDocument,
} from '@core/browse/index';
import { isRecord } from '@core/json';
import { readDesc } from '@core/store/index';
import { createIndexedDbStore } from '@platform/store-indexeddb';

import type { LoadedSource } from './useAllBases';

const store = createIndexedDbStore();

/** Uma linha da busca global: a entrada mais a fonte de onde ela veio. */
export interface GlobalRow {
  /** `spells/abc123` — a chave da entrada NÃO é única entre tipos. */
  readonly id: string;
  readonly source: SourceSpec;
  readonly entity: BrowseEntity;
}

export interface GlobalIndex {
  readonly rows: readonly GlobalRow[];
  readonly byId: ReadonlyMap<string, GlobalRow>;
  /** Sobre o NOME. Pronto assim que as bases chegam. */
  readonly byName: SearchIndex | null;
  /** Sobre nome + descrição. `null` enquanto não foi pedido ou ainda está sendo montado. */
  readonly byText: SearchIndex | null;
  readonly buildingText: boolean;
}

/**
 * Os dois índices da busca global.
 *
 * ⚠️ O de DESCRIÇÃO só é montado quando alguém pede, e o motivo está medido: sobre as
 * 9.103 descrições reais do `pf2e-8.5.0` — 5,70 MiB de HTML, 835.459 palavras — o MiniSearch
 * leva **794 ms** e ocupa **22,5 MiB**. É rápido o bastante para não valer um trabalhador
 * em outra linha de execução, e caro o bastante para não ser pago por quem só quer achar
 * "Fireball" pelo nome. Montado uma vez, as buscas voltam em 1 a 12 ms.
 *
 * O texto vem da camada `desc/`, que guarda TUDO de um tipo num registro só — são quatro
 * leituras do IndexedDB, e não 9.103.
 */
export function useGlobalIndex(
  sources: readonly LoadedSource[],
  comDescricao: boolean,
): GlobalIndex {
  /*
   * Ordenadas por NOME, atravessando as fontes.
   *
   * É o que a paleta mostra antes de a pessoa digitar, e a alternativa era a ordem em que
   * as bases foram lidas — que é a ordem de gravação, ou seja, nenhuma. Com termo digitado
   * quem manda é a relevância; sem termo, o alfabeto é a única ordem que se pode prever.
   */
  const rows = useMemo(
    () =>
      sources
        .flatMap(({ source, entities }) =>
          entities.map((entity) => ({ id: `${source.id}/${entity.key}`, source, entity })),
        )
        .sort((a, b) => compararPorNome(a.entity, b.entity)),
    [sources],
  );

  const byId = useMemo(() => new Map(rows.map((row) => [row.id, row])), [rows]);

  const byName = useMemo(
    () =>
      rows.length === 0
        ? null
        : createTextIndex(
            rows.map((row) => ({ key: row.id, name: fieldValue(row.entity, 'name'), text: '' })),
          ),
    [rows],
  );

  const [texto, setTexto] = useState<{ token: string; index: SearchIndex } | null>(null);
  const token = String(rows.length);

  useEffect(() => {
    if (!comDescricao || rows.length === 0 || texto?.token === token) return;

    let alive = true;
    const tipos = [...new Set(sources.map(({ source }) => source.entityType ?? ''))];

    Promise.all(tipos.map(async (tipo) => [tipo, await readDesc(store, tipo)] as const))
      .then((lidos) => {
        if (!alive) return;
        const porTipo = new Map(lidos);
        const documentos: TextDocument[] = rows.map((row) => ({
          key: row.id,
          name: fieldValue(row.entity, 'name'),
          text: descriptionOf(porTipo.get(row.source.entityType ?? ''), row.entity.key),
        }));
        setTexto({ token, index: createTextIndex(documentos) });
      })
      .catch(() => {
        // Sem descrição gravada, a busca por texto simplesmente não fica pronta.
      });

    return () => {
      alive = false;
    };
  }, [comDescricao, rows, sources, token, texto?.token]);

  const pronto = texto?.token === token ? texto.index : null;
  return {
    rows,
    byId,
    byName,
    byText: pronto,
    buildingText: comDescricao && pronto === null && rows.length > 0,
  };
}

/**
 * O texto da descrição, com a marcação de fora.
 *
 * As etiquetas viram ESPAÇO, e não vazio: `<p>fogo</p><p>gelo</p>` sem o espaço vira
 * "fogogelo", e aí "gelo" não seria achado. O `@UUID[...]{Rótulo}` entrega o rótulo, que é
 * a palavra que a pessoa leu na tela.
 */
const ETIQUETA = /<[^>]*>/g;
const REFERENCIA = /@UUID\[[^\]]*\]\{([^}]*)\}/g;

function descriptionOf(
  guardado: Readonly<Record<string, unknown>> | null | undefined,
  key: string,
) {
  if (guardado === null || guardado === undefined) return '';
  const entrada = guardado[key];
  if (!isRecord(entrada)) return '';
  const main = entrada['main'];
  if (typeof main !== 'string') return '';
  return main.replace(REFERENCIA, '$1').replace(ETIQUETA, ' ');
}
