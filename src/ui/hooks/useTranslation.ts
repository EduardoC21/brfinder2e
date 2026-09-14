import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import {
  readTranslations,
  sourceHash,
  writeTranslation,
  type Translation,
} from '@core/store/index';
import {
  createLlmProvider,
  createLocalProvider,
  dictionaryPhrases,
  machineLanguage,
  namePhrases,
  pairTerms,
  readCommunityDictionary,
  readCommunityNames,
  readCommunityTerms,
  type ProviderAvailability,
  type TranslationMethodId,
  type TranslationProvider,
} from '@core/translation/index';
import { readGlossary } from '@core/store/index';
import { createIndexedDbStore } from '@platform/store-indexeddb';
import { createGeminiChat } from '@platform/gemini';
import { createBrowserSecretStore, LLM_KEY_SECRET } from '@platform/secrets';
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

const NENHUMA: Readonly<Record<string, Translation>> = {};

/**
 * As traduções GRAVADAS de uma entrada, por campo, na língua da preferência — vazio sem
 * nenhuma. Por entrada e não por campo (Etapa 35): a lateral mostra o `main` E as tabelas,
 * a tela completa mostra a página, o apêndice E as tabelas — e é uma leitura só. Relê
 * quando uma tradução nova é gravada (a versão sobe) ou a língua muda.
 */
export function useStoredTranslations(
  entityType: string,
  key: string,
): Readonly<Record<string, Translation>> {
  const { prefs } = usePreferences();
  const language = prefs.translation.language;
  const version = useTranslationsVersion();
  const token = `${language}/${entityType}/${key}#${String(version)}`;
  const [loaded, setLoaded] = useState<{
    token: string;
    translations: Readonly<Record<string, Translation>>;
  }>({ token: '', translations: NENHUMA });

  useEffect(() => {
    let alive = true;
    readTranslations(store, language, entityType)
      .then((todas) => {
        if (alive) setLoaded({ token, translations: todas[key] ?? NENHUMA });
      })
      .catch(() => {
        if (alive) setLoaded({ token, translations: NENHUMA });
      });
    return () => {
      alive = false;
    };
  }, [language, entityType, key, token]);

  return loaded.token === token ? loaded.translations : NENHUMA;
}

/** A tradução gravada de UM campo, ou nula. */
export function useStoredTranslation(
  entityType: string,
  key: string,
  field: string,
): Translation | null {
  return useStoredTranslations(entityType, key)[field] ?? null;
}

/*
 * Os PROVEDORES que existem, por id. Só o local hoje: `manual` é edição (não traduz),
 * `community` é glossário (alimenta os outros), `llm` ainda não existe. A ordem em que
 * se tenta é a das preferências; um id sem provedor é pulado.
 */
const maquina = createBergamotTranslator(store);
/* A chave do modelo de linguagem mora nos segredos, nunca nas preferências (Etapa 41). */
const segredos = createBrowserSecretStore();
const gemini = createGeminiChat(() => segredos.get(LLM_KEY_SECRET));

