/**
 * Todo texto que a INTERFACE escreve, em pt-BR.
 *
 * Regra (briefing, secao 8.1): nome e descricao vindos dos packs do Foundry NUNCA
 * passam por aqui — eles ficam em ingles, byte a byte como vieram.
 * Este arquivo e so o que o aplicativo diz por conta propria.
 */
export const ptBR = {
  app: {
    nome: 'brfinder2e',
    subtitulo: 'Forja de fichas de Pathfinder 2e (Remaster)',
  },
  esqueleto: {
    titulo: 'Esqueleto no ar',
    descricao: 'Etapa 0 concluida. As telas comecam na Etapa 4.',
  },
} as const;

export type Textos = typeof ptBR;
