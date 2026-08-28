import { describe, expect, it } from 'vitest';

import { checkLabel, damageLabel, rollLabel, templateLabel } from './label';

/*
 * Os casos vêm da base real (json-assets-pf2e-8.4.1), não de exemplos inventados.
 *
 * O grupo mais importante é o primeiro de cada bloco: a palavra substantiva NÃO entra,
 * porque ela já está no texto ao redor em 77,1% dos `@Damage` e em metade dos `@Check`.
 */

describe('checkLabel', () => {
  it('a CD literal entra na frente', () => {
    expect(checkLabel('flat|showDC:all|dc:15')).toBe('DC 15 flat check');
  });

  it('o flat check é a ÚNICA marcação que ganha a palavra, e minúscula', () => {
    // 1.163 flat checks, e só 120 (10,3%) são seguidos de "check" no texto. Sem
    // acrescentar, sai "succeed at a DC 5 flat or it is lost".
    expect(checkLabel('flat|dc:5')).toBe('DC 5 flat check');
  });

  it('o salvamento NÃO ganha a palavra: o texto já traz "save" em 8.577 casos', () => {
    expect(checkLabel('reflex|against:class-spell|basic')).toBe('basic Reflex');
    expect(checkLabel('fortitude')).toBe('Fortitude');
  });

  it('a perícia é nome próprio e fica com maiúscula', () => {
    expect(checkLabel('athletics|dc:15')).toBe('DC 15 Athletics');
    expect(checkLabel('scouting-lore|dc:20')).toBe('DC 20 Scouting Lore');
  });

  it('a CD por variável fica de fora, porque só o Foundry a resolve', () => {
    expect(checkLabel('perception|dc:{societyDC}|traits:secret')).toBe('Perception');
  });
});

describe('damageLabel', () => {
  it('NÃO acrescenta "damage": a palavra já vem no texto em 11.220 de 14.545', () => {
    expect(damageLabel('1d10[fire]')).toBe('1d10 fire');
    expect(damageLabel('2d6[fire]')).toBe('2d6 fire');
  });

  it('a cauda de opções não aparece', () => {
    expect(damageLabel('10[bludgeoning]|options:fall-damage')).toBe('10 bludgeoning');
  });

  it('o modificador vem depois do tipo, como o Paizo escreve à mão', () => {
    expect(damageLabel('(3[splash])[acid]')).toBe('3 acid splash');
  });

  it('o grupo com vírgula sai inteiro', () => {
    expect(damageLabel('1d6[persistent,acid]')).toBe('1d6 persistent acid');
  });

  it('fórmula que depende de ficha é OMITIDA: sobra o que é verdade', () => {
    expect(damageLabel('(1d6 + @item.system.runes.potency)[persistent,acid]')).toBe(
      'persistent acid',
    );
  });

  it('sem tipo declarado, sobra a fórmula', () => {
    expect(damageLabel('1d6')).toBe('1d6');
  });
});

describe('templateLabel', () => {
  it('as duas formas de escrever a área dão o mesmo texto', () => {
    expect(templateLabel('type:emanation|distance:10')).toBe('10-foot emanation');
    expect(templateLabel('emanation|distance:10')).toBe('10-foot emanation');
  });

  it('sem distância, sobra a forma', () => {
    expect(templateLabel('cone')).toBe('cone');
  });
});

describe('rollLabel', () => {
  it('o flavor depois do # não faz parte da frase', () => {
    // Saía "again for 1d4 #Recharge Searing Wave rounds".
    expect(rollLabel('r', '1d4 #Recharge Searing Wave')).toBe('1d4');
  });

  it('o # sem espaço antes também corta', () => {
    expect(rollLabel('gmr', '1d4+1#Lost Omens')).toBe('1d4+1');
  });

  it('a fórmula sem flavor passa inteira', () => {
    expect(rollLabel('r', '1d3+1')).toBe('1d3+1');
  });

  it('/act é o slug de uma ação, e vira o nome dela', () => {
    expect(rollLabel('act', 'sense-direction')).toBe('Sense Direction');
    expect(rollLabel('act', 'trip')).toBe('Trip');
  });

  it('/act com CD colada perde a CD: o nome da ação é o que se lê', () => {
    expect(rollLabel('act', 'escape dc=28')).toBe('Escape');
  });
});
