import { describe, expect, it } from 'vitest';

import { isClean } from '../report';
import { run } from '../run';
import { featRecipe } from './feat';
import {
  advancedQiSpells,
  becomeThought,
  folderRoots,
  idyllkin,
  ruptureStomp,
  todas,
  vigilantMask,
} from './feat.fixtures';

const result = run(featRecipe, [{ pack: 'feats-srd', documents: todas, folders: folderRoots }]);

const base = (nome: string) => {
  const achado = result.entities.find((entity) => entity.base.name === nome);
  if (!achado) throw new Error(`amostra ${nome} não normalizou`);
  return achado.base;
};

describe('receita de feat', () => {
  it('normaliza as cinco amostras sem falha, com relatório limpo', () => {
    expect(result.failures).toEqual([]);
    expect(result.entities).toHaveLength(5);
    expect(result.report.unmapped, JSON.stringify(result.report.unmapped)).toEqual([]);
    expect(isClean(result.report)).toBe(true);
  });
});

describe('Rupture Stomp — custo em ações, frequência e limite de uso', () => {
  it('projeta base', () => {
    expect(base('Rupture Stomp')).toEqual({
      name: 'Rupture Stomp',
      slug: 'rupture-stomp',
      level: 8,
      costKind: 'action',
      costCount: 2,
      category: 'class',
      sector: 'Archetype',
      traits: ['archetype'],
      rarity: 'common',
      prerequisites: ['stalwart defender dedication'],
      alterations: [],
      frequency: { max: 1, per: 'day' },
      maxTakable: 2,
      onlyLevel1: false,
      source: { license: 'OGL', remaster: false, title: 'Pathfinder Lost Omens Highhelm' },
    });
  });

  it('guarda a descrição com a referência cruzada intacta', () => {
    const entidade = result.entities.find((e) => e.base.name === 'Rupture Stomp');
    expect(entidade?.desc.main).toContain('@UUID[');
  });
});

/*
 * Os três estados de `maxTakable` moram em três amostras diferentes de propósito: é a
 * distinção mais fácil de perder numa "simplificação" do tipo para `number`.
 */
describe('maxTakable tem três estados, e eles não se confundem', () => {
  it('ausente é uma vez só', () => {
    expect('maxTakable' in idyllkin.system).toBe(false);
    expect(base('Idyllkin').maxTakable).toBe(1);
  });

  it('número é até N vezes', () => {
    expect(base('Rupture Stomp').maxTakable).toBe(2);
  });

  it('nulo é SEM LIMITE, e não cai no padrão', () => {
    expect(advancedQiSpells.system.maxTakable).toBeNull();
    expect(base('Advanced Qi Spells').maxTakable).toBeNull();
  });
});

describe('Idyllkin — ancestralidade, só na criação', () => {
  it('a bandeira de nível 1 é lida, e o resto é falso por padrão', () => {
    expect(base('Idyllkin').onlyLevel1).toBe(true);
    expect(base('Rupture Stomp').onlyLevel1).toBe(false);
  });

  it('sem pré-requisito é lista vazia, e não nulo', () => {
    expect(base('Idyllkin').prerequisites).toEqual([]);
  });

  it('o setor vem da pasta, e a categoria vem do dado — são coisas diferentes', () => {
    expect(base('Idyllkin').sector).toBe('Ancestry');
    expect(base('Idyllkin').category).toBe('ancestry');
    // E aqui as duas DISCORDAM, que é o caso que prova que uma não substitui a outra.
    expect(base('Vigilant Mask').sector).toBe('Archetype');
    expect(base('Vigilant Mask').category).toBe('class');
  });
});

describe('Become Thought — uma vez por ano', () => {
  /*
   * `P1Y` não existe em ação nenhuma. Está aqui porque a receita de `action` fixou seis
   * formatos de `per`, e talento traz nove — quem ler o tipo precisa ver isso.
   */
  it('lê unidade de frequência que ação nenhuma tem', () => {
    expect(base('Become Thought').frequency).toEqual({ max: 1, per: 'P1Y' });
  });

  it('sem frequência, o campo é nulo e não indefinido', () => {
    expect(base('Idyllkin').frequency).toBeNull();
  });
});

describe('Vigilant Mask — a chave morta que contradiz a viva', () => {
  /*
   * `system.rarity` existe em 10 talentos da base e nos 10 diz "common" enquanto
   * `system.traits.rarity` diz "rare". Ignorar a errada é decisão, e este teste é o que
   * impede alguém de "consertar" lendo a chave de nome mais óbvio.
   */
  it('a raridade vem de traits.rarity, e não da chave homônima', () => {
    expect(vigilantMask.system.rarity).toEqual({ value: 'common' });
    expect(base('Vigilant Mask').rarity).toBe('rare');
  });

  it('o motivo do descarte está escrito na receita', () => {
    expect(featRecipe.ignore['system.rarity']).toContain('CONTRADIZ');
  });
});

describe('o pré-requisito é frase, não objeto', () => {
  it('desembrulha o { value } do Foundry', () => {
    expect(base('Vigilant Mask').prerequisites).toEqual(['Druid Dedication or Wizard Dedication']);
    expect(base('Advanced Qi Spells').prerequisites).toEqual(['Qi Spells']);
  });
});

describe('o que ficou de fora, e por quê', () => {
  it('a metade mecânica do talento fica adiada, não ignorada', () => {
    expect(Object.keys(featRecipe.defer)).toContain('system.rules');
    expect(Object.keys(featRecipe.defer)).toContain('system.subfeatures');
    expect(featRecipe.defer['system.subfeatures']).toContain('ficha');
  });

  it('estado de ficha e de mesa está ignorado, com o motivo escrito', () => {
    for (const rota of ['system.level.taken', 'system.location', 'system.identified']) {
      expect(Object.keys(featRecipe.ignore)).toContain(rota);
      expect(featRecipe.ignore[rota]).toBeTruthy();
    }
  });
});

describe('o escopo, que é decisão desta receita', () => {
  it('declara um pack só, e é o dos talentos que se escolhe', () => {
    expect(featRecipe.packs.map((p) => p.name)).toEqual(['feats-srd']);
  });

  it('documento de outro tipo no mesmo pack é descartado pelo motor', () => {
    const comIntruso = run(featRecipe, [
      {
        pack: 'feats-srd',
        documents: [...todas, { ...ruptureStomp, _id: 'outro', type: 'action' }],
        folders: folderRoots,
      },
    ]);
    expect(comIntruso.entities).toHaveLength(5);
    expect(comIntruso.failures).toEqual([]);
  });

  it('pack que a receita não declara não carimba setor nenhum', () => {
    const semDeclaracao = run(featRecipe, [
      { pack: 'boons-and-curses', documents: [becomeThought], folders: folderRoots },
    ]);
    // A pasta continua resolvendo: o carimbo do pack só entra quando não há pasta.
    expect(semDeclaracao.entities[0]?.base.sector).toBe('Class');
  });
});
