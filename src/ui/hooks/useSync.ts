import { useCallback, useEffect, useReducer, useRef } from 'react';

import {
  actionRecipe,
  backgroundRecipe,
  conditionRecipe,
  equipmentRecipe,
  featRecipe,
  skillRecipe,
  spellRecipe,
} from '@core/normalization/index';
import type { Recipe } from '@core/normalization/index';
import { KNOWN_GOOD_TAG } from '@core/source/index';
import { persistSync } from '@core/sync/persist';
import { decideSync } from '@core/sync/policy';
import type { UnreadPack } from '@core/sync/unread-packs';
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
  readonly staleRetired: number;
}

export type RunState =
  | { readonly status: 'loading' }
  | { readonly status: 'idle' }
  | { readonly status: 'running'; readonly phase: SyncPhase }
  | {
      readonly status: 'done';
      readonly types: readonly SyncedType[];
      /** Packs com conteúdo do nosso interesse que nenhuma receita lê. */
      readonly unreadPacks: readonly UnreadPack[];
    }
  /**
   * Rodou e NÃO adotou: a versão candidata não decodificou limpa. Nada foi gravado, e a
   * base anterior continua valendo.
   *
   * `keeping` é o que importa para quem lê: saber em qual versão a mesa ficou vale mais
   * que saber qual foi recusada.
   */
  | {
      readonly status: 'refused';
      readonly rejected: string;
      readonly failures: number;
      readonly keeping: string;
      /**
       * O motivo REAL, quando a tentativa explodiu em vez de decodificar sujo.
       *
       * ⚠️ Ele era jogado fora, e a tela dizia "não foi possível ler a versão mais nova"
       * para qualquer coisa que desse errado — rede caída, GitHub recusando, zip
       * corrompido, IndexedDB sem espaço. Uma frase que AFIRMA um diagnóstico que o código
       * não fez, e que deixa quem lê sem nada para investigar.
       */
      readonly reason?: string;
    }
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
  | {
      readonly kind: 'done';
      readonly stored: StoreMeta;
      readonly types: readonly SyncedType[];
      readonly unreadPacks: readonly UnreadPack[];
    }
  | {
      readonly kind: 'refused';
      readonly rejected: string;
      readonly failures: number;
      readonly keeping: string;
      readonly reason?: string;
    }
  | { readonly kind: 'error'; readonly message: string }
  | { readonly kind: 'checking' }
  | { readonly kind: 'checked'; readonly update: UpdateState };

const NO_UPDATE: UpdateState = { status: 'idle' };

/**
 * O que uma sincronização está tentando fazer.
 *
 * União nomeada, e não três parâmetros soltos: antes era `sync(tag, strict, fallback)`, e
 * a combinação certa era convenção — nada impedia pedir "estrito com fallback", que não
 * faz sentido. Aqui só as combinações válidas são escrevíveis.
 */
type SyncPlan =
  /** Sobe para a mais nova. Se ela não decodificar limpa, fica onde já está. */
  | { readonly kind: 'newest' }
  /** Exatamente esta versão, escolhida pelo usuário na tela de configurações. */
  | { readonly kind: 'pinned'; readonly tag: string };

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
        run: { status: 'done', types: action.types, unreadPacks: action.unreadPacks },
        update: NO_UPDATE,
      };
    case 'refused':
      return {
        ...state,
        run: {
          status: 'refused',
          rejected: action.rejected,
          failures: action.failures,
          keeping: action.keeping,
          ...(action.reason === undefined ? {} : { reason: action.reason }),
        },
      };
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
const RECIPES: readonly Recipe<never, never>[] = [
  conditionRecipe as Recipe<never, never>,
  actionRecipe as Recipe<never, never>,
  featRecipe as Recipe<never, never>,
  spellRecipe as Recipe<never, never>,
  equipmentRecipe as Recipe<never, never>,
  skillRecipe as Recipe<never, never>,
  backgroundRecipe as Recipe<never, never>,
];

const INITIAL: SyncState = { stored: null, run: { status: 'loading' }, update: NO_UPDATE };

