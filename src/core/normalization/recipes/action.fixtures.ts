/**
 * As três amostras da Etapa 6, com a ESTRUTURA real do `pf2e-8.4.1`.
 *
 * Escolhidas para cobrir o que varia:
 *
 *   Trip                perícia, custo 1 ação, com raridade, sem frequência, rules vazio
 *   Rage                classe, com rules e selfEffect, livro diferente
 *   Intercession Spell  reação (contagem nula), COM frequência e SEM raridade
 *
 * O texto da descrição está encurtado de propósito — é conteúdo da Paizo sob ORC, e o
 * decodificador `html` só precisa saber que é string. Os fragmentos `@UUID` e `[[/act`
 * foram mantidos porque são a marcação que a Etapa 7 vai analisar.
 */

/** IDs de pasta batendo com `folderRoots` abaixo. */
const PASTA_SKILL = 'HHmuIkOOgQ4d4c1c';
const PASTA_BARBARIAN = 'ZjYQvLDGKrPTGWtM';
const PASTA_GODLING = 'gJ2CcCbY6ceFPPUY';

export const trip = {
  _id: 'ge56Lu1xXVFYUnLP',
  img: 'systems/pf2e/icons/actions/OneAction.webp',
  name: 'Trip',
  folder: PASTA_SKILL,
  system: {
    actionType: { value: 'action' },
    actions: { value: 1 },
    category: 'offensive',
    description: {
      value:
        '<p><strong>Requirements</strong> You have at least one hand free.</p><hr />' +
        '<p>You try to knock a creature to the ground. Attempt an [[/act trip]] […]</p>',
    },
    publication: { license: 'ORC', remaster: true, title: 'Pathfinder Player Core' },
    rules: [],
    traits: { rarity: 'common', value: ['attack'] },
    slug: 'trip',
    _migration: { version: 0.959, previous: null },
  },
  type: 'action',
  _stats: {
    coreVersion: '14.361',
    systemId: 'pf2e',
    systemVersion: '8.4.1',
    compendiumSource: 'Compendium.pf2e.actionspf2e.Item.ge56Lu1xXVFYUnLP',
  },
  effects: [],
};

export const rage = {
  _id: 'Ah5g9pDwWF9b9VW9',
  img: 'systems/pf2e/icons/actions/OneAction.webp',
  name: 'Rage',
  folder: PASTA_BARBARIAN,
  system: {
    actionType: { value: 'action' },
    actions: { value: 1 },
    category: 'offensive',
    description: {
      value:
        "<p><strong>Requirements</strong> You aren't " +
        '@UUID[Compendium.pf2e.conditionitems.Item.HL2l2VRSaQHu9lUw]{Fatigued} or raging.</p>',
    },
    publication: { license: 'ORC', remaster: true, title: 'Pathfinder Player Core 2' },
    rules: [
      { key: 'FlatModifier', selector: 'strike-damage', slug: 'rage', value: 2 },
      {
        key: 'AdjustModifier',
        mode: 'multiply',
        priority: 95,
        selector: 'strike-damage',
        value: 0.5,
      },
    ],
    selfEffect: {
      name: 'Effect: Rage',
      uuid: 'Compendium.pf2e.feat-effects.Item.z3uyCMBddrPK5umr',
    },
    traits: { rarity: 'common', value: ['barbarian', 'concentrate', 'emotion', 'mental'] },
    slug: 'rage',
    _migration: { version: 0.959, previous: null },
  },
  type: 'action',
  _stats: {
    coreVersion: '14.361',
    systemId: 'pf2e',
    systemVersion: '8.4.1',
    compendiumSource: 'Compendium.pf2e.actionspf2e.Item.Ah5g9pDwWF9b9VW9',
  },
  effects: [],
};

export const intercessionSpell = {
  _id: '0MZ5tFUYKGMq21NV',
  img: 'systems/pf2e/icons/actions/Reaction.webp',
  name: 'Intercession Spell',
  folder: PASTA_GODLING,
  system: {
    actionType: { value: 'reaction' },
    actions: { value: null },
    category: 'defensive',
    description: {
      value:
        '<p><strong>Frequency</strong> once per day</p>\n' +
        '<p><strong>Trigger</strong> Your hierophant Casts a Spell</p><hr /><p>[…]</p>',
    },
    frequency: { max: 1, per: 'day', value: 1 },
    publication: { license: 'ORC', remaster: true, title: 'Pathfinder War of Immortals' },
    rules: [],
    // SEM `rarity` — 275 das 574 não declaram.
    traits: { value: ['concentrate', 'divine', 'spellshape'] },
    slug: 'intercession-spell',
    _migration: { version: 0.959, previous: null },
  },
  type: 'action',
  _stats: {
    coreVersion: '14.361',
    systemId: 'pf2e',
    systemVersion: '8.4.1',
    compendiumSource: 'Compendium.pf2e.actionspf2e.Item.0MZ5tFUYKGMq21NV',
  },
  effects: [],
};

/**
 * Do pack `adventure-specific-actions`: NENHUMA das 192 tem a chave `folder`, e é isso
 * que as identifica como de aventura. Qual aventura, quem diz é `source.title`.
 */
export const playTheFool = {
  _id: 'yFDPQJcOKVe7hqpJ',
  img: 'systems/pf2e/icons/actions/OneAction.webp',
  name: 'Play the Fool',
  // sem `folder` — de propósito
  system: {
    actionType: { value: 'action' },
    actions: { value: 1 },
    category: 'interaction',
    description: { value: '<p>You play the fool to catch a foe off guard. […]</p>' },
    publication: { license: 'OGL', remaster: false, title: 'Pathfinder Dark Archive' },
    rules: [],
    traits: { value: ['manipulate'] },
    slug: 'play-the-fool',
    _migration: { version: 0.959, previous: null },
  },
  type: 'action',
  _stats: {
    coreVersion: '14.361',
    systemId: 'pf2e',
    systemVersion: '8.4.1',
    compendiumSource: 'Compendium.pf2e.adventure-specific-actions.Item.yFDPQJcOKVe7hqpJ',
  },
  effects: [],
};

export const samples: readonly unknown[] = [trip, rage, intercessionSpell, playTheFool];

/** ID de pasta -> nome da pasta RAIZ, como `parseFolderRoots` produz. */
export const folderRoots: ReadonlyMap<string, string> = new Map([
  [PASTA_SKILL, 'Skill'],
  [PASTA_BARBARIAN, 'Class'],
  [PASTA_GODLING, 'Archetype'],
]);
