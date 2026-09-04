/**
 * Receita de `action` — 574 entradas no pack `actionspf2e`.
 *
 * Segunda receita do projeto. O briefing (3.3) a põe aqui por dois motivos: é simples, e é
 * alvo de 4.302 links `@UUID` — quase um sexto de todas as referências cruzadas da base.
 * Sem ela normalizada, o texto de qualquer talento quebra na tela.
 *
 * Decidida campo a campo com o autor em 27/08/2026, olhando o JSON real do `pf2e-8.4.1`.
 * Amostras: `Trip` (perícia, o caso simples), `Rage` (classe, com rules e selfEffect) e
 * `Intercession Spell` (reação, com frequência e SEM raridade).
 *
 * Lê DOIS packs: `actionspf2e` (574) e `adventure-specific-actions` (192 do tipo `action`,
 * mais 16 do tipo `feat` que o motor descarta por tipo). Total: 766.
 */

import { bool, html, int, nullable, shape, text, textList } from '../decoders';
import { from, fromSector } from '../field';
import { recipe } from '../recipe';

/** Com que frequência a ação pode ser usada. Só 140 das 574 declaram. */
export interface ActionFrequency {
  readonly max: number;
  /** `day`, `round`, `turn`, ou duração ISO — `PT1H`, `PT10M`, `PT1M`. Seis formatos. */
  readonly per: string;
}

export interface ActionBase {
  readonly name: string;
  readonly slug: string;

  /**
   * O par de custo, fiel ao dado. Medido nas 574, e a união é exata:
   *
   *   action + 1   219      free + null      48
   *   action + 2   108      reaction + null 105
   *   action + 3    20      passive + null   74
   *
   * `action` SEMPRE tem contagem; todo o resto é SEMPRE nulo. Quem combina os dois no
   * losango do artboard é a tela, não a receita.
   */
  readonly costKind: string;
  readonly costCount: number | null;

  /** `offensive` 290, `interaction` 187, `defensive` 75, nulo em 22. */
  readonly category: string | null;

  /**
   * A pasta RAIZ do compêndio: `Basic`, `Skill`, `Class`, `Archetype`, `Ancestry`,
   * `Background`, `Exploration`… mais `Adventure`, que não vem de pasta nenhuma.
   *
   * É a única coisa na base que separa as 30 ações básicas das 196 de classe — nenhum
   * traço marca uma ação como básica. Vem de `<pack>_folders.json`, que o briefing 7.2
   * manda ignorar como entidade; e não é entidade mesmo, é metadado.
   *
   * `Adventure` sai do PADRÃO, e a regra é medida: as 574 do pack principal TODAS têm a
   * chave `folder`, e as 192 do pack de aventura NENHUMA tem. Então chave ausente
   * identifica aventura sem ambiguidade. Qual aventura, quem diz é `source.title` — são
   * 41 livros distintos.
   *
   * Vazio quando a chave existe e aponta para uma pasta que não está no arquivo: acontece
   * com `Disengage`, e é defeito do dado do pf2e, não ausência de organização.
   */
  readonly sector: string;

  readonly traits: readonly string[];

  /**
   * Ausente em 275 das 574; das 299 que declaram, 298 são `common` e 1 é `rare`. O padrão
   * `common` é o mesmo do sistema, e a coluna só passa a distinguir alguma coisa em
   * talentos e itens (uncommon 3.577, rare 1.292).
   */
  readonly rarity: string;

  /** Ausente em 434 das 574, e nulo em 3 das que têm a chave. */
  readonly frequency: ActionFrequency | null;

  readonly source: {
    readonly license: string;
    readonly title: string;
    /** Briefing 8: importa tudo e filtra na interface. Aqui 491 Remaster, 83 legado. */
    readonly remaster: boolean;
  };
}

export interface ActionDesc {
  /**
   * HTML cru, nunca modificado. Contém `@UUID`, `[[/act ...]]` e `<strong>Frequency</strong>`
   * — a Etapa 7 transforma isso em texto legível com referência cruzada.
   */
  readonly main: string;
}

export const actionRecipe = recipe<ActionBase, ActionDesc>({
  type: 'action',
  packs: [
    { name: 'actionspf2e' },
    /*
     * Sem arquivo de pastas — medido: 208 documentos, nenhuma pasta. O carimbo é do pack,
     * e não um `withDefault` global: um terceiro pack sem pastas também viraria
     * "Adventure" por engano.
     */
    { name: 'adventure-specific-actions', sector: 'Adventure' },
  ],

  base: {
    name: from('name', text),
    slug: from('system.slug', text),
    costKind: from('system.actionType.value', text),
    costCount: from('system.actions.value', nullable(int)),
    category: from('system.category', nullable(text)),
    sector: fromSector(),
    traits: from('system.traits.value', textList),
    rarity: from('system.traits.rarity', text).withDefault('common'),
    frequency: from('system.frequency', nullable(shape({ max: int, per: text }))).withDefault(null),
    source: from('system.publication', shape({ license: text, title: text, remaster: bool })),
  },

  desc: {
    main: from('system.description.value', html),
  },

  ignore: {
    img: 'ícone do custo em ações; o zip não traz imagem, e o custo já vem de costKind/costCount',
    effects: 'active effects do VTT; vazio nas 574',
    'system._migration': 'controle interno de migração do Foundry',
    'system.frequency.value':
      'quantos usos restam AGORA; estado de ficha, não de consulta (5 das 766)',
    'system.traits.selected':
      'cache de interface do Foundry que vazou para o compêndio (8 das 574), e é lixo: ' +
      'contradiz traits.value em pelo menos três — Steel Your Resolve tem value vazio e ' +
      'selected com "general", Soaring Flight tem "transmutation" só no selected.',
    '_stats.coreVersion': 'versão do Foundry que gerou; já sabemos pela tag do release',
    '_stats.systemId': 'sempre "pf2e"; já sabemos pelo canal',
    '_stats.systemVersion': 'já sabemos pela tag do release',
  },

  defer: {
    'system.rules':
      'rule elements — 40 das 66 rotas do tipo moram aqui. Mecânica pura de VTT, ' +
      'essencial se a ficha aplicar regras. Continua em raw/.',
    'system.selfEffect':
      'o efeito que a ação aplica em quem a usa (45 das 574). Mecânica de ficha; ' +
      'a descrição já conta em texto o que ele faz.',
    'system.traits.otherTags':
      'etiquetas internas de agrupamento do sistema, como commander-expert-tactic ' +
      '(37 das 766). Vira útil se a ficha precisar agrupar táticas.',
    'system.description.gm':
      'texto que só o mestre deveria ver (1 das 766). Mostrá-lo sem distinguir quem está ' +
      'olhando entregaria DC e resposta ao jogador — decidir junto com a tela de detalhe.',
  },
});
