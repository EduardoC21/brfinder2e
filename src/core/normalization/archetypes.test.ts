import { describe, expect, it } from 'vitest';

import { archetypePages } from './archetypes';

const FEAT = (id: string, nome: string, nivel: number) =>
  `<h2>@UUID[Compendium.pf2e.feats-srd.Item.${id}]{${nome}} <span style="float:right">Feat ${String(nivel)}</span></h2>`;

const paginas = [
  { id: 'i', name: 'Index', level: 1, sort: 0, content: '<p>@UUID[.a]{Acrobat}</p>' },
  { id: 'r', name: 'Rules', level: 1, sort: 100, content: '' },
  { id: 'r1', name: 'Dedication Details', level: 2, sort: 110, content: '<p>regra</p>' },
  { id: 'm', name: 'Multiclass Archetypes', level: 1, sort: 600, content: '<p>…</p>' },
  {
    id: 'w',
    name: 'Wizard',
    level: 2,
    sort: 610,
    content: `<p>Intro.</p>${FEAT('aaaaaaaaaaaaaaaa', 'Wizard Dedication', 2)}<p><strong>Prerequisites</strong> Intelligence +2</p><p><em>Source: Pathfinder Player Core pg. 181</em></p>`,
  },
  { id: 'g', name: 'Archetypes', level: 1, sort: 5200, content: '<p>…</p>' },
  {
    id: 'a',
    name: 'Acrobat',
    level: 2,
    sort: 5210,
    content: `<p>You have trained your body.</p><p>See @UUID[.r1]{Dedication Details}.</p>${FEAT('bbbbbbbbbbbbbbbb', 'Acrobat Dedication', 2)}<p><strong>Prerequisites</strong> trained in <em>Acrobatics</em></p><hr />${FEAT('cccccccccccccccc', 'Contortionist', 4)}<h2>Benefits</h2><p><em>Source: Pathfinder Player Core 2 pg. 183</em></p>`,
  },
  { id: 'h', name: 'Hellknight (Uncommon)', level: 2, sort: 5220, content: '<p>x</p>' },
];

describe('archetypePages', () => {
  const lidas = archetypePages('J', paginas);

  it('vira arquétipo o que está fora de Index e Rules, com o Tipo pela seção', () => {
    expect(lidas.map((p) => [p.name, p.kind])).toEqual([
      ['Wizard', 'multiclass'],
      ['Acrobat', 'general'],
      ['Hellknight', 'general'],
    ]);
  });

  it('lê a dedicação, os pré-requisitos, os talentos em ordem e o livro', () => {
    const acrobat = lidas[1];
    expect(acrobat?.dedication).toEqual({
      uuid: 'Compendium.pf2e.feats-srd.Item.bbbbbbbbbbbbbbbb',
      name: 'Acrobat Dedication',
      level: 2,
    });
    expect(acrobat?.prerequisites).toBe('trained in Acrobatics');
    expect(acrobat?.feats.map((f) => [f.name, f.level])).toEqual([
      ['Acrobat Dedication', 2],
      ['Contortionist', 4],
    ]);
    expect(acrobat?.sourceTitle).toBe('Pathfinder Player Core 2');
    expect(acrobat?.intro).toBe(
      '<p>You have trained your body.</p><p>See @UUID[Compendium.pf2e.journals.JournalEntry.J.JournalEntryPage.r1]{Dedication Details}.</p>',
    );
  });

  it('a raridade vem do sufixo do nome, que sai', () => {
    expect(lidas[2]?.rarity).toBe('uncommon');
    expect(lidas[2]?.slug).toBe('hellknight');
    expect(lidas[0]?.rarity).toBe('common');
  });
});
