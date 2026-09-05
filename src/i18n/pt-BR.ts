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
    searchLabel: 'Filtrar a lista',
    notReady: 'ainda não disponível',
    empty: 'Sincronize a base para começar a consultar.',
    noResults: 'Nada encontrado.',
    counting: (shown: number, total: number) =>
      shown === total ? `${String(total)} entradas` : `${String(shown)} de ${String(total)}`,
    filters: 'Filtros',
    clearFilters: 'Limpar tudo',
    activeFilters: 'Filtros ativos',
    filterOptions: 'filtrar…',
    findSource: 'Achar fonte…',
    noValue: '— sem valor —',
    yes: 'sim',
    no: 'não',
    retired: 'aposentada',
    removeFilter: 'Remover este filtro',
    clearTopic: 'Limpar este filtro',
    findOption: 'Achar opção…',
    combineLabel: 'Como combinar os valores marcados',
    combineAny: 'Qualquer um (OU)',
    combineAll: 'Todos (E)',
    collapseRail: 'Recolher as fontes',
    expandRail: 'Mostrar as fontes',
    collapseDetail: 'Recolher o painel',
    expandDetail: 'Mostrar o painel',
    columns: 'Colunas',
    columnName: 'nome',
    moreTraits: (n: number) => (n === 1 ? 'mais 1 traço' : `mais ${String(n)} traços`),
    /** Os nomes de raridade, para o `title` da etiqueta de uma letra. */
    rarity: {
      uncommon: 'incomum',
      rare: 'rara',
      unique: 'única',
    } as Record<string, string>,
    columnsHint: (max: number) =>
      `Até ${String(max)} colunas à direita. Os dados fixos acompanham o nome e não contam.`,
    columnsAlways: 'dados fixos',
    columnsShown: 'mostrando',
    specialLabel: {
      level: 'nível',
      rarity: 'raridade',
      traits: 'traços',
    } as Record<string, string>,
    columnsHidden: 'disponíveis',
    columnsReset: 'Voltar ao padrão',
    columnUp: 'Mover para a esquerda',
    columnDown: 'Mover para a direita',
    /** Custo em ações — artboard 1a, seção 4. */
    cost: {
      actions: (n: number) => (n === 1 ? '1 ação' : `${String(n)} ações`),
      reaction: 'reação',
      free: 'ação livre',
      passive: 'passiva',
      label: 'custo',
    },
    /**
     * A frequência, montada a partir do que `core/browse/duration.ts` decodificou.
     *
     * `core/` devolve estrutura e a palavra é escrita aqui — a FRONTEIRA não deixa
     * `core/` conhecer português.
     */
    frequency: {
      units: {
        round: ['rodada', 'rodadas'],
        turn: ['turno', 'turnos'],
        second: ['segundo', 'segundos'],
        minute: ['minuto', 'minutos'],
        hour: ['hora', 'horas'],
        day: ['dia', 'dias'],
        week: ['semana', 'semanas'],
        month: ['mês', 'meses'],
        year: ['ano', 'anos'],
      } as Record<string, [string, string]>,
      /** `1` + `por dia`; `2` + `a cada 10 minutos`. */
      times: (max: number) => `${String(max)}×`,
      every: (count: number, unit: [string, string]): string =>
        count === 1 ? `por ${unit[0]}` : `a cada ${String(count)} ${unit[1]}`,
      /** Código que não reconhecemos aparece cru, para o defeito ficar visível. */
      unknown: (code: string) => `por ${code}`,
    },
    /** Conteúdo anterior ao Remaster. Só o legado é marcado; o resto não ganha nada. */
    legacy: 'legado',
    legacyHint: 'Publicado antes do Remaster: pode ter sido substituído por regra nova.',
    detail: {
      close: 'Fechar',
      popOut: 'Destacar em painel flutuante',
      minimize: 'Minimizar',
      resize: 'Redimensionar',
      resizeSidebar: 'Largura do painel',
      nothingSelected: 'Escolha uma entrada da lista para ver os detalhes.',
      restore: 'Restaurar',
      translate: 'Traduzir',
      retranslate: 'Traduzir de novo, sem usar o cache',
      toggleOriginal: 'Ver original',
      toggleTranslated: 'Ver tradução',
      /** A tradução é a Etapa 14. Os botões existem, e dizem por que não funcionam ainda. */
      translationPending:
        'A tradução sob demanda é a Etapa 15 do plano. Os botões já estão no lugar para o desenho ser avaliado.',
      description: 'Descrição',
      empty: 'Escolha uma entrada na lista.',
    },
    fieldLabel: {
      group: 'grupo',
      valued: 'valorada',
      sector: 'setor',
      summary: 'resumo',
      overrides: 'anula',
      traits: 'traços',
      frequency: 'frequência',
      costKind: 'custo',
      category: 'categoria',
      rarity: 'raridade',
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
      /*
       * Escrito para quem USA o app, não para quem o programa.
       *
       * A versão anterior falava em "receita" e "tipo que importamos" — vocabulário de
       * dentro do código. Quem lê isto quer saber uma coisa só: o que ficou de fora.
       */
      unreadPacks: {
        title: 'O que não foi sincronizado',
        hint:
          'Estes pacotes do Pathfinder 2e ficaram de fora. São, na maior parte, habilidades ' +
          'de criatura e de familiar, que ainda não têm lugar no app.',
      },
      stayedOn: (tag: string) => `Continua em ${tag}.`,
      upgradeFailed: (tag: string, failures: number) =>
        `A ${tag} não foi adotada: ${String(failures)} entrada(s) não puderam ser lidas. ` +
        `A base anterior continua valendo.`,
      upgradeUnavailable:
        'Não foi possível ler a versão mais nova. A base anterior continua valendo.',
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
