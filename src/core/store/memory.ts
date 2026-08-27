import type { StorePort } from './ports';

/**
 * `StorePort` em memória. Existe para os testes: a lógica de camadas e de diferença é
 * pura, e provar isso não deveria exigir um banco de dados nem uma dependência nova.
 *
 * Clona na entrada e na saída para imitar o comportamento do IndexedDB, que guarda uma
 * cópia. Sem isso, um teste passaria por acidente ao mutar o objeto que "gravou".
 */
export function createMemoryStore(): StorePort {
  const data = new Map<string, unknown>();
  const clone = (value: unknown): unknown => structuredClone(value);

  return {
    get: (key) => Promise.resolve(data.has(key) ? clone(data.get(key)) : undefined),
    put: (key, value) => {
      data.set(key, clone(value));
      return Promise.resolve();
    },
    delete: (key) => {
      data.delete(key);
      return Promise.resolve();
    },
    keys: (prefix) =>
      Promise.resolve(
        [...data.keys()].filter((key) => prefix === undefined || key.startsWith(prefix)).sort(),
      ),
    clear: () => {
      data.clear();
      return Promise.resolve();
    },
  };
}
