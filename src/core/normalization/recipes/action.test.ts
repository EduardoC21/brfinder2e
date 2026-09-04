import { describe, expect, it } from 'vitest';

import { isClean } from '../report';
import { run } from '../run';
import { actionRecipe } from './action';
import {
  folderRoots,
  intercessionSpell,
  playTheFool,
  rage,
  samples,
  trip,
} from './action.fixtures';

/*
 * As amostras vêm do pack COM pastas. É por isso que elas resolvem o setor pela árvore, e
 * não pelo carimbo.
 */
const result = run(actionRecipe, [
  { pack: 'actionspf2e', documents: samples, folders: folderRoots },
]);

describe('receita de action', () => {
  it('normaliza as quatro amostras sem falha, com relatório limpo', () => {
    expect(result.failures).toEqual([]);
    expect(result.entities).toHaveLength(4);
    expect(result.report.unmapped, JSON.stringify(result.report.unmapped)).toEqual([]);
    expect(isClean(result.report)).toBe(true);
  });
});

describe('Trip — perícia, uma ação, com raridade', () => {
  const entity = result.entities[0];

  it('projeta base', () => {
    expect(entity?.base).toEqual({
      name: 'Trip',
      slug: 'trip',
      costKind: 'action',
      costCount: 1,
      category: 'offensive',
      sector: 'Skill',
      traits: ['attack'],
      rarity: 'common',
      frequency: null,
      source: { license: 'ORC', title: 'Pathfinder Player Core', remaster: true },
    });
  });

  it('guarda a descrição com a marcação de rolagem intacta', () => {
    expect(entity?.desc.main).toBe(trip.system.description.value);
    expect(entity?.desc.main).toContain('[[/act');
  });
});

describe('Rage — classe, o setor vem da pasta', () => {
  const entity = result.entities[1];

  /**
   * A pasta é a ÚNICA coisa na base que separa as 30 ações básicas das 196 de classe:
   * nenhum traço marca uma ação como básica.
   */
  it('resolve o id da pasta para o nome da raiz', () => {
    expect(entity?.base.sector).toBe('Class');
    // no documento é um id opaco, não o nome
    expect(rage.folder).not.toBe('Class');
  });

  it('mantém a marcação de referência cruzada da descrição', () => {
    expect(entity?.desc.main).toContain('@UUID[Compendium.pf2e.conditionitems.Item.');
  });
});

describe('Intercession Spell — reação, com frequência e sem raridade', () => {
  const entity = result.entities[2];

  /** Medido nas 574: `action` sempre tem contagem; os outros três são sempre nulos. */
  it('reação tem contagem nula', () => {
    expect(entity?.base.costKind).toBe('reaction');
    expect(entity?.base.costCount).toBeNull();
  });

  it('lê a frequência', () => {
    expect(entity?.base.frequency).toEqual({ max: 1, per: 'day' });
  });

  /** 275 das 574 não declaram raridade. O padrão é o mesmo do sistema. */
  it('sem o campo, a raridade cai no padrão common', () => {
    expect(entity?.base.rarity).toBe('common');
    expect('rarity' in intercessionSpell.system.traits).toBe(false);
  });
});

/**
 * O pack `adventure-specific-actions` não tem arquivo de pastas, e NENHUM dos seus 192
 * documentos tem a chave `folder`. É isso que os identifica — e `source.title` diz qual
 * aventura, entre 41 livros distintos.
 */
describe('Play the Fool — de aventura, sem a chave folder', () => {
  it('o livro identifica a aventura, e o conteúdo é legado', () => {
    const entity = result.entities[3];
    expect(entity?.base.source.title).toBe('Pathfinder Dark Archive');
    expect(entity?.base.source.remaster).toBe(false);
    expect('folder' in playTheFool).toBe(false);
  });
});

/**
 * O CARIMBO vem do pack, e é isto que ele conserta.
 *
 * Antes era `withDefault('Adventure')` na receita — um padrão global. Funcionava por
 * coincidência: havia dois packs, um com pastas e um sem, então "sem pasta" e "de
 * aventura" eram a mesma coisa. Com um terceiro pack sem pastas (e eles existem:
 * `class-features` tem 778 de 874 sem pasta, `boons-and-curses` não tem arquivo nenhum)
 * o padrão global marcaria tudo como de aventura.
 */
describe('o carimbo do pack', () => {
  it('vem do pack que declarou, e só dele', () => {
    const doPackCarimbado = run(actionRecipe, [
      { pack: 'adventure-specific-actions', documents: [playTheFool] },
    ]);
    const semCarimbo = run(actionRecipe, [{ pack: 'actionspf2e', documents: [playTheFool] }]);

    expect(doPackCarimbado.entities[0]?.base.sector).toBe('Adventure');
    expect(semCarimbo.entities[0]?.base.sector).toBe('');
  });

  it('pack que a receita não declara não carimba nada', () => {
    // É o caso dos aposentados, que não sabem de qual pack vieram.
    const orfao = run(actionRecipe, [{ pack: '(aposentados)', documents: [playTheFool] }]);
    expect(orfao.entities[0]?.base.sector).toBe('');
  });

  /**
   * Sem a tabela de pastas, quem TEM a chave `folder` fica com o setor vazio.
   *
   * Vazio e não o carimbo: a chave existe, então o documento ESTÁ organizado — só não
   * conseguimos resolver. Carimbar aqui marcaria como "de aventura" um punhado de ações
   * de classe, que é o oposto do que o carimbo serve para fazer.
   */
  it('a pasta VENCE o carimbo: quem tem a chave nunca é carimbado', () => {
    const semTabela = run(actionRecipe, [
      { pack: 'adventure-specific-actions', documents: samples },
    ]);
    expect(semTabela.failures).toEqual([]);
    expect(semTabela.entities.map((entity) => entity.base.sector)).toEqual([
      '',
      '',
      '',
      // só a quarta, que não tem a chave `folder`, recebe o carimbo
      'Adventure',
    ]);
  });
});

describe('o que ficou de fora, e por quê', () => {
  it('mecânica de ficha e texto de mestre ficam adiados, não ignorados', () => {
    expect(result.report.deferred.map((entry) => entry.path).sort()).toEqual([
      'system.description.gm',
      'system.rules',
      'system.selfEffect',
      'system.traits.otherTags',
    ]);
  });

  /** Achado ao rodar nas 574: o campo contradiz `traits.value` em pelo menos três. */
  it('o cache de interface vazado está ignorado, com o motivo escrito', () => {
    const motivo = result.report.ignored.find(
      (entry) => entry.path === 'system.traits.selected',
    )?.reason;
    expect(motivo).toMatch(/cache de interface/);
    expect(motivo).toMatch(/contradiz/);
  });
});
