import { useCallback, useEffect, useReducer, useRef } from 'react';

import { conditionRecipe } from '@core/normalization/index';
import type { Recipe } from '@core/normalization/index';
import { persistSync } from '@core/sync/persist';
import { runSync, type SyncPhase } from '@core/sync/run-sync';
import { readMeta, type EntityDiff, type StoreMeta } from '@core/store/index';
import { createFetchHttp, viteProxyRewrite } from '@platform/http-fetch';
import { createIndexedDbStore } from '@platform/store-indexeddb';

/** Uma linha do relatório: o que foi importado e o que mudou em relação ao que já havia. */
export interface SyncedType {
  readonly type: string;
  readonly imported: number;
  readonly failed: number;
  readonly diff: EntityDiff;
}

/**
 * O que a última execução está fazendo. União discriminada: estado inválido — "carregando
 * e com erro ao mesmo tempo" — não é representável, e o `switch` na tela fica exaustivo.
 */
export type RunState =
  | { readonly status: 'loading' }
  | { readonly status: 'idle' }
  | { readonly status: 'running'; readonly phase: SyncPhase }
  | { readonly status: 'done'; readonly types: readonly SyncedType[] }
  | { readonly status: 'error'; readonly message: string };

/**
 * Duas coisas independentes, e por isso separadas:
 *
 *   `stored`  o que está GRAVADO agora. Sobrevive ao recarregar a janela, e é o que a
 *             barra de topo mostra.
 *   `run`     o que a última execução fez NESTA sessão. Some ao recarregar, e é o que o
 *             painel mostra.
 *
 * Juntá-las num estado só obrigaria a tela a perguntar "é resultado desta execução ou é o
 * que estava no disco?" em toda renderização.
 */
export interface SyncState {
  readonly stored: StoreMeta | null;
  readonly run: RunState;
}

type SyncAction =
  | { readonly kind: 'loaded'; readonly stored: StoreMeta | null }
  | { readonly kind: 'start' }
  | { readonly kind: 'phase'; readonly phase: SyncPhase }
  | { readonly kind: 'done'; readonly stored: StoreMeta; readonly types: readonly SyncedType[] }
  | { readonly kind: 'error'; readonly message: string };

function reduce(state: SyncState, action: SyncAction): SyncState {
  switch (action.kind) {
    case 'loaded':
      return { stored: action.stored, run: { status: 'idle' } };
    case 'start':
      return { ...state, run: { status: 'running', phase: { kind: 'resolving' } } };
    case 'phase':
      // Fase de uma execução abandonada não deve reabrir o estado "rodando".
      return state.run.status === 'running'
        ? { ...state, run: { status: 'running', phase: action.phase } }
        : state;
    case 'done':
      return { stored: action.stored, run: { status: 'done', types: action.types } };
    case 'error':
      return { ...state, run: { status: 'error', message: action.message } };
  }
}

/** Só o navegador em dev precisa do proxy; em Node e no Tauri a URL sai direto. */
const http = createFetchHttp({
  headers: { Accept: 'application/vnd.github+json' },
  rewrite: viteProxyRewrite,
});

const store = createIndexedDbStore();
const RECIPES: readonly Recipe<never, never>[] = [conditionRecipe as Recipe<never, never>];

const INITIAL: SyncState = { stored: null, run: { status: 'loading' } };

export interface UseSync {
  readonly state: SyncState;
  readonly start: () => void;
}

export function useSync(): UseSync {
  const [state, dispatch] = useReducer(reduce, INITIAL);

  /*
   * Descarta o resultado de uma execução abandonada. Sem isso, dois cliques rápidos
   * deixam a segunda resposta chegar e depois a primeira sobrescrevê-la.
   * `useRef` e não estado: mudar isto não deve redesenhar nada.
   */
  const runId = useRef(0);

  // Lê o que está gravado, uma vez. É o que faz a base sobreviver ao recarregar a janela.
  useEffect(() => {
    let alive = true;
    readMeta(store)
      .then((stored) => {
        if (alive) dispatch({ kind: 'loaded', stored });
      })
      .catch(() => {
        // Sem base gravada, ou IndexedDB indisponível (janela anônima, por exemplo).
        // Não é erro de sincronização: é só não ter nada ainda.
        if (alive) dispatch({ kind: 'loaded', stored: null });
      });
    return () => {
      alive = false;
    };
  }, []);

  const start = useCallback(() => {
    const id = ++runId.current;
    dispatch({ kind: 'start' });

    void (async () => {
      try {
        const result = await runSync(http, RECIPES, {
          onPhase: (phase) => {
            if (runId.current === id) dispatch({ kind: 'phase', phase });
          },
        });

        const persisted = await persistSync(store, result);
        if (runId.current !== id) return;

        const diffByType = new Map(persisted.types.map((entry) => [entry.type, entry.diff]));
        dispatch({
          kind: 'done',
          stored: persisted.meta,
          types: result.types.map((entry) => ({
            type: entry.type,
            imported: entry.imported,
            failed: entry.failed,
            diff: diffByType.get(entry.type) ?? { added: 0, updated: 0, unchanged: 0, removed: 0 },
          })),
        });
      } catch (error) {
        if (runId.current !== id) return;
        dispatch({
          kind: 'error',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    })();
  }, []);

  return { state, start };
}
