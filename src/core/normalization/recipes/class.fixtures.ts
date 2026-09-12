/**
 * Uma amostra da Etapa 26 com a ESTRUTURA real do `pf2e-8.5.0`: o Druid, que conjura,
 * tem uma perícia fixa e duas a mais, e 17 habilidades por nível.
 *
 * O texto está encurtado de propósito — é conteúdo da Paizo sob ORC.
 */

const ESTATISTICAS = {
  coreVersion: '14.361',
  systemId: 'pf2e',
  systemVersion: '8.5.0',
  compendiumSource: 'Compendium.pf2e.classes.Item.x',
};

export const druid = {
  _id: 'DruidDruidDruid01',
  img: 'systems/pf2e/icons/classes/druid.webp',
  name: 'Druid',
  system: {
    ancestryFeatLevels: { value: [1, 5, 9, 13, 17] },
    attacks: { advanced: 0, martial: 0, other: { name: '', rank: 0 }, simple: 1, unarmed: 1 },
    classFeatLevels: { value: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20] },
    defenses: { heavy: 0, light: 1, medium: 1, unarmored: 1 },
    description: { value: '<p>The power of nature is impossible to resist […]</p>' },
    generalFeatLevels: { value: [3, 7, 11, 15, 19] },
    hp: 8,
    items: {
      a1: {
        img: 'x',
        level: 1,
        name: 'Druidic Order',
        uuid: 'Compendium.pf2e.classfeatures.Item.aaaaaaaaaaaaaaaa',
      },
      a2: {
        img: 'x',
        level: 3,
        name: 'Fortitude Expertise',
        uuid: 'Compendium.pf2e.classfeatures.Item.bbbbbbbbbbbbbbbb',
      },
      a3: {
        img: 'x',
        level: 1,
        name: 'Druid Spellcasting',
        uuid: 'Compendium.pf2e.classfeatures.Item.cccccccccccccccc',
      },
    },
    keyAbility: { value: ['wis'] },
    perception: 1,
    publication: { license: 'ORC', remaster: true, title: 'Pathfinder Player Core' },
    rules: [],
    savingThrows: { fortitude: 1, reflex: 1, will: 2 },
    skillFeatLevels: { value: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20] },
    skillIncreaseLevels: { value: [3, 5, 7, 9, 11, 13, 15, 17, 19] },
    spellcasting: 1,
    trainedSkills: { additional: 2, value: ['nature'] },
    traits: { rarity: 'common', value: [] },
    slug: 'druid',
    _migration: { version: 0.959, previous: null },
  },
  type: 'class',
  _stats: ESTATISTICAS,
  effects: [],
};

/** Uma habilidade com o traço da classe que abre outro atributo-chave (o Ruffian do ladino). */
export const racket = {
  _id: 'rrrrrrrrrrrrrrrr',
  name: 'Wild Ruffian',
  type: 'feat',
  system: {
    traits: { rarity: 'common', value: ['druid'] },
    subfeatures: { keyOptions: ['str'], proficiencies: {}, languages: {}, suppressedFeatures: [] },
  },
};

/** A habilidade que ESCOLHE (a Druidic Order, `a1` do druida) e uma ordem que treina perícia. */
export const escolha = {
  _id: 'aaaaaaaaaaaaaaaa',
  name: 'Druidic Order',
  type: 'feat',
  system: {
    traits: { rarity: 'common', value: ['druid'] },
    rules: [{ key: 'ChoiceSet', choices: { filter: ['item:tag:druid-order'] }, flag: 'order' }],
  },
};

export const ordem = {
  _id: 'oooooooooooooooo',
  name: 'Storm Order',
  type: 'feat',
  system: {
    traits: { rarity: 'common', value: ['druid'], otherTags: ['druid-order'] },
    rules: [
      { key: 'ActiveEffectLike', mode: 'upgrade', path: 'system.skills.acrobatics.rank', value: 1 },
    ],
  },
};

export const jornal = {
  _id: 'ClassesJournal001',
  name: 'Classes',
  pages: [
    {
      _id: 'p1',
      name: 'Druid',
      title: { level: 1 },
      sort: 100000,
      text: {
        content:
          '<h1>Roleplaying the Druid</h1><p>…</p><h1>Class Features</h1><p>…</p>' +
          '<table><thead><tr><th>Your Level</th><th>Class Features</th></tr></thead>' +
          '<tbody><tr><td>1</td><td>Ancestry and background, @UUID[Compendium.pf2e.classfeatures.Item.aaaaaaaaaaaaaaaa]{Druidic Order}</td></tr></tbody></table>' +
          '<table><thead><tr><th>Your Level</th><th>Cantrips</th><th>1st</th></tr></thead>' +
          '<tbody><tr><td>1</td><td>5</td><td>2</td></tr></tbody></table>',
      },
    },
  ],
};
