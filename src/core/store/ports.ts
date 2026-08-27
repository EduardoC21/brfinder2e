/**
 * A porta de armazenamento.
 *
 * Deliberadamente pequena: um mapa de chave para valor, e nada mais. A alternativa seria
 * uma porta com um método por camada (`readBase`, `writeDesc`, `writeRaw`…), que obrigaria
 * todo adaptador a reimplementar a mesma lógica de chave — e são três adaptadores
 * previstos:
 *
 *   Node (comando de linha)   arquivos em .dados/
 *   Navegador (dev e Tauri)   IndexedDB
 *   Testes                    memória
 *
 * O que vai em cada chave é assunto de `layers.ts`, que é código comum a todos.
 *
 * O valor precisa sobreviver ao algoritmo de clonagem estruturada, porque é o que o
 * IndexedDB aceita: objetos simples, arrays, `Uint8Array`. Nada de classe nem função.
 */

export interface StorePort {
  get(key: string): Promise<unknown>;
  put(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
  /** Chaves existentes, opcionalmente filtradas por prefixo. */
  keys(prefix?: string): Promise<readonly string[]>;
  /** Apaga tudo. Usado por "esquecer a base" nas configurações. */
  clear(): Promise<void>;
}

export class StoreError extends Error {
  constructor(message: string, options?: { cause: unknown }) {
    super(message, options);
    this.name = 'StoreError';
  }
}
