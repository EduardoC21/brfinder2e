/**
 * As cinco amostras da Etapa 9, com a ESTRUTURA real do `pf2e-8.5.0`.
 *
 * Escolhidas para cobrir o que varia, e cada uma paga por si:
 *
 *   Rupture Stomp     custo em ações (2), frequência por dia, maxTakable 2, pré-requisito
 *   Advanced Qi Spells  passivo, maxTakable NULO (sem limite), pré-requisito de um item
 *   Idyllkin          ancestralidade, onlyLevel1, sem pré-requisito, legado
 *   Become Thought    frequência P1Y — unidade que NÃO existe em ação nenhuma
 *   Vigilant Mask     raro, e traz a chave morta `system.rarity` dizendo "common"
 *
 * O texto da descrição está encurtado de propósito — é conteúdo da Paizo sob ORC/OGL, e o
 * decodificador `html` só precisa saber que é string. O fragmento `@UUID` foi mantido
 * porque é a marcação que a Etapa 7 analisa.
 */

/** IDs de pasta batendo com `folderRoots` abaixo. */
const PASTA_ARCHETYPE = 'Dgb6rENjNuP1n8qe';
const PASTA_CLASS_MONK = '5fWVGjsONPZTddWC';
const PASTA_CLASS_PSYCHIC = 'ov71zQAYExU0Lwg3';
const PASTA_ANCESTRY = 'mCO6gdJ68cnsdtlN';
const PASTA_ARCHETYPE_MASK = '8gLNFgtK68Xcm2pD';

export const ruptureStomp = {
  _id: 'vHKNJZPBxj66nJzZ',
  img: 'systems/pf2e/icons/actions/TwoActions.webp',
  name: 'Rupture Stomp',
  folder: PASTA_ARCHETYPE,
  system: {
    actionType: { value: 'action' },
    actions: { value: 2 },
    category: 'class',
    description: {
      value:
        '<p><strong>Frequency</strong> once per day</p>' +
        '<p><strong>Requirements</strong> You are in @UUID[Compendium.pf2e.feats-srd.Item.x] […]</p>',
    },
    frequency: { max: 1, per: 'day' },
    level: { value: 8 },
    maxTakable: 2,
    prerequisites: { value: [{ value: 'stalwart defender dedication' }] },
    publication: { license: 'OGL', remaster: false, title: 'Pathfinder Lost Omens Highhelm' },
    rules: [],
    slug: 'rupture-stomp',
    traits: { rarity: 'common', value: ['archetype'] },
    _migration: { version: 0.959, previous: null },
  },
  type: 'feat',
  _stats: {
    coreVersion: '14.361',
    systemId: 'pf2e',
    systemVersion: '8.5.0',
    compendiumSource: 'Compendium.pf2e.feats-srd.Item.vHKNJZPBxj66nJzZ',
  },
  effects: [],
};

export const advancedQiSpells = {
  _id: '10DbphslCihq8mxQ',
  img: 'systems/pf2e/icons/actions/Passive.webp',
  name: 'Advanced Qi Spells',
  folder: PASTA_CLASS_MONK,
  system: {
    actionType: { value: 'passive' },
    actions: { value: null },
    category: 'class',
    description: { value: '<p>You learn a more advanced qi spell. […]</p>' },
    level: { value: 6 },
    // Nulo, e não ausente: quer dizer SEM LIMITE.
    maxTakable: null,
    prerequisites: { value: [{ value: 'Qi Spells' }] },
    publication: { license: 'ORC', remaster: true, title: 'Pathfinder Player Core 2' },
    rules: [],
    slug: 'advanced-qi-spells',
    traits: { rarity: 'common', value: ['monk'] },
    _migration: { version: 0.959, previous: null },
  },
  type: 'feat',
  _stats: {
    coreVersion: '14.361',
    systemId: 'pf2e',
    systemVersion: '8.5.0',
    compendiumSource: 'Compendium.pf2e.feats-srd.Item.10DbphslCihq8mxQ',
  },
  effects: [],
};

