import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import {
  fetchCommunityPack,
  latestCommunityTag,
  readCommunityMeta,
  writeCommunityPack,
  type CommunityMeta,
} from '@core/translation/index';
import { createFetchHttp, viteProxyRewrite } from '@platform/http-fetch';
import { createIndexedDbStore } from '@platform/store-indexeddb';

const http = createFetchHttp({
  headers: { Accept: 'application/vnd.github+json' },
  rewrite: viteProxyRewrite,
});
const store = createIndexedDbStore();

/*
 * A VERSÃO do pacote baixado, como um contador fora do React: quem lê o glossário
 * traduzido (a tela de consulta) e quem baixa (as configurações) estão longe um do
 * outro, e um contexto para um número só seria cerimônia. `useSyncExternalStore` é o
 * jeito do React de assinar um valor assim.
 */
let versao = 0;
const ouvintes = new Set<() => void>();
const subscribe = (ouvinte: () => void): (() => void) => {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
};
const anunciar = (): void => {
  versao += 1;
  for (const ouvinte of ouvintes) ouvinte();
};

/** Sobe a cada pacote baixado; é o gatilho de releitura do glossário traduzido. */
/**
 * Baixa o glossário da língua e o grava (Etapa 44): é o que a sincronização chama depois
 * de gravar a base, e o que o botão das configurações chama à mão. Anuncia para quem lê.
 */
export async function downloadCommunityPack(language: string): Promise<CommunityMeta> {
  const tag = await latestCommunityTag(http);
  const pack = await fetchCommunityPack(http, tag);
  const meta = await writeCommunityPack(store, language, pack, new Date().toISOString());
  anunciar();
  return meta;
}

export function useCommunityPackVersion(): number {
  return useSyncExternalStore(subscribe, () => versao);
}

export type CommunityPackState =
  | { readonly status: 'loading' }
  | { readonly status: 'absent' }
  | { readonly status: 'ready'; readonly meta: CommunityMeta }
  | { readonly status: 'downloading'; readonly meta: CommunityMeta | null }
  | { readonly status: 'error'; readonly message: string; readonly meta: CommunityMeta | null };

/**
 * O pacote da comunidade para a língua: o que há gravado, e o botão de baixar.
 *
 * Baixar é A PEDIDO, nas configurações — não junto da sincronização. O pacote tem tag e
 * ciclo próprios, e a pessoa pode não querer o vocabulário da comunidade.
 */
export function useCommunityPack(language: string): {
  readonly state: CommunityPackState;
  readonly download: () => void;
} {
  const [state, setState] = useState<CommunityPackState>({ status: 'loading' });
  const version = useCommunityPackVersion();

  useEffect(() => {
    let alive = true;
    readCommunityMeta(store, language)
      .then((meta) => {
        if (alive) setState(meta === null ? { status: 'absent' } : { status: 'ready', meta });
      })
      .catch(() => {
        if (alive) setState({ status: 'absent' });
      });
    return () => {
      alive = false;
    };
  }, [language, version]);

  const download = useCallback((): void => {
    const anterior = state.status === 'ready' ? state.meta : null;
    setState({ status: 'downloading', meta: anterior });
    downloadCommunityPack(language)
      .then((meta) => {
        setState({ status: 'ready', meta });
      })
      .catch((error: unknown) => {
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
          meta: anterior,
        });
      });
  }, [language, state]);

  return { state, download };
}
