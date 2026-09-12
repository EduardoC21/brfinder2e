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
 *   glossary/<nome>        texto que não pertence a entrada nenhuma — os traços
 */

import { asNumber, asRecord, asString, isRecord } from '../json';
import type { StorePort } from './ports';
import type { StoredEntity } from './diff';

export const KEY_META = 'meta';
export const keyRaw = (pack: string): string => `raw/${pack}`;
export const keyBase = (type: string): string => `base/${type}`;
export const keyDesc = (type: string): string => `desc/${type}`;
/**
 * A quarta camada, e a primeira que NÃO é por tipo de entidade.
 *
 * Um glossário é texto de apoio — o que um traço quer dizer — que vem da tabela de idioma
 * do Foundry e não de documento nenhum. Chave própria em vez de esconder dentro de
 * `desc/`: `desc/` é chaveada por entidade, e um traço não é uma.
 */
export const keyGlossary = (name: string): string => `glossary/${name}`;

export interface StoreMeta {
  readonly systemId: string;
  readonly systemVersion: string;
  readonly releaseTag: string;
  /** ISO 8601, em UTC. */
  readonly syncedAt: string;
  /** Soma das entidades gravadas — o número da barra de topo. */
  readonly total: number;
  /**
   * Sobe a cada mexida na base que NÃO é sincronização — apagar os aposentados, hoje.
   *
   * A tela relê a base pela versão dela (`syncedAt` + `revision`). Sem isto, apagar os
   * aposentados deixaria a lista mostrando o que já não existe até a próxima
   * sincronização. Zero numa base recém-sincronizada; ausente em meta antiga vale zero.
   */
  readonly revision: number;
  /**
   * A revisão das receitas que gravou esta base (`RECIPES_REVISION`). Menor que a do app
   * quer dizer "o que está gravado é de antes": a tela pede sincronização. Ausente em
   * meta antiga vale zero.
   */
  readonly recipes: number;
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
      // Meta gravada antes da Etapa 20 não tem revisão; vale zero, e nada quebra.
      revision: typeof record['revision'] === 'number' ? record['revision'] : 0,
      recipes: typeof record['recipes'] === 'number' ? record['recipes'] : 0,
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

export async function writeGlossary(
  store: StorePort,
  name: string,
  entries: Readonly<Record<string, unknown>>,
): Promise<void> {
  await store.put(keyGlossary(name), entries);
}

export async function readGlossary(
  store: StorePort,
  name: string,
): Promise<Readonly<Record<string, unknown>> | null> {
  const value = await store.get(keyGlossary(name));
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
export const keyRetiredRaw = (type: string, key: string): string => `raw/retired/${type}/${key}`;

export async function writeRetiredRaw(
  store: StorePort,
  type: string,
  key: string,
  document: unknown,
): Promise<void> {
  await store.put(keyRetiredRaw(type, key), document);
}

export async function readRetiredRaw(
  store: StorePort,
  type: string,
  key: string,
): Promise<unknown> {
  return store.get(keyRetiredRaw(type, key));
}

/**
 * Todos os documentos crus aposentados de um tipo.
 *
 * É o que permite RENORMALIZAR os aposentados a cada sincronização, em vez de arrastar
 * adiante uma projeção congelada. Sem isso, mudar a receita deixaria os aposentados com a
 * forma antiga, e o front teria duas formas do mesmo tipo para desenhar.
 */
export async function listRetiredRaw(
  store: StorePort,
  type: string,
): Promise<readonly { readonly key: string; readonly document: unknown }[]> {
  const prefix = `raw/retired/${type}/`;
  const keys = await store.keys(prefix);
  const out: { key: string; document: unknown }[] = [];
  for (const full of keys) {
    const document = await store.get(full);
    if (document !== undefined) out.push({ key: full.slice(prefix.length), document });
  }
  return out;
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
