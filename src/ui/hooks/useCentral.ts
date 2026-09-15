import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import { SOURCES, fieldValue } from '@core/browse/index';
import { isRecord } from '@core/json';
import { KEY_PREFERENCES, readPreferences, type Preferences } from '@core/prefs/index';
import {
  readBase,
  readDesc,
  readTranslations,
  sourceHash,
  writeTranslation,
  type Translation,
} from '@core/store/index';
import {
  acceptedTranslation,
  centralBase,
  fetchCandidates,
  markUse,
  markUses,
  newSenderId,
  offeredFor,
  readCentral,
  refreshCentral,
  submitTranslation,
  unmarkUse,
  type Candidate,
  type OfferedByKey,
  type Sender,
} from '@core/translation/index';
import { createCentralFetch } from '@platform/central-fetch';
import { defaultCentralUrl } from '@platform/env';
import { createBrowserSecretStore } from '@platform/secrets';
import { createIndexedDbStore } from '@platform/store-indexeddb';
import { usePreferences } from '@ui/prefs/usePreferences';

import { announceTranslations } from './useTranslation';

/**
 * A CENTRAL, do lado do app (Etapa 55; regras em OPEN-DECISIONS #16). O que este módulo
 * faz, e em que momento:
 *
 *   - `refreshAllCentral`   baixa o pacote de cada tipo (na sincronização, e no
 *                           "Atualizar" das configurações) para `trans/<língua>/central/`;
 *   - `useOffered`          o que a central oferece para UMA entrada, por campo;
 *   - `acceptOffered`       "Usar": grava como `shared` onde a pessoa não tem nada, e
 *                           conta o uso na central;
 *   - `acceptAll`           "Aceitar todas": o mesmo, para tudo que casa com o original;
 *   - `submitBestEffort`    o envio ao terminar uma tradução: falha em silêncio — a central
 *                           fora do ar não pode atrapalhar quem traduz.
 *
 * Sem URL nas preferências, nada disto faz nada. O id do aparelho mora nos segredos.
 */

const store = createIndexedDbStore();
const port = createCentralFetch();
const segredos = createBrowserSecretStore();
const SENDER_SECRET = 'central-id';

/* A versão do cache da central, para as telas relerem — o mesmo arranjo das traduções. */
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

async function remetente(): Promise<Sender> {
  let id = await segredos.get(SENDER_SECRET);
  if (id === null || id === '') {
    id = newSenderId((n) => crypto.getRandomValues(new Uint8Array(n)));
    await segredos.set(SENDER_SECRET, id);
  }
  const { translation } = readPreferences(await store.get(KEY_PREFERENCES));
  const nome = translation.central.nickname.trim();
  return { id, name: nome === '' ? null : nome };
}

/** A URL efetiva da central: a das preferências, senão a que o build embutiu (57). */
export function effectiveCentralUrl(prefUrl: string): string {
  const escolhida = centralBase(prefUrl);
  return escolhida === '' ? defaultCentralUrl() : escolhida;
}

async function config(): Promise<{ base: string; prefs: Preferences['translation'] }> {
  const { translation } = readPreferences(await store.get(KEY_PREFERENCES));
  return { base: effectiveCentralUrl(translation.central.url), prefs: translation };
}

const TIPOS: readonly string[] = SOURCES.flatMap((s) =>
  s.entityType === null ? [] : [s.entityType],
);

/** Baixa o pacote de cada tipo. Devolve quantas candidatas vieram; lança se a central falhar. */
export async function refreshAllCentral(): Promise<number> {
  const { base, prefs } = await config();
  if (base === '') return 0;
  let n = 0;
  for (const tipo of TIPOS) n += await refreshCentral(port, store, base, prefs.language, tipo);
  anunciar();
  return n;
}

/** O envio de uma tradução gravada, sem derrubar nada se a central não responder. */
export async function submitBestEffort(
  entityType: string,
  key: string,
  field: string,
  original: string,
  translation: Translation,
  model: string | null,
): Promise<void> {
  try {
    const { base, prefs } = await config();
    if (base === '') return;
    if (translation.method === 'manual' && !prefs.central.sendManual) return;
    if (translation.method !== 'manual' && translation.method !== 'llm') return;
    await submitTranslation(
      port,
      base,
      prefs.language,
      entityType,
      key,
      field,
      original,
      translation,
      model,
      await remetente(),
    );
  } catch {
    // A central fora do ar não pode atrapalhar quem traduz.
  }
}

/** A candidata que serve para este original, ou nula — para o Traduzir automático. */
export async function offeredNow(
  entityType: string,
  key: string,
  field: string,
  original: string,
): Promise<{ id: number; translation: Translation } | null> {
  const { base, prefs } = await config();
  if (base === '') return null;
  const oferecidas = await readCentral(store, prefs.language, entityType);
  const candidata = offeredFor(oferecidas, key, field, original);
  return candidata === null
    ? null
    : { id: candidata.id, translation: acceptedTranslation(candidata, new Date().toISOString()) };
}

