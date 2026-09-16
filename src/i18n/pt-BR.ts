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
    /** A rede de proteção (58): o que aparece se a tela quebrar. */
    crash: {
      title: 'Alguma coisa quebrou nesta tela.',
      description:
        'A base e as suas traduções continuam guardadas. Recarregue; se voltar a acontecer, mande a mensagem abaixo para quem cuida do app.',
      reload: 'Recarregar',
    },
    name: 'Forja',
    shortName: 'BR',
    tagline: 'Forja de fichas de Pathfinder 2e (Remaster)',
  },
  tabs: {
    lookup: 'Consulta',
    sheets: 'Fichas',
  },
  /**
   * A AJUDA (Etapa 59, pelo autor): o painel do "?" ao lado da engrenagem. Texto como
   * dados — seções de título e parágrafos — para o componente só desenhar. É o que se
   * mandaria no grupo dos jogadores, guardado onde eles vão procurar.
   */
  help: {
    open: 'Ajuda',
    title: 'Como usar',
    sections: [
      {
        title: 'O que é',
        body: [
          'Consulta das regras de Pathfinder 2e (Remaster): ancestralidades, classes, talentos, magias, itens, condições e regras. Sem login e sem instalar nada.',
          'Tudo o que você baixa e traduz fica guardado no seu navegador — use sempre o mesmo navegador, no mesmo aparelho. Por enquanto só há versão para PC.',
        ],
      },
      {
        title: 'Primeira vez: sincronizar',
        body: [
          'Engrenagem › Sincronização › Sincronizar. Leva uns 40 segundos: baixa a base oficial do sistema pf2e do Foundry (17 mil entradas) e prepara tudo. Só uma vez; quando sair versão nova, é o mesmo botão.',
          'Junto com a base vem o glossário da comunidade, que o tradutor usa para os termos do jogo. Confira em Tradução › Glossário da comunidade; se disser "ainda não baixado", clique Atualizar.',
        ],
      },
      {
        title: 'Consultar',
        body: [
          'Navegue pelas categorias da esquerda ou use a busca — ela encontra pelo nome em inglês e em português. Um link dentro de um texto abre a entrada ligada. Os filtros acham por nível, tradição, traço e afins.',
          'Clicar numa entrada abre a lateral. Ancestralidades e classes têm mais que isso: o botão ⛶ no alto da lateral abre a tela completa, com as abas de heranças, talentos, progressão e o texto do livro.',
        ],
      },
      {
        title: 'Traduzir',
        body: [
          'A tradução é sob demanda, com uma chave gratuita do Google Gemini que é sua: crie em aistudio.google.com/apikey (conta Google, sem cartão). Depois, engrenagem › Tradução › Tradutor › cole a chave › Guardar › Testar.',
          'No campo Modelo, dê preferência ao "Gemini Flash-Lite Latest": é o que está funcionando bem na cota gratuita. Em qualquer entrada, clique Traduzir; em alguns segundos o texto aparece em português, com os termos do glossário.',
          'Em Tradução você escolhe se vê o original ou o traduzido por padrão, e se os nomes das entradas aparecem traduzidos. Achou algo estranho? O lápis ✎ corrige na mão, e a sua correção nunca é sobrescrita.',
        ],
      },
      {
        title: 'Tradução coletiva',
        body: [
          'Toda tradução que alguém faz sobe sozinha para uma central compartilhada. Ao abrir algo que outra pessoa já traduziu, aparece "Usar a compartilhada" — sem gastar a sua cota. Em Tradução › Traduções compartilhadas › Aceitar todas você puxa tudo o que já existe de uma vez.',
          'Nessa seção, coloque um Apelido (é como você aparece para os outros) e deixe o Endereço da central vazio: vazio é a central do projeto.',
        ],
      },
      {
        title: 'Bugs e erros de dados',
        body: [
          'A base vem do Foundry e não é perfeita: às vezes um dado, um link ou um texto não bate com o Archives of Nethys. Qualquer bug, ou discordância com o AoN, mande para quem cuida do app (print + nome da entrada) — entra nas próximas atualizações. O site atualiza sozinho; é só recarregar.',
        ],
      },
    ] as readonly { readonly title: string; readonly body: readonly string[] }[],
  },
  base: {
    empty: 'base ausente',
    /** `entries` e `version` entram por interpolação em quem monta a linha. */
    label: 'base',
    /** A base foi gravada por receitas mais antigas que as do app. */
    stale: '· sincronize de novo',
  },
  browse: {
    /** O editor de tradução (Etapa 43). */
    editor: {
      title: (nome: string) => `Editar a tradução: ${nome}`,
      fromOriginal: 'a partir do original — não há tradução gravada',
      fromTranslation: (forma: string) => `a partir da tradução: ${forma.toLowerCase()}`,
      source: 'HTML',
      preview: 'Como vai aparecer',
      name: 'Nome',
      nameHint: (original: string) => `original: ${original} — vazio volta ao glossário`,
      hint: 'Edite o texto entre as tags. As marcas do Foundry (@UUID, @Damage, @Check…) têm de continuar: o nome entre chaves pode mudar, o alvo não.',
      marksMissing: (alvos: readonly string[]) =>
        `Falta${alvos.length === 1 ? '' : 'm'} ${String(alvos.length)} marca${alvos.length === 1 ? '' : 's'} do original: ${alvos.map((a) => a.slice(0, 60)).join(' · ')}`,
      save: 'Gravar',
      saving: 'Gravando…',
      close: 'Fechar',
      discard: 'Descartar',
      delete: 'Apagar tradução',
      deleteConfirm: 'Apagar mesmo — a máquina poderá traduzir de novo',
    },
    /**
     * OS TERMOS DO SISTEMA em português, alimentados pela tradução da comunidade (Etapa 33,
     * pelo autor: "usar no sistema as traduções corretas"). Só aparecem com a preferência
     * "Traduzido" — no "Original" o dado de jogo fica em inglês, como sempre foi. Cada
     * valor é o do módulo pt-BR (`PF2E.Skill.*`, `PF2E.Ability*`, `PF2E.Trait*`,
     * `PF2E.Damage.RollFlavor.*`, `PF2E.WeaponType*`, `PF2E.ArmorType*`,
     * `PF2E.WeaponGroup*`, `PF2E.Item.Feat.Category.*`), copiado e não inventado.
     */
    terms: {
      skills: {
        acrobatics: 'Acrobatismo',
        arcana: 'Arcanismo',
        athletics: 'Atletismo',
        crafting: 'Manufatura',
        deception: 'Dissimulação',
        diplomacy: 'Diplomacia',
        intimidation: 'Intimidação',
        medicine: 'Medicina',
        nature: 'Natureza',
        occultism: 'Ocultismo',
        religion: 'Religião',
        society: 'Sociedade',
        stealth: 'Furtividade',
        survival: 'Sobrevivência',
        thievery: 'Ladroagem',
        /* Não está no módulo (a perícia entrou no Remaster); é a da tradução oficial. */
        performance: 'Atuação',
      } as Record<string, string>,
      attributes: {
        str: 'Força',
        dex: 'Destreza',
        con: 'Constituição',
        int: 'Inteligência',
        wis: 'Sabedoria',
        cha: 'Carisma',
      } as Record<string, string>,
      traditions: {
        arcane: 'Arcana',
        divine: 'Divina',
        occult: 'Ocultista',
        primal: 'Primal',
      } as Record<string, string>,
      damage: {
        acid: 'ácido',
        bleed: 'sangramento',
        bludgeoning: 'contundente',
        cold: 'frio',
        electricity: 'eletricidade',
        fire: 'fogo',
        force: 'energia',
        mental: 'mental',
        piercing: 'perfurante',
        poison: 'veneno',
        precision: 'precisão',
        slashing: 'cortante',
        sonic: 'sônico',
        spirit: 'espírito',
        vitality: 'vitalidade',
        void: 'vazio',
        untyped: 'sem tipo',
      } as Record<string, string>,
      /* Valores de Tipo, categoria e grupo que aparecem em coluna, filtro e detalhe. */
      values: {
        /* A fonte divina (PF2E.Item.Deity.DivineFont.*). */
        harm: 'Ferir',
        heal: 'Curar',
        simple: 'Simples',
        martial: 'Marcial',
        advanced: 'Avançada',
        unarmed: 'Desarmado',
        unarmored: 'Sem armadura',
        light: 'Leve',
        medium: 'Média',
        heavy: 'Pesada',
        axe: 'Machado',
        bomb: 'Bomba',
        bow: 'Arco',
        brawling: 'Pugilato',
        club: 'Clava',
        crossbow: 'Besta',
        dart: 'Dardo',
        firearm: 'Arma de fogo',
        flail: 'Mangual',
        hammer: 'Martelo',
        knife: 'Faca',
        pick: 'Picareta',
        polearm: 'Haste',
        shield: 'Escudo',
        sling: 'Funda',
        spear: 'Lança',
        sword: 'Espada',
        Ancestry: 'Ancestralidade',
        Class: 'Classe',
        Archetype: 'Arquétipo',
        Skill: 'Perícia',
        General: 'Geral',
        Mythic: 'Mítico',
        Miscellaneous: 'Diversos',
        Spells: 'Magias',
        Focus: 'Foco',
        Rituals: 'Rituais',
        'Impossible Spells': 'Impossíveis',
        Basic: 'Básica',
        Adventure: 'Aventura',
        weapon: 'Arma',
        armor: 'Armadura',
        consumable: 'Consumível',
        ammo: 'Munição',
        equipment: 'Equipamento',
        treasure: 'Tesouro',
        backpack: 'Recipiente',
        kit: 'Kit',
      } as Record<string, string>,
    },
    /** O trilho setorizado (Etapa 27): as pastas, o "Todos", e a fonte no plural. */
    rail: {
      groups: {
        character: 'Personagem',
        feats: 'Talentos',
        features: 'Características',
        equipment: 'Equipamentos',
        spells: 'Magias',
        rules: 'Regras',
      } as Record<string, string>,
      all: 'Todos',
      /**
       * Os Tipos em português SÓ no trilho, por enquanto (o autor): o filtro e a coluna
       * continuam com o dado como está, até a tradução dos filtros. Por fonte e valor.
       */
      types: {
        feats: {
          Ancestry: 'Ancestralidade',
          Class: 'Classe',
          Archetype: 'Arquétipo',
          Skill: 'Perícia',
          General: 'Geral',
          Mythic: 'Mítico',
          Miscellaneous: 'Diversos',
        },
        equipment: {
          weapon: 'Armas',
          armor: 'Armaduras',
          shield: 'Escudos',
          consumable: 'Consumíveis',
          ammo: 'Munições',
          equipment: 'Equipamentos',
          treasure: 'Tesouros',
          backpack: 'Recipientes',
          kit: 'Kits',
        },
        spells: {
          Spells: 'Magias',
          Focus: 'Foco',
          Rituals: 'Rituais',
          'Impossible Spells': 'Impossíveis',
        },
      } as Record<string, Record<string, string>>,
      sources: {
        ancestries: 'Ancestralidades',
        archetypes: 'Arquétipos',
        backgrounds: 'Biografias',
        classes: 'Classes',
        companions: 'Companheiros',
      } as Record<string, string>,
    },
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
      /** O "other" do "Dexterity or Other" do ladino: a subclasse decide. */
      other: 'outro',
      /** As perícias a mais, à escolha: "+7". */
      moreSkills: (n: string) => `+${n}`,
    },
    /** A tela completa da entrada (22b): o botão que abre, o que volta, e as abas. */
    fullView: {
      open: 'Tela completa',
      back: 'Voltar à lista',
      locked: 'Filtro travado nesta entrada',
      /** O apêndice recolhido no fim do texto: o bloco de mecânica como o livro escreve. */
      appendix: {
        mechanics: 'Mecânicas',
      } as Record<string, string>,
      /** As sub-abas da lateral da aba de texto (26d): a classe. */
      /** Os rótulos dos trilhos de abas, para o leitor de tela das setas. */
      tabsLabel: 'Abas',
      sideTabsLabel: 'Abas da lateral',
      side: {
        details: 'Detalhes',
        progression: 'Progressão',
        proficiencies: 'Proficiências',
        spells: 'Magias',
      } as Record<string, string>,
      tabs: {
        details: 'Detalhes',
        heritages: 'Heranças',
        feats: 'Talentos',
        universal: 'Universais',
        features: 'Características',
        focus: 'Foco',
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
        med: 'Média',
        lg: 'Grande',
        huge: 'Enorme',
        grg: 'Imenso',
      } as Record<string, string>,
      vision: {
        normal: 'Normal',
        'low-light-vision': 'Penumbra',
        darkvision: 'Escuridão',
        /* A versátil: penumbra, e escuridão se a ancestralidade já tem penumbra. */
        'low-light-vision+darkvision': 'Penumbra (Escuridão se a ancestralidade já tiver Penumbra)',
      } as Record<string, string>,
      feet: (valor: string) => `${valor} pés`,
      /** O tipo do deslocamento que não é em terra, ao lado do valor: "25 pés nado". */
      speedType: {
        swim: 'nado',
        fly: 'voo',
        climb: 'escalada',
        burrow: 'escavação',
      } as Record<string, string>,
      /** Quantos idiomas adicionais — a regra da página, que o pack só tem como número. */
      extraLanguages: {
        int: 'tantos quanto o modificador de Inteligência (se positivo)',
        '1+int': '1 + o modificador de Inteligência (se positivo)',
      } as Record<string, string>,
      /** O Tipo da fonte de ancestralidade: as 50, e as 17 heranças versáteis. */
      kind: {
        ancestry: 'Ancestralidade',
        versatile: 'Herança versátil',
        /* Arquétipo: a seção do jornal. */
        general: 'Geral',
        multiclass: 'Multiclasse',
        class: 'De classe',
        mythic: 'Destino mítico',
        undead: 'Morto-vivo',
        artifact: 'Artefato',
      } as Record<string, string>,
      /** A categoria da característica, que é o Tipo da fonte de características. */
      category: {
        ancestryfeature: 'Ancestralidade',
        classfeature: 'Classe',
        calling: 'Chamado mítico',
      } as Record<string, string>,
      /** Os ranks de proficiência do Foundry, 0 a 4. */
      rank: ['Destreinado', 'Treinado', 'Especialista', 'Mestre', 'Lendário'],
      /** As chaves das proficiências, como o livro as chama. */
      proficiency: {
        fortitude: 'Fortitude',
        reflex: 'Reflexos',
        will: 'Vontade',
        simple: 'Simples',
        martial: 'Marciais',
        advanced: 'Avançadas',
        unarmed: 'Desarmado',
        unarmored: 'Sem armadura',
        light: 'Leve',
        medium: 'Média',
        heavy: 'Pesada',
      } as Record<string, string>,
      /** Conjura? O rank 1 é "sim, treinado"; 0 é "não". */
      spellcasting: { '0': 'Não', '1': 'Sim' } as Record<string, string>,
      extraSkills: (n: string) => `mais ${n} à escolha`,
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
      translatingProgress: (feitos: number, total: number) =>
        total === 0 ? 'Traduzindo…' : `Traduzindo… ${String(feitos)}/${String(total)}`,
      editTranslation: 'Editar a tradução',
      /** A central (Etapa 55): a compartilhada oferecida, e a etiqueta da forma. */
      useShared: 'Usar a compartilhada',
      useSharedTitle: (quem: string | null, usos: number) =>
        `Tradução compartilhada${quem === null ? '' : ` enviada por ${quem}`}, usada por ${String(usos)} ${usos === 1 ? 'pessoa' : 'pessoas'}. Grava no seu aparelho sem gastar a sua cota.`,
      /** "Traduzir ↻" (56, pelo autor): refaz com a sua chave, no lugar da compartilhada. */
      retranslate: '↻ Traduzir',
      retranslateTitle: 'Traduzir de novo com a sua chave — a sua fica no lugar da compartilhada',
      /** As candidatas (56): "‹ 2/3 ›", e o que passar faz. */
      candidates: (atual: number, total: number) => `${String(atual)}/${String(total)}`,
      candidatesTitle:
        'Outras traduções compartilhadas desta entrada — passar grava a escolhida e move o seu voto',
      candidatePrev: 'Candidata anterior',
      candidateNext: 'Próxima candidata',
      tag: { shared: 'compartilhada', manual: 'manual' } as Record<string, string>,
      toggleOriginal: 'Ver original',
      toggleTranslated: 'Ver tradução',
      /** O único aviso acima da tradução (Etapa 34; o "Tradução: forma" saiu na 48). */
      originalChanged: 'o original mudou desde a tradução',
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
       * "Círculo": é como a tradução da comunidade escreve `rank` de magia
       * (`PF2E.Item.Spell.Rank.Label`), e é o rótulo tanto da calha antes do nome quanto
       * do filtro. Era "ranque" até a Etapa 33.
       */
      rank: 'círculo',
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
      hpOptions: 'PV por tamanho',
      size: 'tamanho',
      sizes: 'tamanho',
      speed: 'deslocamento',
      swim: 'nado',
      speeds: 'deslocamento',
      flaws: 'falha',
      vision: 'visão',
      languages: 'idiomas',
      additionalLanguages: 'idiomas ad.',
      extraLanguages: 'idiomas qnt.',
      features: 'características',
      /* Habilidade: a ancestralidade dona. Só aparece com o Tipo Ancestralidade marcado. */
      owner: 'ancestralidade',
      /* Herança: a ancestralidade dona. */
      ancestry: 'de',
      /* Arquétipo. */
      dedication: 'dedicação',
      /* Classe. */
      keyAbility: 'atributo-chave',
      perception: 'percepção',
      saves: 'resistências',
      attacks: 'ataques',
      defenses: 'defesas',
      spellcasting: 'conjura',
      extraSkills: 'perícias extras',
      /* A linha única de perícias da classe (26g). */
      classSkills: 'perícias',
      classOwner: 'classe',
      'dedication.level': 'nível',
      class: 'classe',
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
    backgrounds: 'Biografia',
    archetypes: 'Arquétipo',
    classes: 'Classe',
    companions: 'Companheiro',
    familiars: 'Familiar',
    features: 'Características',
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
    /** Os SETORES das configurações (Etapa 30): sincronização e tradução. */
    sectors: {
      sync: 'Sincronização',
      translation: 'Tradução',
    } as Record<string, string>,
    translation: {
      display: {
        title: 'Preferência de visualização',
        description:
          'O que aparece quando a entrada já tem tradução. Sem tradução, é sempre o original — nada se traduz sem você pedir.',
        original: 'Original',
        translated: 'Traduzido',
      },
      names: {
        title: 'Nomes das entradas',
        description:
          'Na lista e nos títulos: o nome original, ou o nome traduzido do glossário da comunidade. O que o glossário não tem fica no original. A busca acha pelos dois nomes, seja qual for a escolha.',
        original: 'Original',
        translated: 'Traduzido',
      },
      language: {
        title: 'Língua de tradução',
        description: 'Cada língua guarda o próprio conjunto de traduções.',
        names: { 'pt-BR': 'Português (Brasil)' } as Record<string, string>,
      },
      /**
       * De onde uma tradução gravada veio, para o aviso acima do texto. `community` e
       * `local` já não traduzem (Etapa 42), mas o que gravaram continua legível.
       */
      methods: {
        manual: { name: 'Manual' },
        llm: { name: 'Gemini' },
        shared: { name: 'Compartilhada' },
        community: { name: 'Pacote da comunidade' },
        local: { name: 'Modelo local (antigo)' },
      } as Record<string, { name: string }>,
      /** O glossário da comunidade (Etapa 31): o que há gravado, e o botão. */
      community: {
        title: 'Glossário da comunidade',
        description:
          'A tradução do sistema para o Foundry feita pela comunidade, na língua escolhida: os nomes das entradas e os termos do jogo. É o que o tradutor usa como glossário e o que a tela usa para os nomes. Baixado junto com a base, na sincronização; aqui só se quiser atualizar antes.',
        loading: 'Conferindo o que há gravado…',
        absent: 'Ainda não baixado — vem com a próxima sincronização.',
        downloading: 'Baixando o glossário…',
        error: (mensagem: string) => `Não deu para baixar: ${mensagem}`,
        ready: (tag: string, tracos: number, nomes: number) =>
          `Versão ${tag}: ${String(tracos)} traços, ${String(nomes)} nomes de entradas.`,
        download: 'Baixar agora',
        downloadAgain: 'Atualizar',
      },
      /** O tradutor BYOK (Etapa 41): modelo, chave, teste. */
      llm: {
        title: 'Tradutor',
        description:
          'O Gemini traduz a prosa com o glossário no contexto, usando uma chave sua. Precisa de internet. O que você corrigir à mão nunca é sobrescrito.',
        model: 'Modelo',
        modelsLoading: 'buscando os modelos que a sua chave enxerga…',
        key: 'Chave de API',
        keyPlaceholder: 'Cole a chave do Google AI Studio',
        keyHint:
          'A chave é sua e fica só neste aparelho. Crie uma grátis em aistudio.google.com/apikey (nível gratuito, sem cartão).',
        save: 'Guardar',
        forget: 'Esquecer',
        test: 'Testar',
        testing: 'Testando…',
        checking: 'Conferindo…',
        noKey: 'Sem chave: cole a sua nas configurações para traduzir.',
        hasKey: 'Chave guardada.',
        testOk: (texto: string) => `Funciona: "${texto}"`,
        testFail: (porque: string) => `Não funcionou: ${porque}`,
      },
      /** A central de traduções (Etapa 55). */
      central: {
        title: 'Traduções compartilhadas',
        description:
          'Uma central onde as traduções de máquina de todo mundo se juntam: o que uma pessoa traduziu, as outras podem usar sem gastar cota. A sua tradução de máquina sobe sozinha ao terminar; a manual, só se você ligar. Nada de chave, nada de conta.',
        url: 'Endereço da central',
        urlPlaceholder: 'https://…workers.dev (vazio = sem central)',
        /** Quando o build traz a central do projeto (59): vazio é ela. */
        urlDefaultHint: 'Vazio usa a central do projeto. Preencha só para apontar para outra.',
        nickname: 'Apelido',
        nicknamePlaceholder: 'como você aparece para os outros (opcional)',
        autoAccept:
          'Usar as compartilhadas sem perguntar (o Traduzir procura na central antes do Gemini)',
        sendManual: 'Enviar também as minhas correções manuais',
        refresh: 'Atualizar',
        refreshing: 'Atualizando…',
        refreshed: (n: number) => `${String(n)} traduções oferecidas pela central.`,
        acceptAll: 'Aceitar todas',
        accepting: 'Aceitando…',
        accepted: (n: number) =>
          n === 0
            ? 'Nada novo para aceitar: você já tem tudo o que a central oferece.'
            : `${String(n)} traduções aceitas.`,
        failed: (porque: string) => `A central não respondeu: ${porque}`,
      },
      storage:
        'As traduções ficam gravadas por língua, fora da base: sobrevivem à sincronização e não são apagadas com ela.',
    },
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
