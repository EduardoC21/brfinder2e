/**
 * As portas da camada `source/`.
 *
 * Por que existe uma porta em vez de chamar `fetch` direto: o download do
 * `json-assets.zip` **não tem cabeçalho CORS** (medido em 26/08/2026 — nem no 302 do
 * github.com, nem no 206 do release-assets.githubusercontent.com). Então o mesmo código
 * precisa de três hospedeiros diferentes ao longo do projeto:
 *
 *   Node (comando e testes)  -> `fetch` global, sem CORS porque não é navegador
 *   Navegador em dev         -> proxy do Vite, que refaz o pedido pelo lado Node
 *   Tauri em produção        -> `@tauri-apps/plugin-http`, que sai pelo Rust
 *
 * O `core/` não sabe qual dos três está rodando. Quem monta a aplicação injeta.
 */

/** Progresso de um download, para a barra da tela de sincronização (Etapa 4). */
export interface Progress {
  readonly loaded: number;
  /** `null` quando o servidor não informa `Content-Length`. */
  readonly total: number | null;
}

export interface HttpPort {
  /** Baixa e decodifica JSON. O retorno é `unknown` de propósito: valide antes de usar. */
  getJson(url: string): Promise<unknown>;

  /** Baixa bytes. `onProgress` é opcional e pode não ser chamado. */
  getBytes(url: string, onProgress?: (progress: Progress) => void): Promise<Uint8Array>;
}

/** Erro de rede ou de resposta HTTP fora da faixa 2xx. */
export class HttpError extends Error {
  readonly url: string;
  readonly status: number | null;

  constructor(url: string, status: number | null, detail: string) {
    super(`${status === null ? 'falha de rede' : `HTTP ${String(status)}`} em ${url}: ${detail}`);
    this.name = 'HttpError';
    this.url = url;
    this.status = status;
  }
}
