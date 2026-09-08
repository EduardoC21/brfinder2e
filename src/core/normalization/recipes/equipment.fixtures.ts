/**
 * As seis amostras da Etapa 12, com a ESTRUTURA real do `pf2e-8.5.0`.
 *
 * Escolhidas para cobrir os tipos que se comportam DIFERENTE, e cada uma paga por si:
 *
 *   Longsword                arma: dano em dados separados, categoria e grupo
 *   Full Plate               armadura: os cinco números, e `dexCap` ZERO (não nulo)
 *   Helmsman's Recourse      escudo: dureza e PV de verdade, e `speedPenalty` zero
 *   Tin Cobra                consumível: dano em FÓRMULA, a segunda forma do campo
 *   Magekiller Bullet        munição: tem PASTA (família) e `price.per`
 *   Backpack                 mochila: sem preço em ouro, `usage` próprio, sem nível
 *
 * O texto da descrição está encurtado de propósito — é conteúdo da Paizo sob ORC/OGL, e o
 * decodificador `html` só precisa saber que é string.
 */

const PASTA_MUNICAO = 'vHl8hDRb6hXd7O4r';

const ESTATISTICAS = {
  coreVersion: '14.361',
  systemId: 'pf2e',
  systemVersion: '8.5.0',
  compendiumSource: 'Compendium.pf2e.equipment.Item.x',
};

const COMUM = {
  baseItem: null,
  containerId: null,
  material: { grade: null, type: null },
  quantity: 1,
  rules: [],
  size: 'med',
  equipped: { carryType: 'worn' },
  _migration: { version: 0.959, previous: null },
};

export const longsword = {
  _id: 'LJdbVTOZog39EEbi',
  name: 'Longsword',
  img: 'systems/pf2e/icons/equipment/longsword.webp',
  system: {
    ...COMUM,
    ammo: null,
    bonus: { value: 0 },
    bonusDamage: { value: 0 },
    bulk: { value: 1 },
    category: 'martial',
    damage: { damageType: 'slashing', dice: 1, die: 'd8' },
    description: { value: '<p>This sword has a straight blade. […]</p>' },
    expend: null,
    grade: null,
    group: 'sword',
    hardness: 0,
    hp: { max: 0, value: 0 },
    level: { value: 0 },
    price: { value: { gp: 1 } },
    publication: { license: 'ORC', remaster: true, title: 'Pathfinder Player Core' },
    range: null,
    reload: { value: null },
    runes: { potency: 0, property: [], striking: 0 },
    slug: 'longsword',
    splashDamage: { value: 0 },
    traits: { rarity: 'common', value: ['versatile-p'] },
    usage: { canBeAmmo: false, value: 'held-in-one-hand' },
  },
  type: 'weapon',
  _stats: ESTATISTICAS,
  effects: [],
};

export const fullPlate = {
  _id: 'Gq1cZWSKOtJhKd2p',
  name: 'Full Plate',
  img: 'systems/pf2e/icons/equipment/full-plate.webp',
  system: {
    ...COMUM,
    baseItem: 'full-plate',
    acBonus: 6,
    bulk: { value: 4 },
    category: 'heavy',
    checkPenalty: -3,
    description: { value: '<p>The tried and true suit of armor. […]</p>' },
    // ZERO, e não nulo: a armadura pesada limita a Destreza a +0.
    dexCap: 0,
    grade: null,
    group: 'plate',
    hardness: 0,
    hp: { max: 0, value: 0 },
    level: { value: 2 },
    price: { value: { gp: 30 } },
    publication: { license: 'ORC', remaster: true, title: 'Pathfinder Player Core' },
    runes: { potency: 0, property: [], resilient: 0 },
    slug: 'full-plate',
    speedPenalty: -10,
    strength: 4,
    traits: { rarity: 'common', value: ['bulwark'] },
  },
  type: 'armor',
  _stats: ESTATISTICAS,
  effects: [],
};

