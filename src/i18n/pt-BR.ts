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
  browse: {
    sourcesLabel: 'Fontes',
    searchPlaceholder: 'Filtrar',
    notReady: 'ainda não disponível',
    empty: 'Sincronize a base para começar a consultar.',
    noResults: 'Nada encontrado.',
    counting: (shown: number, total: number) =>
      shown === total ? `${String(total)} entradas` : `${String(shown)} de ${String(total)}`,
    filters: 'Filtros',
    clearFilters: 'Limpar',
    noValue: '— sem valor —',
    yes: 'sim',
    no: 'não',
    retired: 'aposentada',
    detailProvisional:
      'A tela de detalhe é a Etapa 8. Por enquanto a descrição aparece crua, com a marcação do Foundry — é o que a Etapa 7 vai transformar em texto legível com referência cruzada.',
    fieldLabel: {
      group: 'grupo',
      valued: 'valorada',
      'source.title': 'livro',
    } as Record<string, string>,
  },
  /** Os nomes das fontes do trilho. Ver `core/browse/spec.ts` para a estrutura. */
  sources: {
    conditions: 'Condições',
    actions: 'Ações',
    feats: 'Talentos',
    spells: 'Magias',
    equipment: 'Equipamentos',
    ancestries: 'Ancestralidade',
    backgrounds: 'Antecedente',
    archetypes: 'Arquétipo',
    classes: 'Classe',
    companions: 'Companheiro',
    familiars: 'Familiar',
    skills: 'Perícias',
  } as Record<string, string>,
  settings: {
    open: 'Configurações',
    title: 'Configurações',
    database: {
      title: 'Base de dados',
      description: 'Baixa o sistema Pathfinder 2e do Foundry e prepara as entradas para consulta.',
      sync: 'Sincronizar',
      syncAgain: 'Sincronizar de novo',
      checkUpdate: 'Procurar versão nova',
      checking: 'Procurando…',
      upToDate: 'Você está na versão mais recente.',
      updateFound: 'Versão nova disponível:',
      updateTo: 'Atualizar para',
      incompatible:
        'Esta versão mudou de estrutura e o aplicativo ainda não a acompanha. A base atual continua valendo — atualize o aplicativo e tente de novo.',
      refusedToPersist:
        'A atualização não foi gravada porque houve falha ao ler as entradas. A base anterior continua valendo.',
      retired: 'aposentadas',
      retiredHint:
        'Entradas que sumiram da fonte continuam guardadas, para não quebrar fichas que as usem.',
      cancel: 'Cancelar',
      phase: {
        resolving: 'Procurando a versão…',
        downloading: 'Baixando o pacote',
        reading: 'Abrindo o arquivo',
        normalizing: 'Preparando as entradas',
      },
      report: {
        type: 'tipo',
        imported: 'entradas',
        added: 'novas',
        updated: 'mudaram',
        removed: 'sumiram',
        failed: 'falhas',
        none: 'Nenhuma base gravada ainda.',
        syncedAt: 'sincronizado em',
      },
      error: {
        title: 'A sincronização falhou',
        retry: 'Tentar de novo',
      },
    },
  },
} as const;

export type Strings = typeof ptBR;
