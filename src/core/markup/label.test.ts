import { describe, expect, it } from 'vitest';

import { checkLabel, damageLabel, templateLabel } from './label';

/*
 * Os casos vêm da base real (json-assets-pf2e-8.4.1), não de exemplos inventados: cada
 * corpo aqui foi extraído da varredura que contou 17.434 `@Check`, 14.545 `@Damage` e
 * 4.544 `@Template` sem rótulo.
 */

describe('checkLabel', () => {
  it('a CD literal entra na frente', () => {
    expect(checkLabel('flat|showDC:all|dc:15')).toBe('DC 15 Flat');
  });

  it('a CD por variável fica de fora, porque só o Foundry a resolve', () => {
    expect(checkLabel('perception|dc:{societyDC}|traits:secret')).toBe('Perception');
  });

  it('o salvamento básico se anuncia como básico', () => {
    expect(checkLabel('reflex|basic|dc:20')).toBe('DC 20 basic Reflex');
  });

  it('a perícia sem parâmetro nenhum sai só com o nome', () => {
    expect(checkLabel('fortitude')).toBe('Fortitude');
  });

  it('o hífen do identificador vira espaço', () => {
    expect(checkLabel('scouting-lore|dc:20')).toBe('DC 20 Scouting Lore');
  });
});

describe('damageLabel', () => {
  it('fórmula e tipo, na ordem em que se lê', () => {
    expect(damageLabel('2d6[fire]')).toBe('2d6 fire damage');
  });

  it('a cauda de opções não aparece', () => {
    expect(damageLabel('10[bludgeoning]|options:fall-damage')).toBe('10 bludgeoning damage');
  });

  it('o modificador vem depois do tipo, como o Paizo escreve à mão', () => {
    expect(damageLabel('(3[splash])[acid]')).toBe('3 acid splash damage');
  });

  it('o grupo com vírgula sai inteiro', () => {
    expect(damageLabel('1d6[persistent,acid]')).toBe('1d6 persistent acid damage');
  });

  it('fórmula que depende de ficha é OMITIDA: sobra o que é verdade', () => {
    expect(damageLabel('(1d6 + @item.system.runes.potency)[persistent,acid]')).toBe(
      'persistent acid damage',
    );
  });

  it('sem tipo declarado, sobra a fórmula', () => {
    expect(damageLabel('1d6')).toBe('1d6 damage');
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
