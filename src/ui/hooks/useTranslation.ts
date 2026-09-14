import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import {
  deleteTranslation,
  readTranslations,
  sourceHash,
  writeTranslation,
  type Translation,
} from '@core/store/index';
import {
  createLlmProvider,
  dictionaryPhrases,
  namePhrases,
  pairTerms,
  readCommunityDictionary,
  readCommunityNames,
  readCommunityTerms,
  type TranslationProvider,
} from '@core/translation/index';
import { readGlossary } from '@core/store/index';
import { createIndexedDbStore } from '@platform/store-indexeddb';
import { createGeminiChat } from '@platform/gemini';
import { createBrowserSecretStore, LLM_KEY_SECRET } from '@platform/secrets';
import { KEY_PREFERENCES, readPreferences } from '@core/prefs/index';
import { strings } from '@i18n/index';
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
 * O PROVEDOR (Etapa 42: um só — o modelo de linguagem; a hierarquia de formas saiu). A
 * chave mora nos segredos, nunca nas preferências (Etapa 41). O glossário do pacote entra
 * aqui, montado a cada tradução — é uma leitura do armazenamento, e o pacote pode ter
 * sido baixado depois do app abrir.
 */
const segredos = createBrowserSecretStore();
const gemini = createGeminiChat(() => segredos.get(LLM_KEY_SECRET));

async function provedor(language: string, llmModel: string): Promise<TranslationProvider> {
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
  return createLlmProvider(
    gemini,
    async () => {
      const chave = await segredos.get(LLM_KEY_SECRET);
      return { model: llmModel, hasKey: chave !== null && chave !== '' };
    },
    { nameOf: nomeDe, phrases: frases },
  );
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
 * O botão TRADUZIR: o provedor traduz TODOS os campos do escopo do botão (Etapa 35, pelo
 * autor: "cada botão respeitando todo o seu escopo" — a lateral traduz o `main` e as
 * tabelas; a tela completa, a página, o apêndice e as tabelas), e cada resultado vai para
 * `trans/<língua>/<tipo>` com a forma e a impressão digital do original. Um campo já
 * traduzido do MESMO original é pulado: a lateral pode ter traduzido a tabela antes da
 * tela completa. Sem chave, o botão diz isso. Depois, quem lê a tradução gravada
 * (`useStoredTranslations`) vê as novas.
 */
export function useTranslate(): {
  readonly state: TranslateState;
  readonly translate: (entityType: string, key: string, fields: readonly TranslateField[]) => void;
} {
  const { prefs } = usePreferences();
  const { language } = prefs.translation;
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
        const tradutor = await provedor(language, llmModel);
        const disponivel = await tradutor.availability(language);
        if (disponivel.kind !== 'ready') {
          setState({ status: 'error', message: strings.settings.translation.llm.noKey });
          return;
        }
        for (const { field, html } of pendentes) {
          const traduzido = await tradutor.translate({ language, entityType, key, field, html });
          await writeTranslation(store, language, entityType, key, field, {
            html: traduzido,
            method: tradutor.id,
            at: new Date().toISOString(),
            sourceHash: sourceHash(html),
          });
          /* Anuncia campo a campo: a tela mostra o que já chegou enquanto o resto traduz. */
          anunciar();
        }
        setState({ status: 'idle' });
      })().catch((erro: unknown) => {
        setState({ status: 'error', message: erro instanceof Error ? erro.message : String(erro) });
      });
    },
    [language, llmModel],
  );

  return { state, translate };
}

/**
 * A EDIÇÃO MANUAL (Etapa 43): grava o HTML da pessoa como `manual` — que a máquina nunca
 * sobrescreve — com a impressão digital do original de hoje; e apaga uma tradução, que é
 * o único caminho de volta da manual. As duas anunciam, para as telas relerem. A língua
 * vem das preferências gravadas, lida na hora: fora de hook, porque quem chama é o
 * editor num evento.
 */
export async function saveManualTranslation(
  entityType: string,
  key: string,
  field: string,
  html: string,
  original: string,
): Promise<void> {
  const { translation } = readPreferences(await store.get(KEY_PREFERENCES));
  await writeTranslation(store, translation.language, entityType, key, field, {
    html,
    method: 'manual',
    at: new Date().toISOString(),
    sourceHash: sourceHash(original),
  });
  anunciar();
}

export async function deleteStoredTranslation(
  entityType: string,
  key: string,
  field: string,
): Promise<void> {
  const { translation } = readPreferences(await store.get(KEY_PREFERENCES));
  await deleteTranslation(store, translation.language, entityType, key, field);
  anunciar();
}

/** Há chave guardada? `null` enquanto confere. O botão Traduzir apaga sem ela (Etapa 44). */
export function useHasLlmKey(): boolean | null {
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
  return hasKey;
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
  const hasKey = useHasLlmKey();

  const save = useCallback(async (key: string) => {
    await segredos.set(LLM_KEY_SECRET, key.trim());
    anunciar();
  }, []);
  const forget = useCallback(async () => {
    await segredos.delete(LLM_KEY_SECRET);
    anunciar();
  }, []);
  const test = useCallback(async () => {
    const tradutor = await provedor(language, llmModel);
    try {
      const html = await tradutor.translate({
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
