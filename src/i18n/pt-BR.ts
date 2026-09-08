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
    /**
     * A busca global. O atalho é Ctrl+Q por ora: Ctrl+Espaço, que é o que queremos, é do
     * navegador enquanto o app roda numa aba. Troca no empacotamento (Etapa 15).
     */
    palette: {
      label: 'Busca global',
      shortcut: 'Ctrl+Q',
      placeholder: 'Procurar pelo nome…',
      placeholderText: 'Procurar palavra na descrição…',
      allSources: 'Tudo',
      modeLabel: 'Onde procurar',
      inName: 'nome',
      inText: 'descrição',
      /** Menos de um segundo, medido: 794 ms para as 9.103 descrições. */
      building: 'Preparando a busca por descrição…',
      loading: 'Lendo a base…',
      /** Campo vazio: a paleta não lista nada, e diz por quê. */
      empty: 'Digite para procurar.',
      total: (n: number) => `${String(n)} entradas em quatro fontes`,
      hint: (n: number) =>
        n === 1
          ? '1 resultado · ↑↓ para andar · Enter abre em painel'
          : `${String(n)} resultados · ↑↓ para andar · Enter abre em painel`,
    },
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
    columnLevel: 'nível',
    /** O que o clique no cabeçalho vai fazer, dito antes de acontecer. */
    sort: {
      asc: (coluna: string) => `Ordenar por ${coluna}, do menor para o maior`,
      desc: (coluna: string) => `Ordenar por ${coluna}, do maior para o menor`,
      ascName: (coluna: string) => `Ordenar por ${coluna}, de A a Z`,
      descName: (coluna: string) => `Ordenar por ${coluna}, de Z a A`,
    },
    moreTraits: (n: number) => (n === 1 ? 'mais 1 traço' : `mais ${String(n)} traços`),
    /** Os nomes de raridade, para o `title` da etiqueta de uma letra. */
    rarity: {
      common: 'comum',
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
    /** O custo de CONJURAR uma magia. Ver `components/CastCost`. */
    cast: {
      /** O conectivo da faixa: `◆ a ◆◆◆`. */
      to: 'a',
    },
    /**
     * A faixa numérica preenchível — alcance e tamanho da área.
     *
     * O sinal em vez da palavra no filtro aplicado (`≥ 30 pés`) porque ele cabe num chip
     * de barra: "no mínimo 30 pés" ocupa três vezes mais para dizer o mesmo.
     */
    number: {
      from: 'de',
      to: 'até',
      minLabel: 'valor mínimo',
      maxLabel: 'valor máximo',
      units: { feet: 'pés' } as Record<string, string>,
      /** O que EXISTE no dado, dito embaixo dos campos: sem isso a faixa é um chute. */
      extent: (min: string, max: string, unit: string) => `no dado: ${min} a ${max} ${unit}`,
      atLeast: (n: string, unit: string) => `≥ ${n} ${unit}`,
      atMost: (n: string, unit: string) => `≤ ${n} ${unit}`,
    },
    /**
     * O PREÇO, em moedas do jogo.
     *
     * `PL` para platina e `PP` para prata, e não o contrário: em português as duas
     * começariam com "p" de "peças de p…", e a tradução brasileira do PF2e resolve assim.
     * O dado é guardado em cobre; ver a receita de `equipment`.
     */
    price: {
      pl: 'PL',
      po: 'PO',
      pp: 'PP',
      pc: 'PC',
      /** Preço zero: nem toda coisa do livro tem preço impresso. */
      none: '—',
    },
    /** O VOLUME. `0` é insignificante e `0,1` é o "L" do livro. */
    bulk: {
      light: 'L',
      negligible: '—',
      label: 'volume',
    },
    /** A defesa contra a magia: CA, salvamento, ou os dois. */
    defense: {
      save: {
        fortitude: 'Fortitude',
        reflex: 'Reflexos',
        will: 'Vontade',
      } as Record<string, string>,
      /** `Vontade` + `básico`, como no livro. */
      basic: 'básico',
      /** `CA e Fortitude básico`: 6 magias atacam e ainda pedem salvamento. */
      and: 'e',
      /*
       * Só a CA. As CDs passivas (`fortitude-dc`) dobram no salvamento de mesmo nome antes
       * de chegar aqui — ver `CD_PASSIVA` em `core/browse/query.ts`.
       */
      passive: { ac: 'CA' } as Record<string, string>,
    },
    /** A duração do efeito. Sem ela, a magia é instantânea. */
    duration: {
      sustained: 'sustentada',
      /** `sustentada` + `, 1 minuto` quando a fonte diz as duas coisas. */
      sustainedFor: (quanto: string) => `sustentada, ${quanto}`,
    },
    /** As três linhas do ritual, e o que cada número quer dizer. */
    ritual: {
      primary: (teste: string) => `teste primário ${teste}`,
      casters: (quantos: number) =>
        quantos === 1 ? '1 conjurador secundário' : `${String(quantos)} conjuradores secundários`,
      /** Nulo não é zero: a fonte não diz quantos. */
      castersUnknown: 'conjuradores secundários não especificados',
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
      level: 'nível',
      onlyLevel1: 'nível 1',
      prerequisites: 'pré-requisitos',
      maxTakable: 'repetições',
      group: 'grupo',
      valued: 'valorada',
      /*
       * "Tipo", e não "setor". `sector` continua sendo o nome do campo no código — é o que
       * a receita lê da pasta do compêndio —, mas na tela ele responde "que espécie de
       * coisa é esta": magia de foco, ritual, talento de classe. "Setor" era vocabulário
       * nosso, de dentro da normalização, e não dizia nada a quem consulta.
       */
      sector: 'tipo',
      summary: 'resumo',
      overrides: 'anula',
      traits: 'traços',
      frequency: 'frequência',
      costKind: 'custo',
      category: 'categoria',
      rarity: 'raridade',
      /*
       * "Ranque", e não "posto": é como a comunidade brasileira lê `rank` do Remaster, e é
       * o rótulo tanto da calha antes do nome quanto do filtro. Os dois liam textos
       * diferentes — a calha usava o `nível` fixo de talentos, e o filtro dizia `posto`.
       */
      rank: 'ranque',
      cast: 'execução',
      traditions: 'tradições',
      range: 'distância',
      target: 'alvos',
      area: 'área',
      duration: 'duração',
      sustained: 'sustentada',
      save: 'defesa',
      materialCost: 'custo',
      requirements: 'requisitos',
      ritual: 'ritual',
      /* Equipamento. `kind` é o Tipo — ver a receita, e a nota sobre a pasta. */
      kind: 'tipo',
      family: 'família',
      price: 'preço',
      bulk: 'volume',
      usage: 'uso',
      /* A conta sobre `usage`, em oito respostas. Ver a receita de equipamento. */
      carry: 'como se usa',
      hands: 'mãos',
      weaponType: 'tipo de arma',
      damage: 'dano',
      reload: 'recarga',
      acBonus: 'bônus de CA',
      dexCap: 'limite de Des',
      checkPenalty: 'penalidade em testes',
      speedPenalty: 'penalidade de deslocamento',
      strength: 'Força exigida',
      hardness: 'dureza',
      hitPoints: 'pontos de vida',
      uses: 'cargas',
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
