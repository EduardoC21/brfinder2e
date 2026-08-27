import { describe, expect, it } from 'vitest';

import { createSearchIndex, foldTerm, tokenize } from './search';
import type { BrowseEntity } from './query';

const entity = (key: string, name: string, summary = ''): BrowseEntity => ({
  key,
  uuid: key,
  base: { name, summary },
});

const base = [
  entity('blinded', 'Blinded', "You're unable to see."),
  entity('dazzled', 'Dazzled', 'Your vision is impaired.'),
  entity('frightened', 'Frightened', 'Fear makes you less capable of attacking.'),
  entity('archwizard', "Archwizard's Spellcraft"),
  entity('ilusao', 'Ilusão'),
];

const index = createSearchIndex(base, ['name', 'summary']);

describe('foldTerm', () => {
  it('tira acento e caixa', () => {
    expect(foldTerm('Ilusão')).toBe('ilusao');
    expect(foldTerm('ÉBRIO')).toBe('ebrio');
  });
});

describe('tokenize', () => {
  /**
   * Briefing 7.8: os links por nome são sensíveis a apóstrofo. O tokenizador padrão do
   * MiniSearch QUEBRA no apóstrofo, e aí "archwizards" não acharia nada.
   */
  it('remove apóstrofo em vez de quebrar nele', () => {
    expect(tokenize("Archwizard's Spellcraft")).toEqual(['Archwizards', 'Spellcraft']);
    expect(tokenize('Archwizard’s')).toEqual(['Archwizards']);
  });

  it('quebra em qualquer não-letra e descarta vazio', () => {
    expect(tokenize('Off-Guard  (Level 1)')).toEqual(['Off', 'Guard', 'Level', '1']);
  });
});

describe('createSearchIndex', () => {
  it('termo vazio não devolve nada — quem mostra tudo é a lista, não a busca', () => {
    expect(index.search('')).toEqual([]);
    expect(index.search('   ')).toEqual([]);
  });

  it('acha por prefixo', () => {
    expect(index.search('bli')).toContain('blinded');
  });

  it('acha pelo resumo, não só pelo nome', () => {
    expect(index.search('vision')).toContain('dazzled');
  });

  it('o nome pesa mais que o resumo', () => {
    // "Frightened" tem o termo no nome; nenhuma outra tem no nome.
    expect(index.search('frightened')[0]).toBe('frightened');
  });

  it('acha apesar do apóstrofo', () => {
    expect(index.search('archwizards')).toContain('archwizard');
    expect(index.search("archwizard's")).toContain('archwizard');
  });

  it('acha ignorando acento, nos dois sentidos', () => {
    expect(index.search('ilusao')).toContain('ilusao');
    expect(index.search('ilusão')).toContain('ilusao');
  });

  it('tolera erro de digitação em termo longo', () => {
    expect(index.search('frightenned')).toContain('frightened');
  });

  it('não tolera erro em termo curto — senão tudo casa com tudo', () => {
    expect(index.search('xyz')).toEqual([]);
  });
});
