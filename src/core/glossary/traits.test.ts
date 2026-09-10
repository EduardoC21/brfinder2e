import { describe, expect, it } from 'vitest';

import { buildTraitGlossary, lookupTrait, traitLabel } from './traits';

/* Uma tabela de idioma mínima, com a FORMA real das chaves do `pf2e-8.5.0`. */
const language = new Map<string, string>([
  ['PF2E.TraitAgile', 'Agile'],
  ['PF2E.TraitDescriptionAgile', 'The multiple attack penalty you take with this weapon…'],
  ['PF2E.TraitTwoHand', 'Two-Hand'],
  ['PF2E.TraitDescriptionTwoHand', 'This weapon can be wielded with two hands…'],
  ['PF2E.TraitDescriptionDeadly', 'On a critical hit, the weapon adds a die of the listed size.'],
  ['PF2E.TraitFatalAim', 'Fatal Aim'],
  ['PF2E.TraitDescriptionFatalAim', 'This weapon can be wielded in two hands for the fatal…'],
  // Rótulo SEM descrição: não vira entrada — não há o que mostrar.
  ['PF2E.TraitJotunborn', 'Jotunborn'],
  // Uma chave que só PARECE de traço. `PF2E.Traits.…` tem ponto depois do prefixo.
  ['PF2E.Traits.Label', 'Traits'],
]);

const glossary = buildTraitGlossary(language);

describe('buildTraitGlossary', () => {
  it('uma entrada por descrição, com o slug em kebab-case', () => {
    expect(Object.keys(glossary).sort()).toEqual(['agile', 'deadly', 'fatal-aim', 'two-hand']);
  });

  it('o rótulo vem da tabela quando existe, e cai no slug quando não', () => {
    expect(glossary['two-hand']?.label).toBe('Two-Hand');
    expect(glossary['deadly']?.label).toBe('deadly');
  });

  /* 908 rótulos e 536 descrições: o rótulo sozinho não é entrada. */
  it('rótulo sem descrição não entra', () => {
    expect(glossary['jotunborn']).toBeUndefined();
  });

  it('chaves com ponto depois do prefixo não são traços', () => {
    expect(glossary['s.label']).toBeUndefined();
    expect(glossary['label']).toBeUndefined();
  });
});

/*
 * ⚠️ A REGRA DO SUFIXO. Trinta e seis traços vêm parametrizados e nenhum tem descrição
 * própria — a base é que tem, e foi escrita para isso ("of the listed size").
 */
describe('lookupTrait', () => {
  it('a forma exata vence', () => {
    expect(lookupTrait(glossary, 'agile')?.label).toBe('Agile');
  });

  it('o dado no fim cai na base: deadly-d8 → deadly', () => {
    expect(lookupTrait(glossary, 'deadly-d8')?.description).toContain('listed size');
    expect(lookupTrait(glossary, 'two-hand-d12')?.label).toBe('Two-Hand');
  });

  it('o número e a letra no fim também caem na base', () => {
    expect(
      lookupTrait({ ...glossary, thrown: { label: 'Thrown', description: 'x' } }, 'thrown-20')
        ?.label,
    ).toBe('Thrown');
    expect(
      lookupTrait(
        { ...glossary, versatile: { label: 'Versatile', description: 'x' } },
        'versatile-p',
      )?.label,
    ).toBe('Versatile');
  });

  /* `-aim` não é parâmetro: é nome, e `fatal-aim` tem a própria descrição. */
  it('só corta o que é parâmetro', () => {
    expect(lookupTrait(glossary, 'fatal-aim')?.label).toBe('Fatal Aim');
  });

  it('nem a base existindo, devolve nulo', () => {
    expect(lookupTrait(glossary, 'jotunborn')).toBeNull();
    expect(lookupTrait(glossary, 'yaksha-d6')).toBeNull();
  });
});

/* O rótulo como o livro escreve: nome da tabela, parâmetro atrás, com espaço. */
describe('traitLabel', () => {
  const g = {
    ...glossary,
    versatile: { label: 'Versatile', description: 'x' },
    thrown: { label: 'Thrown', description: 'x' },
  };

  it('o nome exato vem da tabela', () => {
    expect(traitLabel(g, 'two-hand')).toBe('Two-Hand');
  });

  it('o dado volta atrás do nome: two-hand-d8 → Two-Hand d8', () => {
    expect(traitLabel(g, 'two-hand-d8')).toBe('Two-Hand d8');
    expect(traitLabel(g, 'deadly-d12')).toBe('deadly d12');
  });

  it('a letra solta sobe: versatile-p → Versatile P', () => {
    expect(traitLabel(g, 'versatile-p')).toBe('Versatile P');
  });

  it('o número fica como está: thrown-20 → Thrown 20', () => {
    expect(traitLabel(g, 'thrown-20')).toBe('Thrown 20');
  });

  it('desconhecido devolve nulo — e a tela decide o que fazer', () => {
    expect(traitLabel(g, 'jotunborn')).toBeNull();
    expect(traitLabel(g, 'yaksha-d6')).toBeNull();
  });
});
