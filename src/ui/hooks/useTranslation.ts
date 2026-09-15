import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import {
  deleteTranslation,
  readDesc,
  readTranslations,
  sourceHash,
  writeTranslation,
  type Translation,
} from '@core/store/index';
import {
  createLlmProvider,
  dictionaryPhrases,
  NAME_FIELD,
  namePhrases,
  pairTerms,
  readCommunityDictionary,
  readCommunityNames,
  readCommunityTerms,
  type LlmModel,
  type TranslationProvider,
} from '@core/translation/index';
import { embedTargets } from '@core/markup/index';
import { readGlossary } from '@core/store/index';
import { translatedName, translatedNameOf } from '@ui/text';
import { createIndexedDbStore } from '@platform/store-indexeddb';
import { createGeminiChat } from '@platform/gemini';
import { createBrowserSecretStore, LLM_KEY_SECRET } from '@platform/secrets';
import { isRecord } from '@core/json';
import { KEY_PREFERENCES, readPreferences } from '@core/prefs/index';
import { strings } from '@i18n/index';
import { usePreferences } from '@ui/prefs/usePreferences';

import { forgetUse, offeredNow, submitBestEffort } from './useCentral';

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

/** Para quem grava fora deste módulo (a central): as telas releem. */
export function announceTranslations(): void {
  anunciar();
}

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
  const entrada = `${language}/${entityType}/${key}`;
  const token = `${entrada}#${String(version)}`;
  const [loaded, setLoaded] = useState<{
    entrada: string;
    token: string;
    translations: Readonly<Record<string, Translation>>;
  }>({ entrada: '', token: '', translations: NENHUMA });

  useEffect(() => {
    let alive = true;
    readTranslations(store, language, entityType)
      .then((todas) => {
        if (alive) setLoaded({ entrada, token, translations: todas[key] ?? NENHUMA });
      })
      .catch(() => {
        if (alive) setLoaded({ entrada, token, translations: NENHUMA });
      });
    return () => {
      alive = false;
    };
  }, [language, entityType, key, entrada, token]);

  /*
   * Enquanto RELÊ a mesma entrada (a versão subiu), devolve o que já tinha: era isto que
   * piscava — vazio por um instante, original na tela, tradução de volta (Etapa 50). Só
   * entrada OUTRA começa vazia.
   */
  return loaded.entrada === entrada ? loaded.translations : NENHUMA;
}

/**
 * Os NOMES gravados (Etapa 45): para cada fonte carregada, os `name` traduzidos em
 * `trans/<língua>/<tipo>`, indexados pelo nome ORIGINAL — que é como a tela pergunta
 * (`displayName(tipo, nome)`). Precisa das entidades para ligar a chave ao nome. Relê
 * quando uma tradução é gravada.
 */
