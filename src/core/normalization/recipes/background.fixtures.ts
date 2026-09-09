/**
 * As cinco amostras da Etapa 14, com a ESTRUTURA real do `pf2e-8.5.0`.
 *
 * Escolhidas porque cada uma quebra o padrão de um jeito diferente:
 *
 *   Acrobat              o caso normal: uma perícia, um Saber, um talento, dois aumentos
 *   Amnesiac             SEM nada — sem perícia, sem Saber, sem talento, e o aumento LIVRE
 *                        (os seis atributos, que a receita traduz para lista vazia)
 *   Crown of Chaos       aumento de UM atributo só, e `rules` não vazio
 *   Hermean Heritor      DOIS talentos concedidos — 2 dos 520 são assim
 *   Wandering Libertine  o único com traço: `persona-flirt`, do Battlecry!
 *
 * O texto da descrição está encurtado de propósito — é conteúdo da Paizo sob ORC/OGL, e o
 * decodificador `html` só precisa saber que é string.
 */

const ESTATISTICAS = {
  coreVersion: '14.361',
  systemId: 'pf2e',
  systemVersion: '8.5.0',
  compendiumSource: 'Compendium.pf2e.backgrounds.Item.x',
};

/** Os seis, como a fonte os escreve. O aumento LIVRE é exatamente esta lista. */
const LIVRE = ['cha', 'con', 'dex', 'int', 'str', 'wis'];

const COMUM = {
  _migration: { version: 0.959, previous: null },
  rules: [],
};

export const acrobat = {
  _id: 'IFHYbU6Nu8BiTsRa',
  name: 'Acrobat',
  img: 'systems/pf2e/icons/default-icons/background.svg',
  system: {
    ...COMUM,
    boosts: { 0: { value: ['dex', 'str'] }, 1: { value: LIVRE } },
    description: { value: '<p>In a circus or on the streets […]</p>' },
    items: {
      c4lrh: {
        img: 'icons/sundries/books/book-red-exclamation.webp',
        level: 1,
        name: 'Steady Balance',
        uuid: 'Compendium.pf2e.feats-srd.Item.CnqMJR8e9jqJR7MM',
      },
    },
    publication: { license: 'ORC', remaster: true, title: 'Pathfinder Player Core' },
    trainedSkills: { lore: ['Circus Lore'], value: ['acrobatics'] },
    traits: { rarity: 'common', value: [] },
    slug: 'acrobat',
  },
  type: 'background',
  _stats: ESTATISTICAS,
  effects: [],
};

/** O vazio de propósito: nada de mecânica, e o aumento livre nas TRÊS chaves. */
export const amnesiac = {
  _id: '0ZfBP7Tp2P3WN7Dp',
  name: 'Amnesiac',
  img: 'systems/pf2e/icons/default-icons/background.svg',
  system: {
    ...COMUM,
    boosts: { 0: { value: LIVRE }, 1: { value: LIVRE }, 2: { selected: null, value: LIVRE } },
    description: { value: '<p>You woke up with no memory […]</p>' },
    items: {},
    publication: { license: 'ORC', remaster: true, title: 'Pathfinder Player Core 2' },
    trainedSkills: { lore: [], value: [] },
    traits: { rarity: 'rare', value: [] },
    slug: 'amnesiac',
  },
  type: 'background',
  _stats: ESTATISTICAS,
  effects: [],
};

/** Aumento de UM atributo só, e com pasta e `rules` — os dois ignorados/adiados. */
export const crownOfChaos = {
  _id: 'bdeuzUMiPjEdlPS8',
  folder: 'aMvKjUALuWvAzSL8',
  name: 'Crown of Chaos',
  img: 'systems/pf2e/icons/default-icons/background.svg',
  system: {
    _migration: { version: 0.959, previous: null },
    boosts: { 0: { value: ['cha'] }, 1: { value: LIVRE } },
    description: { value: '<p>The cards chose you […]</p>' },
    items: {
      XZn29: {
        img: 'icons/sundries/books/book-red-exclamation.webp',
        level: 1,
        name: 'Charming Liar',
        uuid: 'Compendium.pf2e.feats-srd.Item.B6HbYsLBWb1RR6Fx',
      },
    },
    publication: {
      license: 'OGL',
      remaster: false,
      title: "Pathfinder Stolen Fate Player's Guide",
    },
    rules: [{ key: 'GrantItem', uuid: 'Compendium.pf2e.actionspf2e.Item.YjrM5G8Up0wv6x0u' }],
    trainedSkills: { custom: '', lore: [], value: [] },
    traits: { rarity: 'rare', value: [] },
    slug: 'crown-of-chaos',
  },
  type: 'background',
  _stats: ESTATISTICAS,
  effects: [],
};

/** DOIS talentos concedidos. São 2 em 520, e a lista existe por causa deles. */
export const hermeanHeritor = {
  _id: 'HermeanHeritor00',
  name: 'Hermean Heritor',
  img: 'systems/pf2e/icons/default-icons/background.svg',
  system: {
    ...COMUM,
    boosts: { 0: { value: ['int', 'wis'] }, 1: { value: LIVRE } },
    description: { value: '<p>You were raised on Hermea […]</p>' },
    items: {
      o318c: {
        img: 'icons/sundries/books/book-red-exclamation.webp',
        level: 1,
        name: 'Multilingual',
        uuid: 'Compendium.pf2e.feats-srd.Item.P9HCz0uR6xPHuw72',
      },
      x6866: {
        img: 'icons/sundries/books/book-red-exclamation.webp',
        level: 1,
        name: 'Assurance',
        uuid: 'Compendium.pf2e.feats-srd.Item.W6Gl9ePmItfDHji0',
      },
    },
    publication: { license: 'OGL', remaster: false, title: 'Pathfinder Lost Omens World Guide' },
    trainedSkills: { lore: ['Hermea Lore'], value: ['society'] },
    traits: { rarity: 'uncommon', value: [] },
    slug: 'hermean-heritor',
  },
  type: 'background',
  _stats: ESTATISTICAS,
  effects: [],
};

/** O único tipo com traço: `persona-*`, do Battlecry!. São 8 em 520. */
export const wanderingLibertine = {
  _id: 'WanderingLiber00',
  name: 'Wandering Libertine',
  img: 'systems/pf2e/icons/default-icons/background.svg',
  system: {
    ...COMUM,
    boosts: { 0: { value: ['cha', 'dex'] }, 1: { value: LIVRE } },
    description: { value: '<p>You never stay long […]</p>' },
    items: {},
    publication: { license: 'ORC', remaster: true, title: 'Pathfinder Battlecry!' },
    trainedSkills: { lore: ['Gossip Lore'], value: ['deception'] },
    traits: { rarity: 'rare', value: ['persona-flirt'] },
    slug: 'wandering-libertine',
  },
  type: 'background',
  _stats: ESTATISTICAS,
  effects: [],
};

export const todos = [acrobat, amnesiac, crownOfChaos, hermeanHeritor, wanderingLibertine];
