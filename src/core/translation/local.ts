/**
 * O PROVEDOR LOCAL (Etapa 34, pelo autor): a tradução "grátis e constante", que é o
 * carro-chefe — o modelo de linguagem é o aprimoramento, não o caminho principal.
 *
 * O core não sabe que motor é: recebe uma PORTA (`MachineTranslator`) que traduz HTML de
 * uma língua para outra. Quem a implementa é `platform/translator-bergamot.ts`, com o
 * motor do Firefox em WASM. O que o core faz é o que importa para o texto do jogo:
 *
 *   1. blindar    as marcas do Foundry viram elementos que o motor preserva, e o
 *                 glossário protege os termos que ele erraria — `shield.ts`
 *   2. traduzir   pela porta, em modo HTML
 *   3. refazer    as marcas voltam com o rótulo traduzido; se alguma sumiu, FALHA — e
 *                 nada se grava
 *
 * O glossário é a soma dos termos fixos (`phrases.ts`) com o que o pacote da comunidade
 * dá — os nomes das entradas, para os rótulos das referências.
 */

import { CORE_PHRASES } from './phrases';
import type { ProviderAvailability, TranslationProvider, TranslationRequest } from './methods';
import { shield, type Phrase } from './shield';

/** A porta do motor: traduz HTML, preservando tags. `ready` diz se dá para traduzir agora. */
export interface MachineTranslator {
  ready(from: string, to: string): Promise<ProviderAvailability>;
  translateHtml(html: string, from: string, to: string): Promise<string>;
}

export interface LocalGlossary {
  /** Termos além dos fixos — os do pacote, quando houver. */
  readonly phrases?: readonly Phrase[];
  /** O nome em português de um rótulo de referência. */
  readonly nameOf?: (label: string) => string | null;
}

/**
 * O POLIMENTO do português que sai do motor (Etapa 38): o que é regra da língua, não
 * escolha de tradução. Medido na amostra: os ordinais saem "9o nível", "4a:" — o motor
 * não tem o "º" — e o gênero varia entre "3o" e "4a" para o mesmo "3rd/4th". Nível e
 * círculo são masculinos: "º". Só em texto, nunca dentro de uma marca ou tag.
 */
export function polishPortuguese(html: string): string {
  return html
    .split(/(<[^>]+>|@\w+\[[^\]]*\](?:\{[^}]*\})?|\[\[[^\]]*\]\](?:\{[^}]*\})?)/)
    .map((parte, indice) =>
      indice % 2 === 1 ? parte : parte.replace(/\b(\d+)[oa]\b(?=[\s:;,.)]|$)/g, '$1º'),
    )
    .join('');
}

/** `pt-BR` → `pt`: o motor conhece o par `enpt`, não a variante. */
export function machineLanguage(language: string): string {
  return language.split('-')[0]?.toLowerCase() ?? language;
}

export function createLocalProvider(
  machine: MachineTranslator,
  glossary: LocalGlossary = {},
): TranslationProvider {
  return {
    id: 'local',
    availability: (language) => machine.ready('en', machineLanguage(language)),
    async translate(request: TranslationRequest): Promise<string> {
      const blindado = shield(request.html, {
        phrases: [...CORE_PHRASES, ...(glossary.phrases ?? [])],
        ...(glossary.nameOf === undefined ? {} : { nameOf: glossary.nameOf }),
      });
      const traduzido = await machine.translateHtml(
        blindado.text,
        'en',
        machineLanguage(request.language),
      );
      return polishPortuguese(blindado.restore(traduzido));
    },
  };
}
