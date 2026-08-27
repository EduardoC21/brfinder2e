/**
 * As chaves das três camadas do briefing 5.2, e a leitura/gravação delas.
 *
 * Código comum a todos os adaptadores: quem implementa `StorePort` só sabe guardar
 * `chave -> valor`, nunca o que uma chave significa.
 *
 *   meta                   versão do sistema e quando sincronizou
 *   raw/<pack>             os bytes do pack, como vieram do zip
 *   base/<tipo>            a projeção leve
 *   desc/<tipo>            as descrições, por chave de entidade
 */

import { asNumber, asRecord, asString, isRecord } from '../json';
import type { StorePort } from './ports';
import type { StoredEntity } from './diff';

export const KEY_META = 'meta';
export const keyRaw = (pack: string): string => `raw/${pack}`;
export const keyBase = (type: string): string => `base/${type}`;
export const keyDesc = (type: string): string => `desc/${type}`;

export interface StoreMeta {
  readonly systemId: string;
  readonly systemVersion: string;
  readonly releaseTag: string;
  /** ISO 8601, em UTC. */
  readonly syncedAt: string;
  /** Soma das entidades gravadas — o número da barra de topo. */
  readonly total: number;
}

export async function readMeta(store: StorePort): Promise<StoreMeta | null> {
  const value = await store.get(KEY_META);
  if (value === undefined || !isRecord(value)) return null;

  // Meta gravada por uma versão anterior do app pode não ter a forma de hoje. Nesse caso
  // tratamos como ausente em vez de quebrar: o pior que acontece é pedir uma
  // sincronização nova, e isso é recuperável.
  try {
    const record = asRecord(value, 'meta');
    return {
      systemId: asString(record['systemId'], 'meta.systemId'),
      systemVersion: asString(record['systemVersion'], 'meta.systemVersion'),
      releaseTag: asString(record['releaseTag'], 'meta.releaseTag'),
      syncedAt: asString(record['syncedAt'], 'meta.syncedAt'),
      total: asNumber(record['total'], 'meta.total'),
    };
  } catch {
    return null;
  }
}

export async function writeMeta(store: StorePort, meta: StoreMeta): Promise<void> {
  await store.put(KEY_META, meta);
}

export async function readBase(
  store: StorePort,
  type: string,
): Promise<readonly StoredEntity[] | null> {
  const value = await store.get(keyBase(type));
  if (!Array.isArray(value)) return null;

  const entities: StoredEntity[] = [];
  for (const item of value) {
    if (!isRecord(item)) return null;
    const key = item['key'];
    const id = item['id'];
    const uuid = item['uuid'];
    if (typeof key !== 'string' || typeof id !== 'string' || typeof uuid !== 'string') return null;
    const retiredIn = item['retiredIn'];
    entities.push({
      key,
      id,
      uuid,
      base: item['base'],
      // `exactOptionalPropertyTypes`: a chave é omitida, não posta como undefined.
      ...(typeof retiredIn === 'string' ? { retiredIn } : {}),
    });
  }
  return entities;
}

export async function writeBase(
  store: StorePort,
  type: string,
  entities: readonly StoredEntity[],
): Promise<void> {
  await store.put(keyBase(type), entities);
}

/** As descrições, chaveadas pela mesma chave de entidade que a `base/`. */
export async function writeDesc(
  store: StorePort,
  type: string,
  byKey: Readonly<Record<string, unknown>>,
): Promise<void> {
  await store.put(keyDesc(type), byKey);
}

export async function readDesc(
  store: StorePort,
  type: string,
): Promise<Readonly<Record<string, unknown>> | null> {
  const value = await store.get(keyDesc(type));
  return isRecord(value) ? value : null;
}

/**
 * O documento cru de uma entrada APOSENTADA, guardado à parte antes de `raw/<pack>` ser
 * sobrescrito.
 *
 * É o que mantém a exportação possível para quem sumiu da fonte: a ficha do Foundry
 * embute cópias completas dos itens, então o documento aqui é o suficiente para o item
 * viajar dentro da ficha exportada.
 */
export const keyRetiredRaw = (key: string): string => `raw/retired/${key}`;

export async function writeRetiredRaw(
  store: StorePort,
  key: string,
  document: unknown,
): Promise<void> {
  await store.put(keyRetiredRaw(key), document);
}

export async function readRetiredRaw(store: StorePort, key: string): Promise<unknown> {
  return store.get(keyRetiredRaw(key));
}

/**
 * Os bytes do pack, exatamente como vieram do zip.
 *
 * É a camada que mantém aberta a porta da exportação para o Foundry (OPEN-DECISIONS,
 * item 1). Gravada a partir do zip, nunca a partir da projeção.
 */
export async function writeRaw(store: StorePort, pack: string, bytes: Uint8Array): Promise<void> {
  await store.put(keyRaw(pack), bytes);
}

export async function readRaw(store: StorePort, pack: string): Promise<Uint8Array | null> {
  const value = await store.get(keyRaw(pack));
  return value instanceof Uint8Array ? value : null;
}
