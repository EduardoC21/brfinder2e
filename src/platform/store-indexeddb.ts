/**
 * Adaptador de `StorePort` sobre IndexedDB.
 *
 * Por que IndexedDB e não as alternativas:
 *
 *   localStorage   só string, e o limite prático é ~5 MB. A base passa disso de longe.
 *   OPFS           mais rápido para arquivo grande, mas a API é mais crua e o suporte
 *                  ainda é irregular fora do Chromium. Para ~20 MB de JSON não compensa.
 *   IndexedDB      guarda objeto e Uint8Array direto, sem serializar à mão, e existe em
 *                  todo navegador e na webview do Tauri.
 *
 * A API é baseada em eventos, de 2015. Cada operação vira uma Promise aqui, num lugar só,
 * para o resto do projeto não conviver com `onsuccess`/`onerror`.
 */

import { StoreError, type StorePort } from '@core/store/index';

const DB_NAME = 'brfinder2e';
const DB_VERSION = 1;
const STORE_NAME = 'data';

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(new StoreError(`IndexedDB recusou a operação: ${request.error?.message ?? '?'}`));
    };
  });
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(new StoreError(`Não consegui abrir o IndexedDB: ${request.error?.message ?? '?'}`));
    };
    request.onblocked = () => {
      reject(new StoreError('O IndexedDB está bloqueado por outra aba com versão antiga aberta.'));
    };
  });
}

export function createIndexedDbStore(): StorePort {
  /*
   * A conexão é aberta uma vez e reaproveitada. Abrir por operação funcionaria, mas cada
   * `open` custa uma ida ao disco, e a sincronização faz uma dezena de gravações seguidas.
   */
  let connection: Promise<IDBDatabase> | null = null;
  const db = (): Promise<IDBDatabase> => (connection ??= openDatabase());

  async function withStore<T>(
    mode: IDBTransactionMode,
    body: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    const database = await db();
    const transaction = database.transaction(STORE_NAME, mode);
    const result = await promisify(body(transaction.objectStore(STORE_NAME)));

    // Em escrita, esperar a transação COMPLETAR — não só o pedido. Sem isso, uma leitura
    // logo em seguida pode não enxergar o que acabou de ser gravado.
    if (mode === 'readwrite') {
      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => {
          resolve();
        };
        transaction.onabort = transaction.onerror = () => {
          reject(new StoreError(`A transação falhou: ${transaction.error?.message ?? '?'}`));
        };
      });
    }
    return result;
  }

  return {
    get: (key) => withStore<unknown>('readonly', (store) => store.get(key)),

    put: async (key, value) => {
      await withStore('readwrite', (store) => store.put(value, key));
    },

    delete: async (key) => {
      await withStore('readwrite', (store) => store.delete(key));
    },

    keys: async (prefix) => {
      const all = await withStore<IDBValidKey[]>('readonly', (store) => store.getAllKeys());
      return all
        .filter((key): key is string => typeof key === 'string')
        .filter((key) => prefix === undefined || key.startsWith(prefix))
        .sort();
    },

    clear: async () => {
      await withStore('readwrite', (store) => store.clear());
    },
  };
}