function totalFailures(result: SyncResult): number {
  // Falha ao reler um aposentado NÃO bloqueia atualização de versão: ela indica receita a
  // consertar, e a projeção anterior daquele aposentado continua valendo.
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
   * A política de versão, num lugar só.
   *
   *   PRIORIDADE      a versão MAIS NOVA. É onde a mesa quer estar.
   *   PISO            a última que deu certo — a gravada no `meta`, e não uma constante
   *                   no código. Numa instalação nova, onde não há histórico, o piso é o
   *                   `KNOWN_GOOD_TAG`.
   *
   * A TOLERÂNCIA a falhas é DERIVADA, não escolhida por quem chama: só existe quando o
   * alvo é a versão que já está gravada. Aí você está reparando a base que já tem, e
   * recusar deixaria o usuário preso a uma base corrompida sem poder refazê-la. Trocar
   * de versão nunca tolera — não vale trocar uma base boa por uma pior.
   */
  const sync = useCallback((plan: SyncPlan) => {
    const id = ++runId.current;
    const atual = storedTag.current;
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
        let { result, failures } = await attempt(plan.kind === 'pinned' ? plan.tag : null);

        /*
         * A decisão mora em `core/sync/policy.ts`, com nome e teste. Aqui fica só a
         * EXECUÇÃO dela — a parte que precisa de rede e de armazenamento.
         */
        let decisao = decideSync({
          resolvedTag: result.releaseTag,
          failures,
          storedTag: atual,
          floorTag: KNOWN_GOOD_TAG,
        });

        if (decisao.kind === 'fallback') {
          ({ result, failures } = await attempt(decisao.tag));
          decisao = decideSync({
            resolvedTag: result.releaseTag,
            failures,
            storedTag: atual,
            floorTag: KNOWN_GOOD_TAG,
            floorTried: true,
          });
        }

        if (decisao.kind === 'keep') {
          if (runId.current === id) {
            dispatch({
              kind: 'refused',
              rejected: result.releaseTag,
              failures,
              keeping: decisao.keeping,
            });
          }
          return;
        }

        const persisted = await persistSync(store, result);
        if (runId.current !== id) return;

        const byType = new Map(persisted.types.map((entry) => [entry.type, entry]));
        dispatch({
          kind: 'done',
          stored: persisted.meta,
          unreadPacks: result.unreadPacks,
          types: result.types.map((entry) => {
            const info = byType.get(entry.type);
            return {
              type: entry.type,
              imported: entry.imported,
              failed: entry.failed,
              diff: info?.diff ?? { added: 0, updated: 0, unchanged: 0, removed: 0 },
              retired: info?.retired ?? 0,
              staleRetired: info?.staleRetired ?? 0,
            };
          }),
        });
      } catch (error) {
        if (runId.current !== id) return;

        /*
         * Tentar subir e explodir não é erro: é uma subida que não aconteceu.
         *
         * `runSync` LANÇA quando o release novo não declara mais um pack que a receita
         * pede — foi o cenário que motivou a política inteira. Havendo base gravada, a
         * mesa simplesmente continua nela; erro vermelho fica para quem não tem base
         * nenhuma e ficou sem nada.
         */
        if (atual !== null && plan.kind === 'newest') {
          dispatch({
            kind: 'refused',
            rejected: '',
            failures: 0,
            keeping: atual,
            // O motivo VAI JUNTO. Ficar só com "não foi possível" transforma uma falha
            // investigável — a rede, a cota do GitHub, o disco — em mistério.
            reason: error instanceof Error ? error.message : String(error),
          });
          return;
        }

        dispatch({
          kind: 'error',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    })();
  }, []);

  /**
   * Sincronizar sempre MIRA na mais nova.
   *
   * Era "re-sincroniza a mesma versão, subir é ato deliberado". Mudou por decisão do
   * autor: a mesa joga sempre na mais atualizada, então estar na mais nova é o alvo, e a
   * última que deu certo é só o piso para quando a nova não presta.
   *
   * ⚠️ O que se perdeu com isso, e vale saber: o clique deliberado era o que fazia a mesa
   * inteira subir junto. Agora quem sincronizar na terça pode pegar um release que saiu
   * depois de quem sincronizou na segunda. O risco já existia — qualquer um podia clicar
   * em atualizar — e a defesa é a mesma de antes: a versão fica visível na barra de topo.
   */
  const start = useCallback(() => {
    sync({ kind: 'newest' });
  }, [sync]);

  /** Fixar uma versão específica continua existindo: é como a mesa se realinha. */
  const applyUpdate = useCallback(
    (tag: string) => {
      sync({ kind: 'pinned', tag });
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
