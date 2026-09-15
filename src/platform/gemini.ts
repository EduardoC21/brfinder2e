/**
 * O ADAPTADOR do Gemini (Etapa 41): a porta `LlmChat` sobre a API REST do Google AI
 * (`generateContent`), com a chave da PESSOA — lida na hora, de `secrets.ts`, nunca
 * guardada aqui.
 *
 * Por que REST e não o SDK `@google/genai`: é um POST com JSON, e o SDK traria 1 MB de
 * dependência para isso. O `fetch` é o do navegador — a API do Gemini aceita chamada
 * direta do navegador com a chave no cabeçalho (é o modo "browser" da documentação
 * deles, que avisa que a chave fica visível para quem tem o app: é o esperado no BYOK, a
 * chave é de quem usa).
 *
 * `thinkingBudget: 0` desliga o raciocínio do 2.5 Flash: tradução não precisa dele, e
 * ele custaria tempo e cota. Temperatura baixa: tradução pede fidelidade, não variedade.
 */

import type { LlmChat, LlmModel } from '@core/translation/index';

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export class GeminiError extends Error {
  readonly status: number | null;

  constructor(status: number | null, message: string) {
    super(message);
    this.status = status;
  }
}

/** A mensagem que a pessoa lê quando dá errado — pelo código, porque o JSON do Google é longo. */
function explicar(status: number, corpo: unknown): string {
  const erro =
    typeof corpo === 'object' && corpo !== null ? (corpo as { error?: unknown }).error : null;
  const bruta =
    typeof erro === 'object' && erro !== null ? (erro as { message?: unknown }).message : null;
  const mensagem = typeof bruta === 'string' ? bruta : '';
  if (status === 400 && /API key not valid/i.test(mensagem)) return 'chave inválida';
  if (status === 401 || status === 403) return 'chave recusada';
  if (status === 429) return 'limite de uso atingido — espere um minuto';
  if (status === 404) return 'modelo não encontrado';
  return `erro ${String(status)}${mensagem === '' ? '' : `: ${mensagem.slice(0, 120)}`}`;
}

/**
 * `GET /v1beta/models`: os modelos que a chave enxerga e que geram conteúdo. Só os
 * "gemini" (a lista traz embedding, imagem, áudio…), os mais novos primeiro pelo nome —
 * a API não diz qual é o atual; o número na frente diz.
 */
async function listarModelos(key: string): Promise<readonly LlmModel[]> {
  const response = await fetch(`${BASE}?pageSize=200`, { headers: { 'x-goog-api-key': key } });
  const corpo: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new GeminiError(response.status, explicar(response.status, corpo));
  const lista =
    typeof corpo === 'object' && corpo !== null ? (corpo as { models?: unknown }).models : null;
  if (!Array.isArray(lista)) return [];
  const modelos: LlmModel[] = [];
  for (const item of lista) {
    if (typeof item !== 'object' || item === null) continue;
    const { name, displayName, supportedGenerationMethods } = item as {
      name?: unknown;
      displayName?: unknown;
      supportedGenerationMethods?: unknown;
    };
    if (typeof name !== 'string' || !name.startsWith('models/gemini')) continue;
    if (
      !Array.isArray(supportedGenerationMethods) ||
      !supportedGenerationMethods.includes('generateContent')
    )
      continue;
    const id = name.slice('models/'.length);
    modelos.push({ id, label: typeof displayName === 'string' ? displayName : id });
  }
  return modelos.sort((a, b) => b.id.localeCompare(a.id, 'en', { numeric: true }));
}

export function createGeminiChat(getKey: () => Promise<string | null>): LlmChat {
  return {
    async models() {
      const key = await getKey();
      if (key === null || key === '') return [];
      return listarModelos(key);
    },
    async complete({ model, system, user }) {
      const key = await getKey();
      if (key === null || key === '') throw new GeminiError(null, 'sem chave');
      let response: Response;
      try {
        response = await fetch(`${BASE}/${encodeURIComponent(model)}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: system }] },
            contents: [{ role: 'user', parts: [{ text: user }] }],
            generationConfig: { temperature: 0.2, thinkingConfig: { thinkingBudget: 0 } },
          }),
        });
      } catch (cause) {
        throw new GeminiError(
          null,
          `sem rede: ${cause instanceof Error ? cause.message : String(cause)}`,
        );
      }
      const corpo: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new GeminiError(response.status, explicar(response.status, corpo));
      const texto = extrairTexto(corpo);
      if (texto === null) throw new GeminiError(response.status, 'resposta sem texto');
      return texto;
    },
  };
}

/** `candidates[0].content.parts[*].text`, juntos. */
function extrairTexto(corpo: unknown): string | null {
  if (typeof corpo !== 'object' || corpo === null) return null;
  const candidatos = (corpo as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidatos) || candidatos.length === 0) return null;
  const primeiro: unknown = candidatos[0];
  if (typeof primeiro !== 'object' || primeiro === null) return null;
  const conteudo = (primeiro as { content?: { parts?: unknown } }).content?.parts;
  if (!Array.isArray(conteudo)) return null;
  const partes = conteudo
    .map((parte: unknown) =>
      typeof parte === 'object' &&
      parte !== null &&
      typeof (parte as { text?: unknown }).text === 'string'
        ? (parte as { text: string }).text
        : '',
    )
    .join('');
  return partes === '' ? null : partes;
}
