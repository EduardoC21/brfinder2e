import { useCallback, useReducer, useRef } from 'react';

import { runSync, type SyncPhase, type SyncResult } from '@core/sync/run-sync';
import { conditionRecipe } from '@core/normalization/index';
import type { Recipe } from '@core/normalization/index';
import { createFetchHttp, viteProxyRewrite } from '@platform/http-fetch';

/**
 * O estado da sincronização.
 *
 * É uma união discriminada, não um punhado de booleanos. Com `carregando`, `erro` e
 * `resultado` soltos dá para escrever "carregando e com erro ao mesmo tempo", que não
 * existe — e a tela precisa checar as três coisas em toda renderização. Aqui o estado
 * inválido não é representável, e o `switch` na tela fica exaustivo.
 */
export type SyncState =
  | { readonly status: 'idle' }
  | { readonly status: 'running'; readonly phase: SyncPhase }
  | { readonly status: 'done'; readonly result: SyncResult }
  | { readonly status: 'error'; readonly message: string };

type SyncAction =
  | { readonly kind: 'start' }
  | { readonly kind: 'phase'; readonly phase: SyncPhase }
  | { readonly kind: 'done'; readonly result: SyncResult }
  | { readonly kind: 'error'; readonly message: string };

/**
 * `useReducer` e não vários `useState`: as transições são poucas e conhecidas, e
 * concentrá-las aqui deixa a regra "o que pode virar o quê" legível num lugar só.
 * Uma biblioteca de estado (Zustand, Redux) seria peso sem problema para resolver —
 * este estado pertence a um componente, não ao aplicativo.
 */
function reduce(state: SyncState, action: SyncAction): SyncState {
  switch (action.kind) {
    case 'start':
      return { status: 'running', phase: { kind: 'resolving' } };
    case 'phase':
      // Fase que chega depois do fim é de uma execução abandonada: ignora.
      return state.status === 'running' ? { status: 'running', phase: action.phase } : state;
    case 'done':
      return { status: 'done', result: action.result };
    case 'error':
      return { status: 'error', message: action.message };
  }
}

/** Só o navegador em dev precisa do proxy; em Node e no Tauri a URL sai direto. */
const http = createFetchHttp({
  headers: { Accept: 'application/vnd.github+json' },
  rewrite: viteProxyRewrite,
});

const RECIPES: readonly Recipe<never, never>[] = [conditionRecipe as Recipe<never, never>];

export interface UseSync {
  readonly state: SyncState;
  readonly start: () => void;
}

export function useSync(): UseSync {
  const [state, dispatch] = useReducer(reduce, { status: 'idle' });

  /*
   * Guarda a execução em curso para descartar o resultado de uma anterior. Sem isso,
   * dois cliques rápidos deixam a segunda resposta e depois a primeira sobrescrevendo-a.
   * `useRef` e não estado: mudar isto não deve redesenhar nada.
   */
  const runId = useRef(0);

  const start = useCallback(() => {
    const id = ++runId.current;
    dispatch({ kind: 'start' });

    runSync(http, RECIPES, {
      onPhase: (phase) => {
        if (runId.current === id) dispatch({ kind: 'phase', phase });
      },
    })
      .then((result) => {
        if (runId.current === id) dispatch({ kind: 'done', result });
      })
      .catch((error: unknown) => {
        if (runId.current !== id) return;
        dispatch({
          kind: 'error',
          message: error instanceof Error ? error.message : String(error),
        });
      });
  }, []);

  return { state, start };
}
