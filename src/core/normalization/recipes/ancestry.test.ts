import { describe, expect, it } from 'vitest';

import { indexJournalPages } from '../journals';
import { isClean } from '../report';
import { run } from '../run';
import { ancestryRecipe } from './ancestry';
import { aiuvarin, awakenedAnimal, forgeDwarf, jornal, nephilim, todas } from './ancestry.fixtures';

const journals = indexJournalPages([jornal]);
const result = run(
  ancestryRecipe,
  [
    { pack: 'ancestries', documents: [...todas, awakenedAnimal] },
    { pack: 'heritages', documents: [nephilim, aiuvarin, forgeDwarf] },
  ],
  { journals },
);

const achar = (nome: string) => {
  const achado = result.entities.find((entity) => entity.base.name === nome);
  if (!achado) throw new Error(`amostra ${nome} não normalizou`);
  return achado;
};

describe('receita de ancestralidade', () => {
  it('normaliza as três ancestralidades e a versátil sem falha, com relatório limpo', () => {
    expect(result.failures).toEqual([]);
    expect(result.entities).toHaveLength(6);
    expect(result.report.unmapped, JSON.stringify(result.report.unmapped)).toEqual([]);
    expect(isClean(result.report)).toBe(true);
  });

  it('projeta a ancestralidade inteira', () => {
    expect(achar('Dwarf').base).toEqual({
      name: 'Dwarf',
      slug: 'dwarf',
      kind: 'ancestry',
      countsAs: ['dwarf'],
      rarity: 'common',
      traits: ['dwarf', 'humanoid'],
      hp: 10,
      hpOptions: [],
      sizes: ['med'],
      speed: 20,
      swim: null,
      speeds: [{ type: 'land', value: 20 }],
      vision: 'darkvision',
      boosts: ['con', 'wis', 'free'],
      flaws: ['cha'],
      languages: ['common', 'dwarven'],
      additionalLanguages: ['gnomish', 'goblin', 'jotun'],
      extraLanguages: 'int',
      alterations: [],
      features: [
        { uuid: 'Compendium.pf2e.ancestryfeatures.Item.Eyuqu6eIaoGCjnMv', name: 'Clan Dagger' },
      ],
      source: { license: 'ORC', title: 'Pathfinder Player Core', remaster: true },
    });
  });

  /* A versátil entra como Tipo, sem mecânica; a herança própria (Forge Dwarf) não entra. */
  it('deixa passar só a herança versátil, com os campos de mecânica nulos', () => {
    expect(result.entities.find((e) => e.base.name === 'Forge Dwarf')).toBeUndefined();
    const versatil = achar('Nephilim').base;
    expect(versatil.kind).toBe('versatile');
    expect(versatil.hp).toBeNull();
    expect(versatil.sizes).toEqual([]);
    expect(versatil.boosts).toEqual([]);
    expect(versatil.languages).toEqual([]);
    expect(versatil.traits).toEqual(['nephilim']);
    /* Penumbra, e escuridão se a ancestralidade já tem penumbra: as duas regras Sense. */
    expect(versatil.vision).toBe('low-light-vision+darkvision');
    expect(achar('Nephilim').desc.page).toBe('');
  });

  /* O Animal Desperto: os campos são marcadores, e a verdade está nas regras. */
  it('lê tamanho, PV por tamanho e deslocamento das regras quando elas mandam', () => {
    const base = achar('Awakened Animal').base;
    expect(base.sizes).toEqual(['tiny', 'sm', 'med', 'lg']);
    expect(base.hp).toBeNull();
    expect(base.hpOptions).toEqual([6, 8, 10]);
    expect(base.speed).toBe(20);
    expect(base.swim).toBe(25);
    expect(base.speeds).toEqual([
      { type: 'land', value: 20 },
      { type: 'swim', value: 25 },
    ]);
  });

  /* O meio-elfo conta como elfo: é o que dá a ele os talentos de elfo. */
  it('lê o "conta como" do Aiuvarin', () => {
    expect(achar('Aiuvarin').base.countsAs).toEqual(['aiuvarin', 'elf']);
    expect(achar('Nephilim').base.countsAs).toEqual(['nephilim']);
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
    /* O bloco de mecânica, à parte: do título até a lista de heranças. */
    expect(achar('Dwarf').desc.mechanics).toBe('<p>Hit Points 10</p>');
    expect(achar('Tengu').desc.mechanics).toBe('');
    expect(achar('Tengu').desc.page).toBe('');
  });

  it('sem a tabela de jornais, a página fica vazia e nada falha', () => {
    const sem = run(ancestryRecipe, [{ pack: 'ancestries', documents: todas }]);
    expect(sem.failures).toEqual([]);
    expect(sem.entities.every((entity) => entity.desc.page === '')).toBe(true);
  });
});
