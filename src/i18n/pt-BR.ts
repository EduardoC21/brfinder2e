/**
 * Todo texto que a INTERFACE escreve, em pt-BR.
 *
 * As chaves são em inglês (é código); os valores são em português (é conteúdo).
 *
 * Regra (briefing, seção 8.1): nome e descrição vindos dos packs do Foundry NUNCA
 * passam por aqui — eles ficam em inglês, byte a byte como vieram.
 * Este arquivo é só o que o aplicativo diz por conta própria.
 */
export const ptBR = {
  app: {
    name: 'brfinder2e',
    tagline: 'Forja de fichas de Pathfinder 2e (Remaster)',
  },
  skeleton: {
    title: 'Esqueleto no ar',
    description: 'Etapa 0 concluída. As telas começam na Etapa 4.',
  },
} as const;

export type Strings = typeof ptBR;
