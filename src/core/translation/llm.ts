/**
 * O PROVEDOR DE MODELO DE LINGUAGEM (Etapa 41, pelo autor: "vamos de BYOK Gemini, e usar
 * só ela como tradução").
 *
 * BYOK — "bring your own key": a chave é da pessoa, guardada fora das preferências
 * (`platform/secrets.ts`); o app não tem chave nem custo. O modelo traduz a PROSA; o
 * glossário entra de dois jeitos, e é isso que dá o melhor dos dois mundos medido na 40:
 *
 *   1. A BLINDAGEM (`shield.ts`), herdada do provedor local (Etapas 34–38): marcas viram
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

import type { ProviderAvailability, TranslationProvider, TranslationRequest } from './methods';
import { CORE_PHRASES } from './phrases';
import { polishPortuguese } from './polish';
import { shield, type Phrase } from './shield';

/** O que o pacote da comunidade dá ao provedor além dos termos fixos. */
export interface TranslationGlossary {
  /** Termos além dos fixos — os do pacote, quando houver. */
  readonly phrases?: readonly Phrase[];
  /** O nome em português de um rótulo de referência. */
  readonly nameOf?: (label: string) => string | null;
}

/** Um modelo que a chave enxerga: o id que a API aceita, e o nome para a tela. */
export interface LlmModel {
  readonly id: string;
  readonly label: string;
}

/** Uma conversa de uma volta com o modelo: instrução, pedido, resposta em texto. */
export interface LlmChat {
  complete(request: {
    readonly model: string;
    readonly system: string;
    readonly user: string;
  }): Promise<string>;
  /** Os modelos que a chave enxerga, do mais indicado ao menos. Ver `pickDefaultModel`. */
  models(): Promise<readonly LlmModel[]>;
}

/** O que o provedor precisa saber na hora: o modelo escolhido e se há chave. */
export interface LlmConfig {
  readonly model: string;
  readonly hasKey: boolean;
}

/**
 * O modelo de PARTIDA, antes de a lista chegar. Medido em 14/09/2026 com a chave do
 * autor: "gemini-2.5-flash-lite" já dava 404 — nome de modelo muda todo ano, e por isso a
 * lista de verdade vem da API (`LlmChat.models`), não daqui.
 */
export const DEFAULT_LLM_MODEL = 'gemini-flash-latest';

/**
 * Qual modelo escolher quando o guardado não está na lista: o apelido `gemini-flash-latest`
 * (o Google o mantém apontando para o Flash atual), senão um "flash" sem "lite" (rápido e
 * com nível gratuito), senão qualquer flash, senão o primeiro. `null` sem lista.
 */
export function pickDefaultModel(models: readonly LlmModel[], stored: string): string | null {
  if (models.some((m) => m.id === stored)) return stored;
  const latest = models.find((m) => m.id === 'gemini-flash-latest');
  const flash = models.filter((m) => /flash/i.test(m.id) && !/latest/i.test(m.id));
  const cheio = flash.find((m) => !/lite/i.test(m.id));
  return (latest ?? cheio ?? flash[0] ?? models[0])?.id ?? null;
}

const INSTRUCAO = `Você traduz texto de regras do Pathfinder 2e (Remaster) do inglês para o português do Brasil, no tom do livro traduzido: direto, em segunda pessoa ("você"), sem floreio.

Regras obrigatórias:
1. Devolva SOMENTE o HTML traduzido. Sem cercas de código, sem comentários, sem explicação.
2. Preserve TODAS as tags e atributos exatamente como estão, na mesma ordem — inclusive <x-tok>, <x-ref>, <x-lab> e <span translate="no" i="n">. Não acrescente nem remova tags. Traduza apenas o texto.
3. Cada <span translate="no" i="n"> deve conter EXATAMENTE o termo português listado em TERMOS para o número n, no lugar do inglês. Escreva a frase ao redor concordando com esse termo em gênero e número.
4. <x-tok> é vazio: mantenha vazio. <x-ref> contém o nome de uma entrada do jogo: mantenha o nome em inglês.
5. Mantenha números, dados (2d6), sinais (+2, –4), unidades (pés, minutos) e a pontuação.
6. Termos de jogo fora dos spans: use a nomenclatura da tradução oficial brasileira (Golpe, Avançar, Passo, salvamento, CD, CA, PV, Mestre, PJ, círculo de magia, talento, perícia).`;

/** O campo especial: o NOME da entrada (Etapa 45), texto puro, com prompt próprio. */
export const NAME_FIELD = 'name';

const INSTRUCAO_NOME = `Você traduz NOMES de entradas do Pathfinder 2e (Remaster) do inglês para o português do Brasil, seguindo a nomenclatura da tradução oficial brasileira quando ela existe (Guerreiro, Feiticeiro, Ladino, Bola de Fogo, Ataque Furtivo). Nome próprio de lugar, pessoa ou divindade fica como está. Responda SOMENTE com o nome traduzido, sem aspas, sem ponto, sem explicação.`;

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
  glossary: TranslationGlossary = {},
): TranslationProvider {
  return {
    id: 'llm',
    async availability(): Promise<ProviderAvailability> {
      const { hasKey } = await config();
      return hasKey ? { kind: 'ready' } : { kind: 'needs-setup', what: 'chave' };
    },
    async translate(request: TranslationRequest): Promise<string> {
      const { model } = await config();
      if (request.field === NAME_FIELD) {
        const nome = await chat.complete({
          model,
          system: INSTRUCAO_NOME,
          user: `Tipo: ${request.entityType}\nNome: ${request.html}`,
        });
        return (
          unfence(nome)
            .replace(/^["'«]|["'»]$/g, '')
            .split('\n')[0]
            ?.trim() ?? ''
        );
      }
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
