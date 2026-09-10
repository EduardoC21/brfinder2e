import { createContext } from 'react';

import type { TraitGlossary } from '@core/glossary/index';

/**
 * O glossário de traços, como CONTEXTO.
 *
 * Contexto aqui, e parâmetro no `RichText` — e a diferença é de propósito. Lá eram três
 * funções puras num arquivo só; aqui o consumidor é um chip que mora em quatro
 * componentes, em cinco arquivos, inclusive dentro dos flutuantes. Passar o glossário
 * por prop atravessaria a lista, a linha, o painel e o campo só para chegar num `<span>`
 * — e cada intermediário ganharia uma prop que ele não lê.
 *
 * É o caso clássico do contexto: dado ambiente, só de leitura, consumido em folhas
 * espalhadas. O padrão vazio faz o chip funcionar fora do provedor — sem caixinha, mas
 * sem quebrar.
 */
export const TraitGlossaryContext = createContext<TraitGlossary>({});