async function provedores(
  ids: readonly TranslationMethodId[],
  language: string,
  llmModel: string,
): Promise<TranslationProvider[]> {
  const nomes = await readCommunityNames(store, language);
  const nomeDe = (label: string): string | null => {
    for (const porTipo of Object.values(nomes)) {
      const nome = porTipo[label];
      if (nome !== undefined) return nome;
    }
    return null;
  };
  /*
   * O GLOSSÁRIO do pacote (Etapa 35): os termos emparelhados pela chave (inglês da base,
   * português do pacote), as frases fixas do dicionário, e os nomes de condição e ação.
   * Os fixos do app (`CORE_PHRASES`) vêm antes e vencem no empate.
   */
  const termosEn = await readGlossary(store, 'terms-en');
  const termosPt = await readCommunityTerms(store, language);
  const dicionario = await readCommunityDictionary(store, language);
  const en: Record<string, string> = {};
  for (const [k, v] of Object.entries(termosEn ?? {})) if (typeof v === 'string') en[k] = v;
  const frases = [
    ...pairTerms(en, termosPt),
    ...dictionaryPhrases(dicionario),
    ...namePhrases(nomes),
  ];
  const glossario = { nameOf: nomeDe, phrases: frases };
  const todos: Partial<Record<TranslationMethodId, TranslationProvider>> = {
    llm: createLlmProvider(
      gemini,
      async () => ({ model: llmModel, hasKey: (await segredos.get(LLM_KEY_SECRET)) !== null }),
      glossario,
    ),
    local: createLocalProvider(maquina, glossario),
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

/** Um campo a traduzir: o nome dele em `desc/` e o texto original. */
export interface TranslateField {
  readonly field: string;
  readonly html: string;
}

/**
 * O botão TRADUZIR: percorre as formas ligadas na ordem, a primeira disponível traduz
 * TODOS os campos do escopo do botão (Etapa 35, pelo autor: "cada botão respeitando todo
 * o seu escopo" — a lateral traduz o `main` e as tabelas; a tela completa, a página, o
 * apêndice e as tabelas), e cada resultado vai para `trans/<língua>/<tipo>` com a forma e
 * a impressão digital do original. Um campo já traduzido do MESMO original é pulado: a
 * lateral pode ter traduzido a tabela antes da tela completa. Depois, quem lê a tradução
 * gravada (`useStoredTranslations`) vê as novas.
 */
export function useTranslate(): {
  readonly state: TranslateState;
  readonly translate: (entityType: string, key: string, fields: readonly TranslateField[]) => void;
} {
  const { prefs } = usePreferences();
  const { language, methods } = prefs.translation;
  const llmModel = prefs.translation.llm.model;
  const [state, setState] = useState<TranslateState>({ status: 'idle' });

  const translate = useCallback(
    (entityType: string, key: string, fields: readonly TranslateField[]): void => {
      setState({ status: 'busy' });
      (async () => {
        const gravadas = (await readTranslations(store, language, entityType))[key] ?? {};
        const pendentes = fields.filter(
          ({ field, html }) => html !== '' && gravadas[field]?.sourceHash !== sourceHash(html),
        );
        if (pendentes.length === 0) {
          setState({ status: 'idle' });
          return;
        }
        const candidatos = await provedores(methods, language, llmModel);
        for (const provedor of candidatos) {
          const disponivel = await provedor.availability(language);
          if (disponivel.kind === 'unavailable') continue;
          for (const { field, html } of pendentes) {
            const traduzido = await provedor.translate({ language, entityType, key, field, html });
            await writeTranslation(store, language, entityType, key, field, {
              html: traduzido,
              method: provedor.id,
              at: new Date().toISOString(),
              sourceHash: sourceHash(html),
            });
            /* Anuncia campo a campo: a tela mostra o que já chegou enquanto o resto traduz. */
            anunciar();
          }
          setState({ status: 'idle' });
          return;
        }
        setState({ status: 'error', message: 'nenhuma forma de tradução disponível' });
      })().catch((erro: unknown) => {
        setState({ status: 'error', message: erro instanceof Error ? erro.message : String(erro) });
      });
    },
    [language, methods, llmModel],
  );

  return { state, translate };
}

/**
 * A CHAVE do modelo de linguagem, para as configurações (Etapa 41): se há uma guardada,
 * guardar, esquecer, e testar — traduz uma frase curta pelo provedor de verdade e devolve
 * o texto, ou o erro. A versão das traduções sobe ao mudar a chave, para quem confere a
 * disponibilidade reler.
 */
export function useLlmKey(): {
  readonly hasKey: boolean | null;
  readonly save: (key: string) => Promise<void>;
  readonly forget: () => Promise<void>;
  readonly test: () => Promise<{ ok: true; text: string } | { ok: false; why: string }>;
} {
  const { prefs } = usePreferences();
  const { language } = prefs.translation;
  const llmModel = prefs.translation.llm.model;
  const version = useTranslationsVersion();
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    segredos
      .get(LLM_KEY_SECRET)
      .then((chave) => {
        if (alive) setHasKey(chave !== null && chave !== '');
      })
      .catch(() => {
        if (alive) setHasKey(false);
      });
    return () => {
      alive = false;
    };
  }, [version]);

  const save = useCallback(async (key: string) => {
    await segredos.set(LLM_KEY_SECRET, key.trim());
    anunciar();
  }, []);
  const forget = useCallback(async () => {
    await segredos.delete(LLM_KEY_SECRET);
    anunciar();
  }, []);
  const test = useCallback(async () => {
    const [provedor] = await provedores(['llm'], language, llmModel);
    if (provedor === undefined) return { ok: false as const, why: 'sem provedor' };
    try {
      const html = await provedor.translate({
        language,
        entityType: 'teste',
        key: 'teste',
        field: 'main',
        html: '<p>Make a melee Strike against the target. On a hit, it is Frightened 1.</p>',
      });
      return { ok: true as const, text: html.replace(/<[^>]+>/g, '') };
    } catch (erro: unknown) {
      return { ok: false as const, why: erro instanceof Error ? erro.message : String(erro) };
    }
  }, [language, llmModel]);

  return { hasKey, save, forget, test };
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
