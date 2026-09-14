import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import {
  readTranslations,
  sourceHash,
  writeTranslation,
  type Translation,
} from '@core/store/index';
import {
  createLocalProvider,
  machineLanguage,
  readCommunityNames,
  type ProviderAvailability,
  type TranslationMethodId,
  type TranslationProvider,
} from '@core/translation/index';
import { createIndexedDbStore } from '@platform/store-indexeddb';
import { createBergamotTranslator } from '@platform/translator-bergamot';
import { usePreferences } from '@ui/prefs/usePreferences';

const store = createIndexedDbStore();

/*
 * A VERSÃO das traduções gravadas, fora do React, como a do pacote: quem traduz (o botão
 * da lateral) e quem lê (a mesma lateral, o flutuante, a tela completa) são componentes
 * distantes, e um número que sobe é o gatilho de releitura.
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

export function useTranslationsVersion(): number {
  return useSyncExternalStore(subscribe, () => versao);
}

/**
 * A tradução GRAVADA de um campo de uma entrada, na língua da preferência — ou nula. Relê
 * quando uma tradução nova é gravada (a versão sobe) ou a língua muda.
 */
export function useStoredTranslation(
  entityType: string,
  key: string,
  field: string,
): Translation | null {
  const { prefs } = usePreferences();
  const language = prefs.translation.language;
  const version = useTranslationsVersion();
  const token = `${language}/${entityType}/${key}/${field}#${String(version)}`;
  const [loaded, setLoaded] = useState<{ token: string; translation: Translation | null }>({
    token: '',
    translation: null,
  });

  useEffect(() => {
    let alive = true;
    readTranslations(store, language, entityType)
      .then((todas) => {
        if (alive) setLoaded({ token, translation: todas[key]?.[field] ?? null });
      })
      .catch(() => {
        if (alive) setLoaded({ token, translation: null });
      });
    return () => {
      alive = false;
    };
  }, [language, entityType, key, field, token]);

  return loaded.token === token ? loaded.translation : null;
}

/*
 * Os PROVEDORES que existem, por id. Só o local hoje: `manual` é edição (não traduz),
 * `community` é glossário (alimenta os outros), `llm` ainda não existe. A ordem em que
 * se tenta é a das preferências; um id sem provedor é pulado.
 */
const maquina = createBergamotTranslator(store);

async function provedores(
  ids: readonly TranslationMethodId[],
  language: string,
): Promise<TranslationProvider[]> {
  const nomes = await readCommunityNames(store, language);
  const nomeDe = (label: string): string | null => {
    for (const porTipo of Object.values(nomes)) {
      const nome = porTipo[label];
      if (nome !== undefined) return nome;
    }
    return null;
  };
  const todos: Partial<Record<TranslationMethodId, TranslationProvider>> = {
    local: createLocalProvider(maquina, { nameOf: nomeDe }),
  };
  return ids.flatMap((id) => {
    const provedor = todos[id];
    return provedor === undefined ? [] : [provedor];
  });
}

export type TranslateState =
  | { readonly status: 'idle' }
  | { readonly status: 'busy' }
  | { readonly status: 'error'; readonly message: string };

/**
 * O botão TRADUZIR: percorre as formas ligadas na ordem, a primeira disponível traduz, e
 * o resultado vai para `trans/<língua>/<tipo>` — com a forma e a impressão digital do
 * original. Depois, quem lê a tradução gravada (`useStoredTranslation`) vê a nova.
 */
export function useTranslate(): {
  readonly state: TranslateState;
  readonly translate: (entityType: string, key: string, field: string, html: string) => void;
} {
  const { prefs } = usePreferences();
  const { language, methods } = prefs.translation;
  const [state, setState] = useState<TranslateState>({ status: 'idle' });

  const translate = useCallback(
    (entityType: string, key: string, field: string, html: string): void => {
      setState({ status: 'busy' });
      (async () => {
        const candidatos = await provedores(methods, language);
        for (const provedor of candidatos) {
          const disponivel = await provedor.availability(language);
          if (disponivel.kind === 'unavailable') continue;
          const traduzido = await provedor.translate({ language, entityType, key, field, html });
          await writeTranslation(store, language, entityType, key, field, {
            html: traduzido,
            method: provedor.id,
            at: new Date().toISOString(),
            sourceHash: sourceHash(html),
          });
          anunciar();
          setState({ status: 'idle' });
          return;
        }
        setState({ status: 'error', message: 'nenhuma forma de tradução disponível' });
      })().catch((erro: unknown) => {
        setState({ status: 'error', message: erro instanceof Error ? erro.message : String(erro) });
      });
    },
    [language, methods],
  );

  return { state, translate };
}

/** O estado do modelo local para a língua — o que as configurações mostram ao lado dele. */
export function useLocalStatus(language: string): ProviderAvailability | null {
  const version = useTranslationsVersion();
  const [estado, setEstado] = useState<ProviderAvailability | null>(null);
  useEffect(() => {
    let alive = true;
    maquina
      .ready('en', machineLanguage(language))
      .then((resposta) => {
        if (alive) setEstado(resposta);
      })
      .catch(() => {
        if (alive) setEstado({ kind: 'unavailable', why: 'erro ao conferir o modelo' });
      });
    return () => {
      alive = false;
    };
  }, [language, version]);
  return estado;
}
