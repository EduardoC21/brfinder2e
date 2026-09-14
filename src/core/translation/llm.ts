/**
 * O PROVEDOR DE MODELO DE LINGUAGEM (Etapa 41, pelo autor: "vamos de BYOK Gemini, e usar
 * só ela como tradução").
 *
 * BYOK — "bring your own key": a chave é da pessoa, guardada fora das preferências
 * (`platform/secrets.ts`); o app não tem chave nem custo. O modelo traduz a PROSA; o
 * glossário entra de dois jeitos, e é isso que dá o melhor dos dois mundos medido na 40:
 *
 *   1. A BLINDAGEM (`shield.ts`), a mesma do provedor local: marcas do Foundry viram
 *      elementos que o modelo preserva, e cada termo do glossário vira
 *      `<span translate="no" i="n">`. Na volta, o conteúdo do span é descartado e o termo
 *      da comunidade entra — garantia que não depende do modelo obedecer.
 *   2. O PROMPT lista os termos por número e pede que o modelo os escreva DENTRO do span,
 *      concordando a frase ao redor — é por isso que "um Golpe corpo a corpo" sai no
 *      masculino, coisa que o motor local não faz.
 *
 * O `LlmChat` é a porta: o core não sabe de HTTP, chave ou Gemini — `platform/gemini.ts`
 * sabe. Trocar de provedor (OpenAI, Groq) é outro adaptador da mesma porta.
 */

import { CORE_PHRASES } from './phrases';
import { polishPortuguese, type LocalGlossary } from './local';
import type { ProviderAvailability, TranslationProvider, TranslationRequest } from './methods';
import { shield } from './shield';

/** Uma conversa de uma volta com o modelo: instrução, pedido, resposta em texto. */
export interface LlmChat {
  complete(request: {
    readonly model: string;
    readonly system: string;
    readonly user: string;
  }): Promise<string>;
}

/** O que o provedor precisa saber na hora: o modelo escolhido e se há chave. */
export interface LlmConfig {
  readonly model: string;
  readonly hasKey: boolean;
}

/** Os modelos oferecidos. Os dois têm nível gratuito no Google AI Studio (14/09/2026). */
export const LLM_MODELS: readonly { readonly id: string; readonly label: string }[] = [
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite' },
];
export const DEFAULT_LLM_MODEL = 'gemini-2.5-flash';

const INSTRUCAO = `Você traduz texto de regras do Pathfinder 2e (Remaster) do inglês para o português do Brasil, no tom do livro traduzido: direto, em segunda pessoa ("você"), sem floreio.

Regras obrigatórias:
1. Devolva SOMENTE o HTML traduzido. Sem cercas de código, sem comentários, sem explicação.
2. Preserve TODAS as tags e atributos exatamente como estão, na mesma ordem — inclusive <x-tok>, <x-ref>, <x-lab> e <span translate="no" i="n">. Não acrescente nem remova tags. Traduza apenas o texto.
3. Cada <span translate="no" i="n"> deve conter EXATAMENTE o termo português listado em TERMOS para o número n, no lugar do inglês. Escreva a frase ao redor concordando com esse termo em gênero e número.
4. <x-tok> é vazio: mantenha vazio. <x-ref> contém o nome de uma entrada do jogo: mantenha o nome em inglês.
5. Mantenha números, dados (2d6), sinais (+2, –4), unidades (pés, minutos) e a pontuação.
6. Termos de jogo fora dos spans: use a nomenclatura da tradução oficial brasileira (Golpe, Avançar, Passo, salvamento, CD, CA, PV, Mestre, PJ, círculo de magia, talento, perícia).`;

/** O prompt: a instrução fixa e o pedido com os termos numerados e o HTML blindado. */
export function buildPrompt(
  shieldedHtml: string,
  terms: readonly string[],
): { readonly system: string; readonly user: string } {
  const lista = terms.map((termo, i) => `${String(i + 1)}: ${termo}`).join('\n');
  return {
    system: INSTRUCAO,
    user: `TERMOS:\n${lista === '' ? '(nenhum)' : lista}\n\nHTML:\n${shieldedHtml}`,
  };
}

/** O modelo às vezes cerca a resposta com \`\`\`html … \`\`\` mesmo proibido: tira-se. */
export function unfence(text: string): string {
  const m = /^\s*```[a-z]*\s*([\s\S]*?)\s*```\s*$/i.exec(text);
  return (m?.[1] ?? text).trim();
}

export function createLlmProvider(
  chat: LlmChat,
  config: () => Promise<LlmConfig>,
  glossary: LocalGlossary = {},
): TranslationProvider {
  return {
    id: 'llm',
    async availability(): Promise<ProviderAvailability> {
      const { hasKey } = await config();
      return hasKey ? { kind: 'ready' } : { kind: 'needs-setup', what: 'chave' };
    },
    async translate(request: TranslationRequest): Promise<string> {
      const { model } = await config();
      const blindado = shield(request.html, {
        phrases: [...CORE_PHRASES, ...(glossary.phrases ?? [])],
        ...(glossary.nameOf === undefined ? {} : { nameOf: glossary.nameOf }),
      });
      const prompt = buildPrompt(blindado.text, blindado.terms);
      const resposta = await chat.complete({ model, ...prompt });
      return polishPortuguese(blindado.restore(unfence(resposta)));
    },
  };
}
