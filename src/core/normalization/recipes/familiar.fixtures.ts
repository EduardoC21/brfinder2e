/**
 * Três amostras da Etapa 16, com a ESTRUTURA real do `pf2e-8.5.0`.
 *
 *   Versatile Form   passiva, SEM raridade declarada (52 dos 111), sem traço, sem pasta
 *   Stunning Flare   uma ação, com frequência (7 dos 111), três traços, e na pasta
 *   Mass-Produced    passiva, na pasta `Specific Familiary Abilities` (sic)
 *
 * O texto da descrição está encurtado de propósito — é conteúdo da Paizo sob ORC.
 */

const ESTATISTICAS = {
  coreVersion: '14.361',
  systemId: 'pf2e',
  systemVersion: '8.5.0',
  compendiumSource: 'Compendium.pf2e.familiar-abilities.Item.x',
};

const PASTA = 'yFyJygjqX4O4b35z';

const TIAN_XIA = {
  license: 'ORC',
  remaster: true,
  title: 'Pathfinder Lost Omens Tian Xia Character Guide',
};

export const versatileForm = {
  _id: '0rq3ufpxB9iHlIkd',
  img: 'systems/pf2e/icons/actions/Passive.webp',
  name: 'Versatile Form',
  system: {
    actionType: { value: 'passive' },
    actions: { value: null },
    category: 'familiar',
    description: { value: '<p>Your familiar can change shape […]</p>' },
    publication: TIAN_XIA,
    rules: [],
    traits: { value: [] },
    slug: 'versatile-form',
    _migration: { version: 0.959, previous: null },
  },
  type: 'action',
  _stats: ESTATISTICAS,
  effects: [],
};

export const stunningFlare = {
  _id: 'oOpppkBhLcfaKZN4',
  folder: PASTA,
  img: 'systems/pf2e/icons/actions/OneAction.webp',
  name: 'Stunning Flare',
  system: {
    actionType: { value: 'action' },
    actions: { value: 1 },
    category: 'familiar',
    description: { value: '<p>Your familiar emits a flash […]</p>' },
    frequency: { max: 1, per: 'PT10M' },
    publication: TIAN_XIA,
    rules: [],
    traits: { value: ['fire', 'light', 'magical'] },
    slug: 'stunning-flare',
    _migration: { version: 0.959, previous: null },
  },
  type: 'action',
  _stats: ESTATISTICAS,
  effects: [],
};

export const massProduced = {
  _id: '1fRkeUkPJFiBJ5u6',
  folder: PASTA,
  img: 'systems/pf2e/icons/actions/Passive.webp',
  name: 'Mass-Produced',
  system: {
    actionType: { value: 'passive' },
    actions: { value: null },
    category: 'familiar',
    description: { value: '<p>This familiar was made […]</p>' },
    publication: TIAN_XIA,
    rules: [],
    traits: { value: [] },
    slug: 'mass-produced',
    _migration: { version: 0.959, previous: null },
  },
  type: 'action',
  _stats: ESTATISTICAS,
  effects: [],
};

export const todas = [versatileForm, stunningFlare, massProduced];
