import { describe, expect, it } from 'vitest';

import { isClean } from '../report';
import { run } from '../run';
import { equipmentRecipe } from './equipment';
import { folderRoots, todas } from './equipment.fixtures';

const result = run(equipmentRecipe, [
  { pack: 'equipment-srd', documents: todas, folders: folderRoots },
]);

const base = (nome: string) => {
  const achado = result.entities.find((entity) => entity.base.name === nome);
  if (!achado) throw new Error(`amostra ${nome} não normalizou`);
  return achado.base;
};

describe('receita de equipment', () => {
  it('normaliza as seis amostras sem falha, com relatório limpo', () => {
    expect(result.failures).toEqual([]);
    expect(result.entities).toHaveLength(6);
    expect(result.report.unmapped, JSON.stringify(result.report.unmapped)).toEqual([]);
    expect(isClean(result.report)).toBe(true);
  });

  /*
   * A razão de a receita existir: SEIS tipos diferentes do Foundry entram, e saem como uma
   * coisa só. Antes disso o motor descartava tudo que não fosse o `type` declarado.
   */
  it('aceita os seis tipos do Foundry numa receita só', () => {
    expect(result.entities.map((entity) => entity.base.kind).sort()).toEqual([
      'ammo',
      'armor',
      'backpack',
      'consumable',
      'shield',
      'weapon',
    ]);
    expect(result.type).toBe('equipment');
  });
});

describe('o preço vira COBRE, e volta a ser moeda na tela', () => {
  it('1 po viram 100 pc', () => {
    expect(base('Longsword').price).toBe(100);
  });

  it('1 pp vira 10 pc — a moeda menor não se perde', () => {
    expect(base('Backpack').price).toBe(10);
  });

  it('1.500 po viram 150.000 pc', () => {
    expect(base('Magekiller Bullet').price).toBe(150_000);
  });

  /** 496 itens declaram `per: 1`, que é o padrão; 48 vêm em lote. */
  it('o lote é lido, e vale 1 quando a fonte não diz', () => {
    expect(base('Magekiller Bullet').pricePer).toBe(1);
    expect(base('Longsword').pricePer).toBe(1);
  });
});

describe('o dano tem duas formas na fonte e uma na saída', () => {
  it('a arma traz dados separados', () => {
    expect(base('Longsword').damage).toEqual({ formula: '1d8', type: 'slashing' });
  });

  it('o consumível traz a fórmula pronta', () => {
    expect(base('Tin Cobra').damage).toEqual({ formula: '3d6', type: 'poison' });
  });

  it('quem não causa dano traz nulo', () => {
    expect(base('Full Plate').damage).toBeNull();
  });
});

describe('os números de armadura e escudo', () => {
  /** ZERO e não nulo: a armadura pesada limita a Destreza a +0. */
  it('a armadura preenche os cinco, e o limite de Destreza pode ser zero', () => {
    const a = base('Full Plate');
    expect(a.acBonus).toBe(6);
    expect(a.dexCap).toBe(0);
    expect(a.checkPenalty).toBe(-3);
    expect(a.speedPenalty).toBe(-10);
    expect(a.strength).toBe(4);
  });

  it('o escudo preenche CA e deslocamento, e é o único com dureza e PV', () => {
    const e = base("Helmsman's Recourse (Greater)");
    expect(e.acBonus).toBe(2);
    expect(e.speedPenalty).toBe(0);
    expect(e.hardness).toBe(8);
    expect(e.hitPoints).toBe(60);
    expect(e.dexCap).toBeNull();
  });

  it('quem não é armadura nem escudo traz nulo, e não zero', () => {
    expect(base('Longsword').acBonus).toBeNull();
    expect(base('Longsword').hardness).toBe(0);
  });
});

describe('o Tipo vem do documento, e a família vem da pasta', () => {
  /** 5.706 dos 5.869 não têm pasta: a pasta não serve de Tipo, e o `type` serve. */
  it('a família fica vazia quando não há pasta', () => {
    expect(base('Longsword').family).toBe('');
    expect(base('Longsword').kind).toBe('weapon');
  });

  it('a família aparece nos 163 que têm pasta', () => {
    expect(base('Magekiller Bullet').family).toBe('Magic Ammunition');
    expect(base('Magekiller Bullet').kind).toBe('ammo');
  });
});

describe('o resto do cabeçalho', () => {
  it('projeta a arma inteira', () => {
    expect(base('Longsword')).toEqual({
      name: 'Longsword',
      slug: 'longsword',
      kind: 'weapon',
      family: '',
      level: 0,
      price: 100,
      pricePer: 1,
      bulk: 1,
      traits: ['versatile-p'],
      rarity: 'common',
      category: 'martial',
      group: 'sword',
      usage: 'held-in-one-hand',
      hands: '1',
      carry: 'held',
      weaponType: 'melee',
      damage: { formula: '1d8', type: 'slashing' },
      range: null,
      reload: '',
      acBonus: null,
      dexCap: null,
      checkPenalty: null,
      speedPenalty: null,
      strength: null,
      hardness: 0,
      hitPoints: 0,
      uses: null,
      source: { license: 'ORC', remaster: true, title: 'Pathfinder Player Core' },
    });
  });

  it('a mochila não tem categoria nem grupo, e o volume dela é insignificante', () => {
    const m = base('Backpack');
    expect(m.category).toBe('');
    expect(m.group).toBe('');
    expect(m.bulk).toBe(0);
    expect(m.usage).toBe('wornbackpack');
  });

  it('as cargas são lidas de quem se gasta', () => {
    expect(base('Tin Cobra').uses).toBe(1);
    expect(base('Longsword').uses).toBeNull();
  });
});

/*
 * Os três campos que a fonte NÃO tem e o Archives of Nethys mostra como coluna. Ver os
 * campos `hands`, `carry` e `weaponType` na receita.
 */
describe('o que o AoN mostra e o Foundry não guarda', () => {
  it('as mãos saem das 120 formas de usar', () => {
    expect(base('Longsword').hands).toBe('1');
    expect(base('Backpack').hands).toBe('');
  });

  it('as oito formas de carregar substituem as 120', () => {
    expect(base('Longsword').carry).toBe('held');
    expect(base('Backpack').carry).toBe('worn');
    expect(base('Magekiller Bullet').carry).toBe('');
  });

  /* A regra é o ALCANCE, e só vale para arma: uma poção também tem alcance nulo. */
  it('corpo a corpo e à distância só existem em arma', () => {
    expect(base('Longsword').weaponType).toBe('melee');
    expect(base('Full Plate').weaponType).toBe('');
    expect(base('Tin Cobra').weaponType).toBe('');
  });
});
