import { describe, expect, it } from 'vitest';

import { indexClassFeatures } from '../features-index';
import { indexJournalPages } from '../journals';
import { isClean } from '../report';
import { run } from '../run';
import { classRecipe } from './class';
import { druid, escolha, jornal, ordem, racket } from './class.fixtures';

const result = run(classRecipe, [{ pack: 'classes', documents: [druid] }], {
  journals: indexJournalPages([jornal]),
  features: indexClassFeatures([racket, escolha, ordem]),
});

describe('receita de classe', () => {
  it('normaliza a amostra sem falha, com relatório limpo', () => {
    expect(result.failures).toEqual([]);
    expect(result.entities).toHaveLength(1);
    expect(result.report.unmapped, JSON.stringify(result.report.unmapped)).toEqual([]);
    expect(isClean(result.report)).toBe(true);
  });

  it('projeta a ficha inicial, os níveis e as habilidades por nível', () => {
    const base = result.entities[0]?.base;
    expect(base?.keyAbility).toEqual(['wis']);
    /* O que a subclasse abre vem da tabela de habilidades, pelo traço da classe. */
    expect(base?.keyAbilityOptions).toEqual([
      {
        ability: 'str',
        features: [
          { uuid: 'Compendium.pf2e.classfeatures.Item.rrrrrrrrrrrrrrrr', name: 'Wild Ruffian' },
        ],
      },
    ]);
    expect(base?.hp).toBe(8);
    expect(base?.perception).toBe(1);
    expect(base?.saves).toEqual({ fortitude: 1, reflex: 1, will: 2 });
    expect(base?.attacks.simple).toBe(1);
    expect(base?.defenses.heavy).toBe(0);
    expect(base?.spellcasting).toBe(1);
    expect(base?.skills).toEqual(['nature']);
    /* A Druidic Order (1º nível) tem uma opção que treina Acrobatics: "outro". */
    expect(base?.subclassSkill).toBe(true);
    expect(base?.extraSkills).toBe(2);
    expect(base?.classFeatLevels).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18, 20]);
    /* No mesmo nível, a ordem do pack (a1 antes de a3), não a alfabética. */
    expect(base?.features.map((f) => [f.level, f.name])).toEqual([
      [1, 'Druidic Order'],
      [1, 'Druid Spellcasting'],
      [3, 'Fortitude Expertise'],
    ]);
    expect(base?.featureUuids).toHaveLength(3);
  });

  it('cola a página do jornal', () => {
    expect(result.entities[0]?.desc.page).toContain('<h1>Class Features</h1>');
    expect(result.entities[0]?.desc.main).toContain('The power of nature');
  });

  it('tira da página as tabelas de progressão e de magias, pelo cabeçalho', () => {
    const desc = result.entities[0]?.desc;
    expect(desc?.progression).toMatch(/^<table>.*Class Features.*Druidic Order.*<\/table>$/);
    expect(desc?.spellSlots).toMatch(/^<table>.*Cantrips.*<\/table>$/);
    expect(desc?.progression).not.toContain('Cantrips');
  });
});
