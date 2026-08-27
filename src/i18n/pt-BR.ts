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
    name: 'Forja',
    shortName: 'BR',
    tagline: 'Forja de fichas de Pathfinder 2e (Remaster)',
  },
  tabs: {
    lookup: 'Consulta',
    sheets: 'Fichas',
  },
  base: {
    empty: 'base ausente',
    /** `entries` e `version` entram por interpolação em quem monta a linha. */
    label: 'base',
  },
  settings: {
    open: 'Configurações',
    title: 'Configurações',
    database: {
      title: 'Base de dados',
      description: 'Baixa o sistema Pathfinder 2e do Foundry e prepara as entradas para consulta.',
      sync: 'Sincronizar',
      syncAgain: 'Sincronizar de novo',
      cancel: 'Cancelar',
      phase: {
        resolving: 'Procurando a versão…',
        downloading: 'Baixando o pacote',
        reading: 'Abrindo o arquivo',
        normalizing: 'Preparando as entradas',
      },
      report: {
        title: 'Importado',
        type: 'tipo',
        imported: 'entradas',
        failed: 'falhas',
        none: 'Nada importado ainda.',
        version: 'versão do sistema',
      },
      error: {
        title: 'A sincronização falhou',
        retry: 'Tentar de novo',
      },
      notPersisted:
        'Esta versão ainda não guarda a base: ao recarregar a janela, é preciso sincronizar de novo.',
    },
  },
} as const;

export type Strings = typeof ptBR;