export function useStoredNames(
  sources: readonly { readonly type: string; readonly names: ReadonlyMap<string, string> }[],
): Readonly<Record<string, Readonly<Record<string, string>>>> {
  const { prefs } = usePreferences();
  const language = prefs.translation.language;
  const version = useTranslationsVersion();
  const [tabela, setTabela] = useState<Readonly<Record<string, Readonly<Record<string, string>>>>>(
    {},
  );
  useEffect(() => {
    let alive = true;
    const ler = async (): Promise<Record<string, Record<string, string>>> => {
      const out: Record<string, Record<string, string>> = {};
      for (const fonte of sources) {
        const todas = await readTranslations(store, language, fonte.type);
        for (const [key, campos] of Object.entries(todas)) {
          const nome = campos['name'];
          const original = fonte.names.get(key);
          if (nome === undefined || original === undefined || nome.html.trim() === '') continue;
          const porTipo = out[fonte.type] ?? {};
          porTipo[original] = nome.html.trim();
          out[fonte.type] = porTipo;
        }
      }
      return out;
    };
    ler()
      .then((out) => {
        if (alive) setTabela(out);
      })
      .catch(() => {
        if (alive) setTabela({});
      });
    return () => {
      alive = false;
    };
  }, [sources, language, version]);
  return tabela;
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
  /*
   * O nome de um rótulo de referência: o glossário, e por cima dele os nomes GRAVADOS
   * (Etapa 46) — pela tabela que a tela já montou (`setNameTable`), que junta os dois.
   * Assim o link para o Necromancer dentro de outra prosa sai "Necromante".
   */
  const nomeDe = (label: string): string | null => {
    const gravado = translatedNameOf(label);
    if (gravado !== null) return gravado;
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
  /** `done` de `total` campos já traduzidos — o botão mostra "Traduzindo… 3/8". */
  | { readonly status: 'busy'; readonly done: number; readonly total: number }
  | { readonly status: 'error'; readonly message: string };

/** Um campo a traduzir: o nome dele em `desc/` e o texto original (lido de `desc/` se ausente). */
export interface TranslateField {
  readonly field: string;
  readonly html?: string;
}

/** Um trabalho SUBSEQUENTE (Etapa 49): a entrada colada por `@Embed` na prosa que se traduz. */
export interface TranslateJob {
  readonly entityType: string;
  readonly key: string;
  readonly fields: readonly TranslateField[];
}

/**
 * Os trabalhos SUBSEQUENTES de um HTML (Etapa 49, pelo autor: "se está metade de um texto
 * e metade do outro, deveria fazer uma tradução subsequente"): cada `@Embed` que a ponte
 * resolve vira um trabalho — o `main` do alvo, e o nome se o glossário não o tem. Os links
 * NÃO entram: o que está atrás de um clique se traduz quando se abre.
 */
export function embedJobs(
  htmls: readonly string[],
  resolve: (
    uuid: string,
  ) => { readonly entityType: string; readonly key: string; readonly name: string } | null,
): TranslateJob[] {
  const jobs: TranslateJob[] = [];
  for (const html of htmls) {
    for (const alvo of embedTargets(html)) {
      const destino = resolve(alvo);
      if (destino === null || jobs.some((j) => j.key === destino.key)) continue;
      jobs.push({
        entityType: destino.entityType,
        key: destino.key,
        fields: [...campoDoNome(destino.entityType, destino.name), { field: 'main' }],
      });
    }
  }
  return jobs;
}

/**
 * O NOME como campo do escopo (Etapa 45): só quando o glossário da comunidade não o tem —
 * o glossário é a nomenclatura oficial, e o modelo só preenche o buraco (Necromancer, das
 * classes novas). Lido pela tabela da tela, que já tem o glossário mais os gravados.
 */
export function campoDoNome(entityType: string, name: string): TranslateField[] {
  return translatedName(entityType, name) === null ? [{ field: NAME_FIELD, html: name }] : [];
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
  readonly translate: (
    entityType: string,
    key: string,
    fields: readonly TranslateField[],
    /** As coladas: traduzidas em seguida, cada uma na própria chave. */
    extras?: readonly TranslateJob[],
    /** Refaz mesmo o que já está gravado do mesmo original — "Traduzir a minha" (55). */
    force?: boolean,
  ) => void;
} {
  const { prefs } = usePreferences();
  const { language } = prefs.translation;
  const llmModel = prefs.translation.llm.model;
  const autoAceitar = prefs.translation.central.autoAccept;
  const [state, setState] = useState<TranslateState>({ status: 'idle' });

  const translate = useCallback(
    (
      entityType: string,
      key: string,
      fields: readonly TranslateField[],
      extras: readonly TranslateJob[] = [],
      force = false,
    ): void => {
      setState({ status: 'busy', done: 0, total: 0 });
      /*
       * ANUNCIA UMA VEZ, no fim (Etapa 50, pelo autor: "a tela fica piscando ao longo da
       * tradução"): o texto troca de uma vez quando o escopo inteiro terminou; no meio, o
       * botão mostra o progresso. Se der erro no meio, anuncia o que já gravou.
       */
      let gravou = false;
      (async () => {
        const tradutor = await provedor(language, llmModel);
        const disponivel = await tradutor.availability(language);
        if (disponivel.kind !== 'ready') {
          setState({ status: 'error', message: strings.settings.translation.llm.noKey });
          return;
        }
        const trabalhos: { job: TranslateJob; pendentes: { field: string; html: string }[] }[] = [];
        for (const job of [{ entityType, key, fields }, ...extras]) {
          const gravadas = (await readTranslations(store, language, job.entityType))[job.key] ?? {};
          /* O texto que não veio (as coladas) é lido de `desc/`; o `name` sempre vem. */
          const descricao = job.fields.some((f) => f.html === undefined)
            ? await readDesc(store, job.entityType)
            : null;
          const entrada = descricao?.[job.key];
          const textos = job.fields.map(({ field, html }) => {
            const lido = isRecord(entrada) ? entrada[field] : undefined;
            return { field, html: html ?? (typeof lido === 'string' ? lido : '') };
          });
          /* Forçado: refaz o que não é manual (a manual nunca se sobrescreve). */
          const pendentes = textos.filter(
            ({ field, html }) =>
              html !== '' &&
              (force
                ? gravadas[field]?.method !== 'manual'
                : gravadas[field]?.sourceHash !== sourceHash(html)),
          );
          trabalhos.push({ job, pendentes });
        }
        const total = trabalhos.reduce((n, t) => n + t.pendentes.length, 0);
        let done = 0;
        setState({ status: 'busy', done, total });
        for (const { job, pendentes } of trabalhos) {
          for (const { field, html } of pendentes) {
            /*
             * A CENTRAL antes do modelo (Etapa 55), se a pessoa ligou "aceitar sem
             * perguntar": uma candidata que casa com este original entra como `shared`,
             * sem gastar um pedido.
             */
            const pronta = autoAceitar
              ? await offeredNow(job.entityType, job.key, field, html)
              : null;
            const gravada: Translation =
              pronta?.translation ??
              ({
                html: await tradutor.translate({
                  language,
                  entityType: job.entityType,
                  key: job.key,
                  field,
                  html,
                }),
                method: tradutor.id,
                at: new Date().toISOString(),
                sourceHash: sourceHash(html),
              } satisfies Translation);
            await writeTranslation(store, language, job.entityType, job.key, field, gravada);
            gravou = true;
            done += 1;
            setState({ status: 'busy', done, total });
            /* O que a máquina traduziu sobe para a central, sem esperar e sem derrubar. */
            if (pronta === null) {
              void submitBestEffort(job.entityType, job.key, field, html, gravada, llmModel);
            }
          }
        }
        if (gravou) anunciar();
        setState({ status: 'idle' });
      })().catch((erro: unknown) => {
        if (gravou) anunciar();
        setState({ status: 'error', message: erro instanceof Error ? erro.message : String(erro) });
      });
    },
    [language, llmModel, autoAceitar],
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
  const gravada: Translation = {
    html,
    method: 'manual',
    at: new Date().toISOString(),
    sourceHash: sourceHash(original),
  };
  await writeTranslation(store, translation.language, entityType, key, field, gravada);
  anunciar();
  /* Sobe só se a pessoa ligou "enviar também as minhas correções" (a central confere). */
  void submitBestEffort(entityType, key, field, original, gravada, null);
}

export async function deleteStoredTranslation(
  entityType: string,
  key: string,
  field: string,
): Promise<void> {
  const { translation } = readPreferences(await store.get(KEY_PREFERENCES));
  const atual = (await readTranslations(store, translation.language, entityType))[key]?.[field];
  await deleteTranslation(store, translation.language, entityType, key, field);
  anunciar();
  /* Era uma compartilhada: o voto vai junto (56). */
  if (atual?.sharedId !== undefined) void forgetUse(atual.sharedId);
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
  /** Os modelos que a chave enxerga; vazio sem chave ou enquanto carrega. */
  readonly models: readonly LlmModel[];
  readonly save: (key: string) => Promise<void>;
  readonly forget: () => Promise<void>;
  readonly test: () => Promise<{ ok: true; text: string } | { ok: false; why: string }>;
} {
  const { prefs } = usePreferences();
  const { language } = prefs.translation;
  const llmModel = prefs.translation.llm.model;
  const hasKey = useHasLlmKey();
  /* A lista vem com a chave; sem chave, a lista é vazia — e não há estado a zerar. */
  const [carregados, setCarregados] = useState<{ hasKey: boolean; models: readonly LlmModel[] }>({
    hasKey: false,
    models: [],
  });
  useEffect(() => {
    if (hasKey !== true) return;
    let alive = true;
    gemini
      .models()
      .then((lista) => {
        if (alive) setCarregados({ hasKey: true, models: lista });
      })
      .catch(() => {
        if (alive) setCarregados({ hasKey: true, models: [] });
      });
    return () => {
      alive = false;
    };
  }, [hasKey]);
  const models = hasKey === true && carregados.hasKey ? carregados.models : [];

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

  return { hasKey, models, save, forget, test };
}