export const helmsmansRecourse = {
  _id: '19T3MHwhB6Wk4AjV',
  name: "Helmsman's Recourse (Greater)",
  img: 'systems/pf2e/icons/equipment/meteor-shield.webp',
  system: {
    ...COMUM,
    baseItem: 'meteor-shield',
    acBonus: 2,
    bulk: { value: 1 },
    description: { value: '<p>This shield helps you steer a vessel. […]</p>' },
    grade: null,
    // Dureza e PV de VERDADE: só os 126 escudos têm.
    hardness: 8,
    hp: { max: 60, value: 60 },
    level: { value: 7 },
    material: { grade: 'standard', type: 'duskwood' },
    price: { value: { gp: 625 } },
    publication: {
      license: 'ORC',
      remaster: true,
      title: 'Pathfinder Treasure Vault (Remastered)',
    },
    runes: { reinforcing: 0 },
    slug: 'helmsmans-recourse-greater',
    specific: { integrated: null, material: { grade: 'standard', type: 'duskwood' }, runes: {} },
    speedPenalty: 0,
    traits: { integrated: null, rarity: 'common', value: ['magical', 'shield-throw-30'] },
  },
  type: 'shield',
  _stats: ESTATISTICAS,
  effects: [],
};

export const tinCobra = {
  _id: '0XUENeLPEG73uiP7',
  name: 'Tin Cobra',
  img: 'systems/pf2e/icons/equipment/tin-cobra.webp',
  system: {
    ...COMUM,
    bulk: { value: 0 },
    category: 'snare',
    // A SEGUNDA forma do dano: fórmula pronta, e não dados separados.
    damage: { formula: '3d6', kind: 'damage', type: 'poison' },
    description: { value: '<p>This clockwork snake strikes when triggered. […]</p>' },
    hardness: 0,
    hp: { max: 0, value: 0 },
    level: { value: 5 },
    price: { value: { gp: 23 } },
    publication: { license: 'ORC', remaster: true, title: 'Pathfinder Guns & Gears' },
    slug: 'tin-cobra',
    traits: {
      rarity: 'uncommon',
      value: ['clockwork', 'consumable', 'mechanical', 'poison', 'snare', 'trap'],
    },
    usage: { value: 'held-in-one-hand' },
    uses: { autoDestroy: true, max: 1, value: 1 },
  },
  type: 'consumable',
  _stats: ESTATISTICAS,
  effects: [],
};

export const magekillerBullet = {
  _id: '0Wu0vvURh6FefRyV',
  folder: PASTA_MUNICAO,
  name: 'Magekiller Bullet',
  img: 'systems/pf2e/icons/equipment/magekiller-bullet.webp',
  system: {
    ...COMUM,
    bulk: { value: 0.1 },
    craftableAs: ['rounds', 'sling-bullets'],
    description: { value: '<p>This bullet is etched with anti-magic sigils. […]</p>' },
    hardness: 0,
    hp: { max: 0, value: 0 },
    level: { value: 16 },
    price: { per: 1, value: { gp: 1500 } },
    publication: { license: 'ORC', remaster: true, title: 'Pathfinder Impossible Magic' },
    slug: 'magekiller-bullet',
    traits: { rarity: 'uncommon', value: ['consumable', 'curse', 'force', 'magical'] },
    uses: { autoDestroy: true, max: 1, value: 1 },
  },
  type: 'ammo',
  _stats: ESTATISTICAS,
  effects: [],
};

export const backpack = {
  _id: '3lgwjrFEsQVKzhh7',
  name: 'Backpack',
  img: 'systems/pf2e/icons/equipment/backpack.webp',
  system: {
    ...COMUM,
    bulk: { capacity: 4, heldOrStowed: 0.1, ignored: 2, value: 0 },
    collapsed: false,
    description: { value: '<p>A backpack holds items. […]</p>' },
    hardness: 0,
    hp: { max: 0, value: 0 },
    level: { value: 0 },
    // Preço em PRATA: a conta do cobre tem de dar 10, e não 100.
    price: { value: { sp: 1 } },
    publication: { license: 'ORC', remaster: true, title: 'Pathfinder Player Core' },
    slug: 'backpack',
    stowing: true,
    traits: { rarity: 'common', value: [] },
    usage: { value: 'wornbackpack' },
  },
  type: 'backpack',
  _stats: ESTATISTICAS,
  effects: [],
};

/** A raiz de pasta da munição, no formato que `parseFolderRoots` devolve. */
export const folderRoots = new Map<string, string>([[PASTA_MUNICAO, 'Magic Ammunition']]);

export const todas = [
  longsword,
  fullPlate,
  helmsmansRecourse,
  tinCobra,
  magekillerBullet,
  backpack,
];