export const idyllkin = {
  _id: '0bHLavDPj7KOAGEu',
  img: 'systems/pf2e/icons/actions/Passive.webp',
  name: 'Idyllkin',
  folder: PASTA_ANCESTRY,
  system: {
    actionType: { value: 'passive' },
    actions: { value: null },
    category: 'ancestry',
    description: { value: '<p>Your celestial ancestor was an agathion. […]</p>' },
    level: { value: 1 },
    onlyLevel1: true,
    prerequisites: { value: [] },
    publication: {
      license: 'OGL',
      remaster: false,
      title: 'Pathfinder Lost Omens Ancestry Guide',
    },
    rules: [],
    slug: 'idyllkin',
    subfeatures: { proficiencies: {}, senses: {}, suppressedFeatures: [] },
    traits: { rarity: 'common', value: ['lineage', 'nephilim'] },
    _migration: { version: 0.959, previous: null },
  },
  type: 'feat',
  _stats: {
    coreVersion: '14.361',
    systemId: 'pf2e',
    systemVersion: '8.5.0',
    compendiumSource: 'Compendium.pf2e.feats-srd.Item.0bHLavDPj7KOAGEu',
  },
  effects: [],
};

export const becomeThought = {
  _id: '5C0XMnfTuvgSKD7o',
  img: 'systems/pf2e/icons/actions/Passive.webp',
  name: 'Become Thought',
  folder: PASTA_CLASS_PSYCHIC,
  system: {
    actionType: { value: 'passive' },
    actions: { value: null },
    category: 'class',
    description: { value: '<p>Your mind transcends your body. […]</p>' },
    // Uma vez por ANO. Nenhuma ação da base tem unidade maior que o dia.
    frequency: { max: 1, per: 'P1Y' },
    level: { value: 20 },
    prerequisites: { value: [] },
    publication: {
      license: 'ORC',
      remaster: true,
      title: 'Pathfinder Dark Archive (Remastered)',
    },
    rules: [],
    slug: 'become-thought',
    traits: { rarity: 'common', value: ['psychic'] },
    _migration: { version: 0.959, previous: null },
  },
  type: 'feat',
  _stats: {
    coreVersion: '14.361',
    systemId: 'pf2e',
    systemVersion: '8.5.0',
    compendiumSource: 'Compendium.pf2e.feats-srd.Item.5C0XMnfTuvgSKD7o',
  },
  effects: [],
};

export const vigilantMask = {
  _id: '20Yax5lEqjftKBHZ',
  img: 'systems/pf2e/icons/actions/Passive.webp',
  name: 'Vigilant Mask',
  folder: PASTA_ARCHETYPE_MASK,
  system: {
    actionType: { value: 'passive' },
    actions: { value: null },
    category: 'class',
    description: { value: '<p>The mask grants you preternatural awareness. […]</p>' },
    level: { value: 20 },
    prerequisites: { value: [{ value: 'Druid Dedication or Wizard Dedication' }] },
    publication: {
      license: 'OGL',
      remaster: false,
      title: 'Pathfinder #174: Shadows of the Ancients',
    },
    // A chave MORTA, que contradiz `traits.rarity` logo abaixo. Uma das dez da base.
    rarity: { value: 'common' },
    rules: [],
    slug: 'vigilant-mask',
    subfeatures: { proficiencies: {}, senses: {}, suppressedFeatures: [] },
    traits: { rarity: 'rare', value: ['archetype', 'druid', 'wizard'] },
    _migration: { version: 0.959, previous: null },
  },
  type: 'feat',
  _stats: {
    coreVersion: '14.361',
    systemId: 'pf2e',
    systemVersion: '8.5.0',
    compendiumSource: 'Compendium.pf2e.feats-srd.Item.20Yax5lEqjftKBHZ',
  },
  effects: [],
};

/** As raízes de pasta das cinco, no formato que `parseFolderRoots` devolve. */
export const folderRoots = new Map<string, string>([
  [PASTA_ARCHETYPE, 'Archetype'],
  [PASTA_ARCHETYPE_MASK, 'Archetype'],
  [PASTA_CLASS_MONK, 'Class'],
  [PASTA_CLASS_PSYCHIC, 'Class'],
  [PASTA_ANCESTRY, 'Ancestry'],
]);

export const todas = [ruptureStomp, advancedQiSpells, idyllkin, becomeThought, vigilantMask];
