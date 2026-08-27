import { useEffect, useState } from 'react';

import type { BrowseEntity } from '@core/browse/index';
import { readBase } from '@core/store/index';
import { createIndexedDbStore } from '@platform/store-indexeddb';

const store = createIndexedDbStore();

export type BaseState =
  | { readonly status: 'loading' }
  | { readonly status: 'empty' }
  | { readonly status: 'ready'; readonly entities: readonly BrowseEntity[] };

const LOADING: BaseState = { status: 'loading' };
const EMPTY: BaseState = { status: 'empty' };

/**
 * Lê as entidades de um tipo do armazenamento.
 *
 * Relê quando `type` ou `version` mudam — é assim que a lista se atualiza depois de uma
 * sincronização, sem este hook precisar saber que a sincronização existe.
 *
 * O resultado guarda o token do pedido que o produziu, e "carregando" é DERIVADO da
 * comparação. A alternativa óbvia — `setState(carregando)` no começo do efeito — provoca
 * uma renderização em cascata a cada troca, e o React avisa sobre isso.
 */
export function useBase(type: string | null, version: string | null): BaseState {
  const token = `${type ?? '-'}@${version ?? '-'}`;
  const [loaded, setLoaded] = useState<{ token: string; state: BaseState } | null>(null);

  useEffect(() => {
    // Fonte sem receita não tem o que ler: o estado é derivado abaixo, não escrito aqui.
    if (type === null) return;

    let alive = true;
    readBase(store, type)
      .then((entities) => {
        if (!alive) return;
        setLoaded({
          token,
          state:
            entities === null || entities.length === 0
              ? { status: 'empty' }
              : { status: 'ready', entities },
        });
      })
      .catch(() => {
        if (alive) setLoaded({ token, state: { status: 'empty' } });
      });

    return () => {
      alive = false;
    };
  }, [type, token]);

  if (type === null) return EMPTY;
  return loaded?.token === token ? loaded.state : LOADING;
}
