/**
 * A QUINTA CAMADA: as traduções, por língua e por tipo.
 *
 *   trans/<língua>/<tipo>     { [chave da entrada]: { [campo]: Translation } }
 *
 * Fora de `desc/` de propósito: `desc/` é o que veio do Foundry e é apagado e reescrito a
 * cada sincronização; a tradução é trabalho da pessoa (ou pago por ela, ou baixado uma
 * vez) e tem de SOBREVIVER à sincronização — como as preferências. Uma língua por chave,
 * porque a pessoa pode usar mais de uma e cada uma é um conjunto inteiro.
 *
 * Cada tradução guarda DE ONDE veio (`method`) e uma impressão digital do original
 * (`sourceHash`): quando o Foundry muda o texto da entrada numa versão nova, a tradução
 * gravada é de um texto que já não existe, e a tela pode avisar em vez de mostrar uma
 * tradução velha como se fosse do texto novo.
 */

import { isRecord } from '../json';
import type { TranslationMethodId } from '../translation/methods';
import { isTranslationMethodId } from '../translation/methods';
import type { StorePort } from './ports';

export const keyTranslations = (language: string, type: string): string =>
  `trans/${language}/${type}`;

export interface Translation {
  readonly html: string;
  readonly method: TranslationMethodId;
  /** ISO 8601, em UTC. */
  readonly at: string;
  /** `sourceHash(original)` do texto traduzido. */
  readonly sourceHash: string;
  /** A candidata da central que esta tradução é (Etapa 56) — para mover ou tirar o voto. */
  readonly sharedId?: number;
}

/** As traduções de uma entrada, por campo de `desc/` (`main`, `page`…). */
export type EntityTranslations = Readonly<Record<string, Translation>>;

export type TranslationsByKey = Readonly<Record<string, EntityTranslations>>;

/**
 * Uma impressão digital curta e ESTÁVEL do original (FNV-1a de 32 bits, em hex). Não é
 * criptográfica e não precisa ser: só diz "o texto mudou desde que traduzi".
 */
export function sourceHash(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function readTranslation(value: unknown): Translation | null {
  if (!isRecord(value)) return null;
  const { html, method, at, sourceHash: hash, sharedId } = value;
  if (typeof html !== 'string' || !isTranslationMethodId(method)) return null;
  if (typeof at !== 'string' || typeof hash !== 'string') return null;
  return {
    html,
    method,
    at,
    sourceHash: hash,
    ...(typeof sharedId === 'number' ? { sharedId } : {}),
  };
}

export async function readTranslations(
  store: StorePort,
  language: string,
  type: string,
): Promise<TranslationsByKey> {
  const value = await store.get(keyTranslations(language, type));
  if (!isRecord(value)) return {};
  const out: Record<string, Record<string, Translation>> = {};
  for (const [key, fields] of Object.entries(value)) {
    if (!isRecord(fields)) continue;
    const porCampo: Record<string, Translation> = {};
    for (const [field, raw] of Object.entries(fields)) {
      const translation = readTranslation(raw);
      if (translation !== null) porCampo[field] = translation;
    }
    if (Object.keys(porCampo).length > 0) out[key] = porCampo;
  }
  return out;
}

/**
 * Grava UMA tradução, lendo e reescrevendo a chave da língua/tipo. A forma `manual` nunca
 * é sobrescrita por outra: quem escreveu à mão decidiu.
 */
export async function writeTranslation(
  store: StorePort,
  language: string,
  type: string,
  key: string,
  field: string,
  translation: Translation,
): Promise<void> {
  const atual = await readTranslations(store, language, type);
  const existente = atual[key]?.[field];
  if (existente?.method === 'manual' && translation.method !== 'manual') return;
  await store.put(keyTranslations(language, type), {
    ...atual,
    [key]: { ...atual[key], [field]: translation },
  });
}

/**
 * Apaga UMA tradução (Etapa 43). É o único caminho de volta da forma `manual`: como ela
 * nunca é sobrescrita, quem quer a tradução da máquina de novo apaga a sua antes.
 */
export async function deleteTranslation(
  store: StorePort,
  language: string,
  type: string,
  key: string,
  field: string,
): Promise<void> {
  const atual = await readTranslations(store, language, type);
  const campos = atual[key];
  if (campos?.[field] === undefined) return;
  const resto = Object.fromEntries(Object.entries(campos).filter(([nome]) => nome !== field));
  const outras = Object.fromEntries(Object.entries(atual).filter(([nome]) => nome !== key));
  await store.put(
    keyTranslations(language, type),
    Object.keys(resto).length === 0 ? outras : { ...outras, [key]: resto },
  );
}

/** As chaves de tradução existentes — `trans/pt-BR/spell`… — para a manutenção. */
export async function translationKeys(store: StorePort): Promise<readonly string[]> {
  return store.keys('trans/');
}
