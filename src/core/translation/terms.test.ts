import { describe, expect, it } from 'vitest';

import { dictionaryPhrases, namePhrases, pairTerms, pickTerms } from './terms';

const en = new Map<string, string>([
  ['PF2E.ConditionTypeFrightened', 'Frightened'],
  ['PF2E.TraitDescriptionAgile', '<p>The multiple attack penalty…</p>'],
  ['PF2E.TraitAgile', 'Agile'],
  ['PF2E.SavesFortitude', 'Fortitude'],
  ['PF2E.SavesWill', 'Will'],
  ['PF2E.AbilityCha', 'Cha'],
  ['PF2E.WeaponGroupPolearm', 'Polearm'],
  ['PF2E.Item.Deity.Domain.Sun.Label', 'Sun'],
  ['PF2E.Item.Deity.Domain.Sun.Description', 'Prosa longa do domínio.'],
  ['PF2E.Skill.Label', 'Label'],
  ['PF2E.Cancel', 'Cancel'],
  ['PF2E.Duration.Long', '{count} rounds'],
]);

const pt = {
  'PF2E.ConditionTypeFrightened': 'Amedrontado',
  'PF2E.TraitAgile': 'Ágil',
  'PF2E.SavesFortitude': 'Fortitude',
  'PF2E.SavesWill': 'Vontade',
  'PF2E.AbilityCha': 'Car',
  'PF2E.WeaponGroupPolearm': 'Haste',
  'PF2E.Item.Deity.Domain.Sun.Label': 'Sol',
  'PF2E.Skill.Label': 'Rótulo',
};

describe('as famílias de termos', () => {
  it('pega só as famílias de vocabulário, sem prosa, interface ou interpolação', () => {
    expect(Object.keys(pickTerms(en))).toEqual([
      'PF2E.ConditionTypeFrightened',
      'PF2E.TraitAgile',
      'PF2E.SavesFortitude',
      'PF2E.SavesWill',
      'PF2E.AbilityCha',
      'PF2E.WeaponGroupPolearm',
      'PF2E.Item.Deity.Domain.Sun.Label',
      'PF2E.Skill.Label',
    ]);
  });

  it('emparelha pela chave; iguais, rótulos genéricos e curtos sem caixa exata saem', () => {
    const frases = pairTerms(pickTerms(en), pt);
    expect(frases).toEqual([
      { en: 'Frightened', pt: 'Amedrontado', exact: true },
      { en: 'Agile', pt: 'Ágil', exact: true },
      { en: 'Will', pt: 'Vontade', exact: false },
      { en: 'Polearm', pt: 'Haste', exact: false },
      { en: 'Sun', pt: 'Sol', exact: true },
    ]);
    /* "Fortitude" é igual dos dois lados; "Label" é rótulo; "Cha" é curto e não é nome. */
  });

  it('uma chave por termo em qualquer caixa — a blindagem faz uma passada só', () => {
    const frases = pairTerms(
      { 'PF2E.TraitFire': 'Fire', 'PF2E.Damage.RollFlavor.fire': 'fire' },
      { 'PF2E.TraitFire': 'Fogo', 'PF2E.Damage.RollFlavor.fire': 'fogo' },
    );
    expect(frases).toHaveLength(1);
  });

  it('o dicionário vira frases sem caixa; os nomes de condição e ação, frases exatas', () => {
    expect(
      dictionaryPhrases({ range: { touch: 'toque', '30 feet': '9 metros', ok: 'ok' } }),
    ).toEqual([
      { en: 'touch', pt: 'toque' },
      { en: '30 feet', pt: '9 metros' },
    ]);
    expect(
      namePhrases({
        condition: { Frightened: 'Amedrontado', Dying: 'Dying' },
        action: { Stride: 'Passada', 'Reactive Strike': 'Golpe Reativo' },
        feat: { 'Power Attack': 'Ataque Poderoso' },
        feature: { 'Reactive Strike': 'Golpe Reativo', Battle: 'Mistério de Batalha' },
        class: { Fighter: 'Guerreiro' },
      }),
    ).toEqual([
      { en: 'Frightened', pt: 'Amedrontado', exact: true },
      { en: 'Stride', pt: 'Passada', exact: true },
      { en: 'Reactive Strike', pt: 'Golpe Reativo', exact: false },
      { en: 'Reactive Strike', pt: 'Golpe Reativo' },
      { en: 'Fighter feat', pt: 'talento de Guerreiro' },
    ]);
  });
});
