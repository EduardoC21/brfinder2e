import { useEffect, useState } from 'react';

import { SOURCES, type BrowseEntity, type SourceSpec } from '@core/browse/index';
import { readBase } from '@core/store/index';
import { createIndexedDbStore } from '@platform/store-indexeddb';

const store = createIndexedDbStore();

/** Uma fonte pronta, com o que ela tem dentro. */
export interface LoadedSource {
  readonly source: SourceSpec;
  readonly entities: readonly BrowseEntity[];
}

export type AllBases =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly sources: readonly LoadedSource[] };

const IDLE: AllBases = { status: 'idle' };
const LOADING: AllBases = { status: 'loading' };

/**
 * Lê as entidades de TODAS as fontes que já têm receita.
 *
 * ⚠️ Só carrega quando `enabled` fica verdadeiro, e é de propósito: são 9.087 entradas em
 * quatro tipos, e ninguém abre o aplicativo para usar a busca global — abre para ver uma
 * lista. Carregar tudo na partida atrasaria a primeira tela por uma tela que talvez nem
 * seja aberta. Depois de carregado, fica: a paleta abre e fecha muitas vezes por sessão.
 *
 * Relê quando a `version` muda, que é como o resto do app percebe uma sincronização.
 */
export function useAllBases(enabled: boolean, version: string | null): AllBases {
  const token = version ?? '-';
  const [loaded, setLoaded] = useState<{ token: string; sources: readonly LoadedSource[] } | null>(
    null,
  );

  useEffect(() => {
    if (!enabled) return;
    if (loaded?.token === token) return;

    let alive = true;
    const prontas = SOURCES.filter((source) => source.entityType !== null);

    Promise.all(
      prontas.map(async (source) => ({
        source,
        entities: (await readBase(store, source.entityType ?? '')) ?? [],
      })),
    )
      .then((resultado) => {
        if (!alive) return;
        setLoaded({ token, sources: resultado.filter((entry) => entry.entities.length > 0) });
      })
      .catch(() => {
        if (alive) setLoaded({ token, sources: [] });
      });

    return () => {
      alive = false;
    };
  }, [enabled, token, loaded?.token]);

  if (!enabled && loaded === null) return IDLE;
  return loaded?.token === token ? { status: 'ready', sources: loaded.sources } : LOADING;
}
