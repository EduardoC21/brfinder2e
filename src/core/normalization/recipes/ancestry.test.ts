import { describe, expect, it } from 'vitest';

import { indexJournalPages } from '../journals';
import { isClean } from '../report';
import { run } from '../run';
import { ancestryRecipe } from './ancestry';
import { jornal, todas } from './ancestry.fixtures';

const journals = indexJournalPages([jornal]);
const result = run(ancestryRecipe, [{ pack: 'ancestries', documents: todas }], { journals });

const achar = (nome: string) => {
  const achado = result.entities.find((entity) => entity.base.name === nome);
  if (!achado) throw new Error(`amostra ${nome} não normalizou`);
  return achado;
};

describe('receita de ancestralidade', () => {
  it('normaliza as três amostras sem falha, com relatório limpo', () => {
    expect(result.failures).toEqual([]);
    expect(result.entities).toHaveLength(3);
    expect(result.report.unmapped, JSON.stringify(result.report.unmapped)).toEqual([]);
    expect(isClean(result.report)).toBe(true);
  });

  it('projeta a ancestralidade inteira', () => {
    expect(achar('Dwarf').base).toEqual({
      name: 'Dwarf',
      slug: 'dwarf',
      rarity: 'common',
      traits: ['dwarf', 'humanoid'],
      hp: 10,
      size: 'med',
      speed: 20,
      vision: 'darkvision',
      boosts: ['con', 'wis', 'free'],
      flaws: ['cha'],
      languages: ['common', 'dwarven'],
      additionalLanguages: ['gnomish', 'goblin', 'jotun'],
      extraLanguages: 'int',
      features: [
        { uuid: 'Compendium.pf2e.ancestryfeatures.Item.Eyuqu6eIaoGCjnMv', name: 'Clan Dagger' },
      ],
      source: { license: 'ORC', title: 'Pathfinder Player Core', remaster: true },
    });
  });

  /* O GrantItem entra sem nome — o índice resolve — e o Human tem um idioma a mais. */
  it('junta as habilidades de items e de GrantItem, e conta os idiomas extras', () => {
    expect(achar('Tengu').base.features).toEqual([
      { uuid: 'Compendium.pf2e.ancestryfeatures.Item.abcdefghijklmnop', name: 'Sharp Beak' },
      { uuid: 'Compendium.pf2e.actionspf2e.Item.34E7k2YRcsOU5uyl', name: '' },
    ]);
    expect(achar('Human').base.extraLanguages).toBe('1+int');
    expect(achar('Tengu').base.extraLanguages).toBe('int');
  });

  /* O slot vazio não é aumento; os seis atributos são o livre. */
  it('lê os três desenhos de aumento', () => {
    expect(achar('Tengu').base.boosts).toEqual(['dex', 'free']);
    expect(achar('Tengu').base.flaws).toEqual([]);
    expect(achar('Human').base.boosts).toEqual(['free', 'free']);
  });

  /* O "leia mais" do Foundry sai do resumo: a página já é `page`. */
  it('tira o link de rodapé para a página do jornal', () => {
    expect(achar('Dwarf').desc.main).toBe('<p>Dwarves have a well-earned reputation […]</p>');
    expect(achar('Dwarf').desc.main).not.toContain('JournalEntryPage');
  });

  /* A página vem do jornal pelo nome; sem página, a descrição longa fica vazia. */
  it('cola a prosa da página do jornal, até a mecânica; sem página, vazia', () => {
    expect(achar('Dwarf').desc.page).toBe('<h2>You Might...</h2><p>Strive to […]</p>');
    expect(achar('Dwarf').desc.page).not.toContain('Mechanics');
    expect(achar('Tengu').desc.page).toBe('');
  });

  it('sem a tabela de jornais, a página fica vazia e nada falha', () => {
    const sem = run(ancestryRecipe, [{ pack: 'ancestries', documents: todas }]);
    expect(sem.failures).toEqual([]);
    expect(sem.entities.every((entity) => entity.desc.page === '')).toBe(true);
  });
});
