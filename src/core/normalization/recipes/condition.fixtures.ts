/**
 * As três amostras da Etapa 3, com a ESTRUTURA real do `pf2e-8.4.1`.
 *
 * Escolhidas porque juntas cobrem as três assinaturas de presença de campo que existem
 * nos 43 documentos:
 *
 *   Blinded     27 dos 43   sem active, removable, perpetual, text, immutable
 *   Off-Guard    9 dos 43   com active, removable, perpetual, text — sem immutable
 *   Cursebound   7 dos 43   com todos, inclusive immutable
 *
 * O texto da descrição está **encurtado de propósito**: é conteúdo da Paizo sob ORC, e o
 * decodificador `html` só precisa saber que é string. O fragmento `@UUID[...]` foi mantido
 * porque é a marcação que a Etapa 7 vai analisar. Todo o resto é o valor real.
 *
 * A verificação contra os 43 documentos de verdade fica no teste de contrato, que baixa o
 * release — ver `condition.contract.test.ts`.
 */

export const blinded = {
  _id: 'XgEqL1kFApUbl5Z2',
  img: 'systems/pf2e/icons/conditions/blinded.webp',
  name: 'Blinded',
  system: {
    description: {
      value:
        "<p>You can't see. […] Blinded overrides " +
        '@UUID[Compendium.pf2e.conditionitems.Item.TkIyaNPgTZFBCCuh]{Dazzled}.</p>',
    },
    duration: { expiry: null, unit: 'unlimited', value: 0 },
    group: 'senses',
    overrides: ['dazzled'],
    publication: { license: 'ORC', remaster: true, title: 'Pathfinder Player Core' },
    references: { children: [], immunityFrom: [], overriddenBy: [], overrides: [] },
    rules: [
      { key: 'FlatModifier', selector: 'perception', slug: 'blinded', type: 'status', value: -4 },
      { key: 'Immunity', type: 'visual' },
    ],
    traits: { value: [] },
    value: { isValued: false, value: null },
    slug: 'blinded',
    _migration: { version: 0.959, previous: null },
  },
  type: 'condition',
  _stats: {
    coreVersion: '14.361',
    systemId: 'pf2e',
    systemVersion: '8.4.1',
    compendiumSource: 'Compendium.pf2e.conditionitems.Item.XgEqL1kFApUbl5Z2',
  },
  effects: [],
};

export const offGuard = {
  _id: 'AJh5ex99aV6VTggg',
  img: 'systems/pf2e/icons/conditions/off-guard.webp',
  name: 'Off-Guard',
  system: {
    active: false,
    description: { value: "<p>You're distracted […] –2 circumstance penalty to AC.</p>" },
    duration: { expiry: null, perpetual: false, text: '', unit: 'unlimited', value: -1 },
    group: null,
    overrides: [],
    publication: { license: 'ORC', remaster: true, title: 'Pathfinder Player Core' },
    references: { children: [], immunityFrom: [], overriddenBy: [], overrides: [] },
    removable: false,
    rules: [
      { key: 'FlatModifier', selector: 'ac', slug: 'off-guard', type: 'circumstance', value: -2 },
    ],
    traits: { value: [] },
    value: { isValued: false, value: null },
    slug: 'off-guard',
    _migration: { version: 0.959, previous: null },
  },
  type: 'condition',
  _stats: {
    coreVersion: '14.361',
    systemId: 'pf2e',
    systemVersion: '8.4.1',
    compendiumSource: 'Compendium.pf2e.conditionitems.Item.AJh5ex99aV6VTggg',
  },
  effects: [],
};

export const cursebound = {
  _id: 'zXZjC8HLaRoLR17U',
  img: 'systems/pf2e/icons/conditions/cursebound.webp',
  name: 'Cursebound',
  system: {
    active: false,
    description: { value: '<p>Your oracular curse is constricting around you […]</p>' },
    duration: { expiry: null, perpetual: true, text: '', unit: 'unlimited', value: -1 },
    group: 'abilities',
    overrides: [],
    publication: { license: 'ORC', remaster: true, title: 'Pathfinder Player Core 2' },
    references: { children: [], immunityFrom: [], overriddenBy: [], overrides: [] },
    removable: false,
    rules: [],
    traits: { value: [] },
    value: { immutable: false, isValued: true, value: 1 },
    slug: 'cursebound',
    _migration: { version: 0.959, previous: null },
  },
  type: 'condition',
  _stats: {
    coreVersion: '14.361',
    systemId: 'pf2e',
    systemVersion: '8.4.1',
    compendiumSource: 'Compendium.pf2e.conditionitems.Item.zXZjC8HLaRoLR17U',
  },
  effects: [],
};

export const samples: readonly unknown[] = [blinded, offGuard, cursebound];

/** Trecho da tabela de idioma fundida, com o recorte que estas três amostras usam. */
export const languageSample = new Map<string, string>([
  ['PF2E.condition.blinded.summary', "You're unable to see."],
  ['PF2E.condition.off-guard.summary', "You're unable to defend yourself to your full capability."],
  // `cursebound` não tem entrada — é a razão de `summary` ser opcional.
]);
