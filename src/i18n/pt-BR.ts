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
    /** A base foi gravada por receitas mais antigas que as do app. */
    stale: '· sincronize de novo',
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
    /**
     * As moedas, e são TRÊS: a platina não entra.
     *
     * A conversão para em PO por decisão do autor — o livro escreve "2.500 po" para o Acid
     * Flask superior, e não "250 pl". A platina existe na fonte como moeda de tesouro
     * (`Platinum Pieces`), e ali ela é o item, não a unidade de leitura.
     */
    price: {
      po: 'PO',
      pp: 'PP',
      pc: 'PC',
      /** Preço zero: nem toda coisa do livro tem preço impresso. */
      none: '—',
      /** `1 PP (por 10)` — o AoN escreve `1 sp (price for 10)`. São 48 itens. */
      per: (quantas: number) => `(por ${String(quantas)})`,
    },
    /**
     * O DANO, quando ele tem mais de uma parte.
     *
     * `1 Acid, 1d6 Acid persistente, 1 de respingo` — a mesma frase que a descrição do
     * item escreve por extenso. Só o tipo de dano fica em inglês, como todo dado de jogo.
     *
     * Na COLUNA as palavras somem e sobra o sinal (`1 Acid +1d6`): ver `itemDamageShort`.
     */
    damage: {
      persistent: 'persistente',
      splash: 'de respingo',
    },
    /**
     * O ANTECEDENTE, e as duas palavras que a tela precisa dizer por conta própria.
     *
     * `ou` porque o aumento é uma ESCOLHA entre dois atributos, e `Livre` porque 9 dos 520
     * não recortam nenhum. Os nomes dos atributos continuam em inglês, como todo dado de
     * jogo — ver `attributeName`.
     */
    background: {
      or: 'ou',
      freeBoost: 'Livre',
    },
    /** A tela completa da entrada (22b): o botão que abre, o que volta, e as abas. */
    fullView: {
      open: 'Tela completa',
      back: 'Voltar à lista',
      locked: 'Filtro travado nesta entrada',
      tabs: {
        details: 'Detalhes',
        heritages: 'Heranças',
        feats: 'Talentos',
      } as Record<string, string>,
    },
    /**
     * Os VALORES da ancestralidade que têm rótulo em português. São códigos do Foundry,
     * não dado de jogo em inglês — `med` não é palavra do livro —, e por isso traduzem.
     */
    ancestry: {
      size: {
        tiny: 'Minúsculo',
        sm: 'Pequeno',
        med: 'Médio',
        lg: 'Grande',
      } as Record<string, string>,
      vision: {
        normal: 'Normal',
        'low-light-vision': 'Penumbra',
        darkvision: 'Escuridão',
      } as Record<string, string>,
      feet: (valor: string) => `${valor} pés`,
      /** Quantos idiomas adicionais — a regra da página, que o pack só tem como número. */
      extraLanguages: {
        int: 'tantos quanto o modificador de Inteligência (se positivo)',
        '1+int': '1 + o modificador de Inteligência (se positivo)',
      } as Record<string, string>,
      /** O Tipo da fonte de ancestralidade: as 50, e as 17 heranças versáteis. */
      kind: {
        ancestry: 'Ancestralidade',
        versatile: 'Herança versátil',
      } as Record<string, string>,
      /** A categoria da habilidade, que é o Tipo da fonte de habilidades. */
      category: {
        ancestryfeature: 'Ancestralidade',
        classfeature: 'Classe',
      } as Record<string, string>,
    },
    /**
     * A SANTIFICAÇÃO da divindade: o que o clérigo pode (ou deve) ser.
     *
     * `holy` e `unholy` são traços do jogo, e ficam em inglês em todo lugar — menos aqui,
     * onde entram numa frase em português. "Pode ser holy" seria pior que os dois.
     */
    sanctification: {
      can: 'pode ser',
      must: 'deve ser',
      or: 'ou',
      none: 'nenhuma',
      what: {
        holy: 'sagrado',
        unholy: 'profano',
      } as Record<string, string>,
    },
    /** O VOLUME. `0` é insignificante e `0,1` é o "L" do livro. */
    bulk: {
      light: 'L',
      negligible: '—',
      label: 'volume',
    },
    /**
     * A sub-lista de ações de uma perícia.
     *
     * "Destreinado" e "Treinado" são os dois graus que a tabela do livro separa: o primeiro
     * é o que qualquer um pode tentar, o segundo exige treinamento na perícia.
     */
    skill: {
      untrained: 'Destreinado',
      trained: 'Treinado',
      /** Perícia é a única fonte sem descrição, e a tela diz por quê em vez de calar. */
      noDescription:
        'O pacote do Foundry não traz o texto que descreve a perícia — ele guarda só o ' +
        'atributo e as ações. A descrição está no Player Core.',
      openAction: 'Abrir a ação aqui embaixo',
      closeAction: 'Fechar a ação',
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
      /**
       * A descrição NO CONTEXTO: o Change Shape aberto pelo Anadi tem o texto do Anadi.
       * `override` avisa e oferece o original; `add` avisa e acrescenta.
       */
      context: {
        override: (de: string) => `Descrição de ${de}. `,
        original: 'Descrição original. ',
        added: (de: string) => `O que ${de} acrescenta:`,
        seeOriginal: 'Ver a original',
        seeFrom: (de: string) => `Ver a de ${de}`,
      },
      popOut: 'Destacar em painel flutuante',
      /*
       * O voltar do painel, e a dica ensina o gesto que ninguém adivinha sozinho: o
       * Ctrl+clique abre um painel novo em vez de navegar neste.
       */
      back: 'Voltar (Ctrl+clique abre em painel novo)',
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
      price: 'preço',
      bulk: 'volume',
      usage: 'uso',
      attribute: 'atributo-chave',
      untrained: 'ações',
      /* Ancestralidade. Os rótulos da ficha: PV, tamanho, deslocamento, falha, visão. */
      hp: 'PV',
      size: 'tamanho',
      speed: 'deslocamento',
      flaws: 'falha',
      vision: 'visão',
      languages: 'idiomas',
      additionalLanguages: 'idiomas adicionais',
      extraLanguages: 'quantos',
      features: 'habilidades',
      /* Habilidade: a ancestralidade (ou classe) dona. A categoria já é `category` (equipamento). */
      owner: 'de',
      /* Herança: a ancestralidade dona. */
      ancestry: 'de',
      /* Antecedente. "Saber" é como o livro brasileiro chama a perícia Lore. */
      skills: 'perícia treinada',
      lore: 'Saber',
      boosts: 'aumento',
      feats: 'talento',
      /* Divindade. `kind` é o Tipo, como em equipamento. */
      divineAttribute: 'atributo divino',
      font: 'fonte divina',
      sanctification: 'santificação',
      divineSkill: 'perícia divina',
      weapons: 'arma favorita',
      domains: 'domínios',
      alternateDomains: 'domínios alternativos',
      spells: 'magias de clérigo',
      /* Regra: a seção da tela do mestre. Faz o papel de Tipo. */
      section: 'seção',
      /* Domínio. */
      spell: 'magia de domínio',
      advancedSpell: 'magia de domínio avançada',
      /*
       * "Uso", e não "como se usa": é o rótulo do AoN, e é o mesmo campo do detalhe visto
       * por outro ângulo — oito respostas em vez das 120 grafias cruas. Por isso o `usage`
       * cru deixou de ser coluna: duas colunas com o mesmo rótulo e respostas diferentes.
       */
      carry: 'uso',
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
    features: 'Habilidades',
    heritages: 'Heranças',
    deities: 'Divindades',
    domains: 'Domínios',
    rules: 'Regras',
    skills: 'Perícias',
  } as Record<string, string>,
  settings: {
    /**
     * As duas vassouras. Destrutivas as duas, e por isso em dois cliques, com o aviso
     * escrito no lugar do botão.
     */
    maintenance: {
      title: 'Manutenção',
      purgeRetired: (quantas: number) =>
        quantas === 1
          ? 'Apagar 1 entrada aposentada'
          : `Apagar ${String(quantas)} entradas aposentadas`,
      purgeWarning:
        'As entradas aposentadas saíram da fonte, mas podem estar em uso numa ficha, num ' +
        'monstro, num combate ou num escudo do mestre seu. Apagá-las pode quebrar o que as ' +
        'usa. Quer apagar mesmo assim?',
      clearAll: 'Apagar a base inteira',
      clearWarning:
        'Isto apaga todas as entradas sincronizadas. Fichas, monstros, combates e escudos ' +
        'que apontem para elas deixam de encontrá-las até uma nova sincronização — e o que ' +
        'apontava para uma entrada que não voltar fica quebrado. Quer apagar mesmo assim?',
      confirm: 'Apagar',
      cancel: 'Cancelar',
      keepsPrefs: 'As preferências (colunas, filtros, largura dos painéis) não são apagadas.',
    },
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
        stale:
          'As receitas mudaram desde esta sincronização: o que está gravado é de antes. ' +
          'Sincronize de novo para ver as mudanças.',
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
