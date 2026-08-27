import { useCallback, useEffect, useReducer, useRef } from 'react';

import { conditionRecipe } from '@core/normalization/index';
import type { Recipe } from '@core/normalization/index';
import { KNOWN_GOOD_TAG } from '@core/source/index';
import { persistSync } from '@core/sync/persist';
import { runSync, type SyncPhase, type SyncResult } from '@core/sync/run-sync';
import { checkForUpdate } from '@core/sync/update-check';
import { readMeta, type EntityDiff, type StoreMeta } from '@core/store/index';
import { createFetchHttp, viteProxyRewrite } from '@platform/http-fetch';
import { createIndexedDbStore } from '@platform/store-indexeddb';

/** Uma linha do relatório: o que entrou, o que mudou, e o que está aposentado. */
export interface SyncedType {
  readonly type: string;
  readonly imported: number;
  readonly failed: number;
  readonly diff: EntityDiff;
  readonly retired: number;
}

export type RunState =
  | { readonly status: 'loading' }
  | { readonly status: 'idle' }
  | { readonly status: 'running'; readonly phase: SyncPhase }
  | { readonly status: 'done'; readonly types: readonly SyncedType[] }
  /** Rodou, mas houve falha de decodificação numa troca de versão: NADA foi gravado. */
  | { readonly status: 'refused'; readonly tag: string; readonly failures: number }
  | { readonly status: 'error'; readonly message: string };

export type UpdateState =
  | { readonly status: 'idle' }
  | { readonly status: 'checking' }
  | { readonly status: 'upToDate' }
  | {
      readonly status: 'available';
      readonly tag: string;
      /** `false` quando o manifesto do candidato já não declara um pack que precisamos. */
      readonly compatible: boolean;
    };

/**
 * Três coisas independentes, e por isso separadas:
 *
 *   `stored`  o que está GRAVADO. Sobrevive ao recarregar, e é o que a barra mostra.
 *   `run`     o que a última sincronização fez nesta sessão.
 *   `update`  o resultado da última procura por versão nova.
 */
export interface SyncState {
  readonly stored: StoreMeta | null;
  readonly run: RunState;
  readonly update: UpdateState;
}

type SyncAction =
  | { readonly kind: 'loaded'; readonly stored: StoreMeta | null }
  | { readonly kind: 'start' }
  | { readonly kind: 'phase'; readonly phase: SyncPhase }
  | { readonly kind: 'done'; readonly stored: StoreMeta; readonly types: readonly SyncedType[] }
  | { readonly kind: 'refused'; readonly tag: string; readonly failures: number }
  | { readonly kind: 'error'; readonly message: string }
  | { readonly kind: 'checking' }
  | { readonly kind: 'checked'; readonly update: UpdateState };

const NO_UPDATE: UpdateState = { status: 'idle' };

function reduce(state: SyncState, action: SyncAction): SyncState {
  switch (action.kind) {
    case 'loaded':
      return { ...state, stored: action.stored, run: { status: 'idle' } };
    case 'start':
      return { ...state, run: { status: 'running', phase: { kind: 'resolving' } } };
    case 'phase':
      return state.run.status === 'running'
        ? { ...state, run: { status: 'running', phase: action.phase } }
        : state;
    case 'done':
      // Sincronizou: o que a procura sabia sobre versão nova pode ter deixado de valer.
      return {
        stored: action.stored,
        run: { status: 'done', types: action.types },
        update: NO_UPDATE,
      };
    case 'refused':
      return { ...state, run: { status: 'refused', tag: action.tag, failures: action.failures } };
    case 'error':
      return { ...state, run: { status: 'error', message: action.message } };
    case 'checking':
      return { ...state, update: { status: 'checking' } };
    case 'checked':
      return { ...state, update: action.update };
  }
}

/** Só o navegador em dev precisa do proxy; em Node e no Tauri a URL sai direto. */
const http = createFetchHttp({
  headers: { Accept: 'application/vnd.github+json' },
  rewrite: viteProxyRewrite,
});

const store = createIndexedDbStore();
const RECIPES: readonly Recipe<never, never>[] = [conditionRecipe as Recipe<never, never>];

const INITIAL: SyncState = { stored: null, run: { status: 'loading' }, update: NO_UPDATE };

function totalFailures(result: SyncResult): number {
  return result.types.reduce((sum, entry) => sum + entry.failed, 0);
}

export interface UseSync {
  readonly state: SyncState;
  /** Sincroniza a versão em uso — ou a mais recente, numa instalação nova. */
  readonly start: () => void;
  readonly checkUpdate: () => void;
  /** Sobe para a versão indicada. Só grava se rodar com zero falhas. */
  readonly applyUpdate: (tag: string) => void;
}