/** "Usar": grava as candidatas que casam, onde não há nada da pessoa, e conta o uso. */
export async function acceptOffered(
  entityType: string,
  key: string,
  fields: readonly { readonly field: string; readonly original: string }[],
): Promise<number> {
  const { base, prefs } = await config();
  if (base === '') return 0;
  const oferecidas = await readCentral(store, prefs.language, entityType);
  const minhas = (await readTranslations(store, prefs.language, entityType))[key] ?? {};
  const quem = await remetente();
  let n = 0;
  for (const { field, original } of fields) {
    if (minhas[field] !== undefined) continue;
    const candidata = offeredFor(oferecidas, key, field, original);
    if (candidata === null) continue;
    await writeTranslation(
      store,
      prefs.language,
      entityType,
      key,
      field,
      acceptedTranslation(candidata, new Date().toISOString()),
    );
    n += 1;
    markUse(port, base, candidata.id, quem).catch(() => {
      // Contar o uso é cortesia; a tradução já está gravada.
    });
  }
  if (n > 0) announceTranslations();
  return n;
}

/**
 * "Aceitar todas": para cada tipo, cada entrada, cada campo oferecido que casa com o
 * original de hoje e que a pessoa ainda não tem. Lê `desc/` e `base/` para conferir a
 * impressão digital — o cache da central não é confiado às cegas.
 */
export async function acceptAll(): Promise<number> {
  const { base, prefs } = await config();
  if (base === '') return 0;
  let n = 0;
  const votos: number[] = [];
  for (const tipo of TIPOS) {
    const oferecidas = await readCentral(store, prefs.language, tipo);
    const chaves = Object.keys(oferecidas);
    if (chaves.length === 0) continue;
    const minhas = await readTranslations(store, prefs.language, tipo);
    const descricoes = (await readDesc(store, tipo)) ?? {};
    const nomes = new Map(
      ((await readBase(store, tipo)) ?? []).map((e) => [e.key, fieldValue(e, 'name')]),
    );
    for (const key of chaves) {
      const entrada = descricoes[key];
      for (const field of Object.keys(oferecidas[key] ?? {})) {
        if (minhas[key]?.[field] !== undefined) continue;
        const original =
          field === 'name'
            ? (nomes.get(key) ?? '')
            : isRecord(entrada) && typeof entrada[field] === 'string'
              ? entrada[field]
              : '';
        if (original === '') continue;
        const candidata = offeredFor(oferecidas, key, field, original);
        if (candidata === null) continue;
        await writeTranslation(
          store,
          prefs.language,
          tipo,
          key,
          field,
          acceptedTranslation(candidata, new Date().toISOString()),
        );
        votos.push(candidata.id);
        n += 1;
      }
    }
  }
  if (n > 0) {
    announceTranslations();
    /* Os votos vão em lote, e são cortesia: a tradução já está gravada. */
    markUses(port, base, votos, await remetente()).catch(() => undefined);
  }
  return n;
}

/**
 * As candidatas de uma entrada e campo (Etapa 56), na ordem da central; e "passar para"
 * uma delas — que é o mesmo Usar: grava como `shared` e move o voto.
 */
export async function candidatesOf(
  entityType: string,
  key: string,
  field: string,
  original: string,
): Promise<Candidate[]> {
  const { base, prefs } = await config();
  if (base === '') return [];
  const todas = await fetchCandidates(port, base, prefs.language, entityType, key);
  const hash = sourceHash(original);
  return todas.filter((c) => c.field === field && c.sourceHash === hash);
}

export async function switchTo(
  entityType: string,
  key: string,
  field: string,
  candidate: Candidate,
): Promise<void> {
  const { base, prefs } = await config();
  if (base === '') return;
  await writeTranslation(
    store,
    prefs.language,
    entityType,
    key,
    field,
    acceptedTranslation(candidate, new Date().toISOString()),
  );
  announceTranslations();
  markUse(port, base, candidate.id, await remetente()).catch(() => undefined);
}

/** A compartilhada saiu do aparelho: o voto sai da central. Cortesia, em silêncio. */
export async function forgetUse(sharedId: number): Promise<void> {
  try {
    const { base } = await config();
    if (base === '') return;
    await unmarkUse(port, base, sharedId, await remetente());
  } catch {
    // A central fora do ar não é problema de quem apagou.
  }
}

export function useCentralVersion(): number {
  return useSyncExternalStore(subscribe, () => versao);
}

/** O que a central oferece para UMA entrada (todos os campos), do cache. */
export function useOffered(entityType: string, key: string): OfferedByKey[string] | undefined {
  const { prefs } = usePreferences();
  const language = prefs.translation.language;
  const ligada = effectiveCentralUrl(prefs.translation.central.url) !== '';
  const version = useCentralVersion();
  const [estado, setEstado] = useState<{
    token: string;
    campos: OfferedByKey[string] | undefined;
  }>({ token: '', campos: undefined });
  const token = `${language}/${entityType}/${key}#${String(version)}`;
  useEffect(() => {
    if (!ligada) return;
    let alive = true;
    readCentral(store, language, entityType)
      .then((oferecidas) => {
        if (alive) setEstado({ token, campos: oferecidas[key] });
      })
      .catch(() => {
        if (alive) setEstado({ token, campos: undefined });
      });
    return () => {
      alive = false;
    };
  }, [ligada, language, entityType, key, token]);
  return ligada && estado.token === token ? estado.campos : undefined;
}

/** O bloco das configurações: atualizar, aceitar todas, e quantas há por aceitar. */
export function useCentralActions(): {
  readonly refresh: () => Promise<number>;
  readonly acceptAll: () => Promise<number>;
} {
  const refresh = useCallback(() => refreshAllCentral(), []);
  const aceitar = useCallback(() => acceptAll(), []);
  return { refresh, acceptAll: aceitar };
}
