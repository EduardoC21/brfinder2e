/**
 * A porta da central sobre o `fetch` (Etapa 55): GET, POST e DELETE em JSON, com o erro
 * do servidor virando uma frase — o worker responde `{ error: "…" }` com o motivo.
 */

import type { CentralPort } from '@core/translation/index';

export class CentralError extends Error {
  readonly status: number | null;

  constructor(status: number | null, message: string) {
    super(message);
    this.status = status;
  }
}

async function pedir(url: string, init: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (cause) {
    throw new CentralError(
      null,
      `sem rede: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
  }
  const corpo: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const erro =
      typeof corpo === 'object' && corpo !== null ? (corpo as { error?: unknown }).error : null;
    throw new CentralError(
      response.status,
      typeof erro === 'string' ? erro : `erro ${String(response.status)}`,
    );
  }
  return corpo;
}

export function createCentralFetch(): CentralPort {
  const headers = { 'Content-Type': 'application/json' };
  return {
    getJson: (url) => pedir(url, { method: 'GET' }),
    postJson: (url, body) => pedir(url, { method: 'POST', headers, body: JSON.stringify(body) }),
    delete: (url, body) => pedir(url, { method: 'DELETE', headers, body: JSON.stringify(body) }),
  };
}