export function useSync(): UseSync {
  const [state, dispatch] = useReducer(reduce, INITIAL);

  /* Descarta o resultado de execução abandonada — dois cliques rápidos, por exemplo. */
  const runId = useRef(0);

  /* Espelha a tag gravada num ref para os callbacks a lerem sem virar dependência —
     escrever num ref durante a renderização é proibido, daí o efeito. */
  const storedTag = useRef<string | null>(null);
  useEffect(() => {
    storedTag.current = state.stored?.releaseTag ?? null;
  }, [state.stored]);

  useEffect(() => {
    let alive = true;
    readMeta(store)
      .then((stored) => {
        if (alive) dispatch({ kind: 'loaded', stored });
      })
      .catch(() => {
        // Sem base gravada, ou IndexedDB indisponível (janela anônima). Não é erro de
        // sincronização: é só não ter nada ainda.
        if (alive) dispatch({ kind: 'loaded', stored: null });
      });
    return () => {
      alive = false;
    };
  }, []);

  /**
   * `strict` liga a regra da troca de versão: falha de decodificação impede a gravação, e
   * a base anterior continua valendo. Ao re-sincronizar a MESMA versão ela fica desligada
   * — senão uma falha isolada deixaria o usuário travado sem poder atualizar nada.
   */
  const sync = useCallback(
    (tag: string | null, strict: boolean, fallback: string | null = null) => {
      const id = ++runId.current;
      dispatch({ kind: 'start' });

      void (async () => {
        const attempt = async (
          candidate: string | null,
        ): Promise<{ result: SyncResult; failures: number }> => {
          const result = await runSync(http, RECIPES, {
            tag: candidate,
            onPhase: (phase) => {
              if (runId.current === id) dispatch({ kind: 'phase', phase });
            },
          });
          return { result, failures: totalFailures(result) };
        };

        try {
          let { result, failures } = await attempt(tag);

          // Rede de segurança da instalação nova: se a mais recente não decodificar, cai
          // para a última versão conhecidamente boa em vez de deixar o usuário sem base.
          if (failures > 0 && fallback !== null && fallback !== result.releaseTag) {
            ({ result, failures } = await attempt(fallback));
          }

          if (strict && failures > 0) {
            if (runId.current === id) {
              dispatch({ kind: 'refused', tag: result.releaseTag, failures });
            }
            return;
          }

          const persisted = await persistSync(store, result);
          if (runId.current !== id) return;

          const byType = new Map(persisted.types.map((entry) => [entry.type, entry]));
          dispatch({
            kind: 'done',
            stored: persisted.meta,
            types: result.types.map((entry) => {
              const info = byType.get(entry.type);
              return {
                type: entry.type,
                imported: entry.imported,
                failed: entry.failed,
                diff: info?.diff ?? { added: 0, updated: 0, unchanged: 0, removed: 0 },
                retired: info?.retired ?? 0,
              };
            }),
          });
        } catch (error) {
          if (runId.current !== id) return;
          dispatch({
            kind: 'error',
            message: error instanceof Error ? error.message : String(error),
          });
        }
      })();
    },
    [],
  );

  /*
   * Sem base gravada, pega a mais recente — é instalação nova, não há o que preservar.
   * Com base gravada, re-sincroniza a MESMA versão: subir é ato deliberado, pelo botão de
   * atualizar. Ver briefing seção 8 e OPEN-DECISIONS item 10.
   */
  const start = useCallback(() => {
    const current = storedTag.current;
    // Instalação nova: pega a mais recente, com KNOWN_GOOD_TAG como rede.
    // Já tem base: re-sincroniza a MESMA versão. Subir é ato deliberado.
    if (current === null) sync(null, false, KNOWN_GOOD_TAG);
    else sync(current, false);
  }, [sync]);

  const applyUpdate = useCallback(
    (tag: string) => {
      sync(tag, true);
    },
    [sync],
  );

  const checkUpdate = useCallback(() => {
    dispatch({ kind: 'checking' });
    void (async () => {
      try {
        const check = await checkForUpdate(http, RECIPES, storedTag.current);
        dispatch({
          kind: 'checked',
          update: check.hasUpdate
            ? {
                status: 'available',
                tag: check.newest.tag,
                compatible: check.missingPacks.length === 0,
              }
            : { status: 'upToDate' },
        });
      } catch (error) {
        dispatch({
          kind: 'error',
          message: error instanceof Error ? error.message : String(error),
        });
        dispatch({ kind: 'checked', update: NO_UPDATE });
      }
    })();
  }, []);

  return { state, start, checkUpdate, applyUpdate };
}
