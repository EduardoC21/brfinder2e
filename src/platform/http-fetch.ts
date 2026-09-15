/**
 * Adaptador de `HttpPort` sobre o `fetch` global.
 *
 * Não importa nada de `node:` de propósito — `fetch`, `Response` e `Uint8Array` são APIs
 * web, presentes no Node 18+, no navegador e na webview do Tauri. Então este mesmo
 * arquivo serve ao comando de linha, aos testes e (via proxy do Vite) ao app em dev.
 *
 * O que ele NÃO resolve: o download do release não manda cabeçalho CORS, então dentro do
 * navegador a URL precisa passar por um proxy. Isso é configuração de quem hospeda, não
 * deste adaptador — ver `baseRewrite`.
 */

import { HttpError, type HttpPort } from '@core/source/index';

export interface FetchHttpOptions {
  /** Cabeçalhos fixos. Útil para `Authorization` se a cota da API do GitHub apertar. */
  readonly headers?: Readonly<Record<string, string>>;
  /**
   * Reescrita de URL aplicada antes do pedido. No navegador, é o que troca
   * `https://github.com/...` pelo caminho do proxy do Vite.
   */
  readonly rewrite?: (url: string) => string;
}

export function createFetchHttp(options: FetchHttpOptions = {}): HttpPort {
  const rewrite = options.rewrite ?? ((url: string) => url);
  const headers = options.headers ?? {};

  async function request(url: string): Promise<Response> {
    let response: Response;
    try {
      response = await fetch(rewrite(url), { headers });
    } catch (cause) {
      throw new HttpError(url, null, cause instanceof Error ? cause.message : String(cause));
    }
    if (!response.ok) {
      throw new HttpError(url, response.status, response.statusText);
    }
    return response;
  }

  return {
    async getJson(url) {
      const response = await request(url);
      try {
        return (await response.json()) as unknown;
      } catch (cause) {
        throw new HttpError(url, response.status, `resposta não é JSON: ${String(cause)}`);
      }
    },

    async getBytes(url, onProgress) {
      const response = await request(url);
      const header = response.headers.get('content-length');
      const total = header === null ? null : Number(header);
      const body = response.body;

      // Sem corpo streamável (ou sem quem escute o progresso): caminho simples.
      if (!body || !onProgress) {
        const buffer = await response.arrayBuffer();
        onProgress?.({ loaded: buffer.byteLength, total });
        return new Uint8Array(buffer);
      }

      const chunks: Uint8Array[] = [];
      let loaded = 0;
      const reader = body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.byteLength;
        onProgress({ loaded, total });
      }

      const bytes = new Uint8Array(loaded);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
      return bytes;
    },
  };
}

/**
 * A reescrita do download pelo PROXY (Etapa 57): o GitHub não manda CORS, então dentro do
 * navegador o zip e a API passam por alguém. Em dev, o proxy do Vite (`/gh-dl`, `/gh-api`
 * no vite.config.ts). No site e no executável, a CENTRAL de traduções — o worker atende
 * os mesmos caminhos, com a mesma forma. Quem sabe se há central é a tela, que põe a base
 * aqui (`setProxyBase`) a partir das preferências; sem base, fica o caminho relativo, que
 * só o Vite atende.
 */
let proxyBase = '';

export function setProxyBase(base: string): void {
  proxyBase = base.trim().replace(/\/+$/, '');
}

export function viteProxyRewrite(url: string): string {
  return url
    .replace('https://api.github.com', `${proxyBase}/gh-api`)
    .replace('https://github.com', `${proxyBase}/gh-dl`);
}
