import { describe, expect, it } from 'vitest';

import { domainSlug, parseDomainPage } from '../domains';
import { isClean } from '../report';
import { run } from '../run';
import { domainRecipe } from './domain';
import { FIRE_HTML, todos } from './domain.fixtures';

const result = run(domainRecipe, [{ pack: 'journals', documents: todos }]);

describe('parseDomainPage', () => {
  it('lê as duas magias e tira o " Domain" do nome', () => {
    expect(parseDomainPage('Fire Domain', FIRE_HTML)).toEqual({
      name: 'Fire',
      spell: { uuid: 'Compendium.pf2e.spells-srd.Item.oJKZi8OQgmVXHOc0', name: 'Fire Ray' },
      advancedSpell: {
        uuid: 'Compendium.pf2e.spells-srd.Item.y7Tusv3CieZktkkV',
        name: 'Flame Barrier',
      },
    });
  });

  /* Página sem " Domain" no título não é domínio — é introdução, índice, o que for. */
  it('ignora página que não é domínio', () => {
    expect(parseDomainPage('Introduction', '<p>…</p>')).toBeNull();
  });

  it('o slug casa com o que a divindade guarda', () => {
    expect(domainSlug('Fire')).toBe('fire');
    expect(domainSlug('Nothingness')).toBe('nothingness');
  });
});

describe('receita de domain', () => {
  it('um jornal vira uma entidade por página de domínio, e os outros jornais somem', () => {
    expect(result.failures).toEqual([]);
    expect(result.entities.map((e) => e.base.name).sort()).toEqual(['Fire', 'Zeal']);
    expect(result.report.unmapped, JSON.stringify(result.report.unmapped)).toEqual([]);
    expect(isClean(result.report)).toBe(true);
  });

  /* O UUID é sintetizado na forma canônica de página, e é o que a ponte por UUID usa. */
  it('sintetiza o UUID canônico da página', () => {
    const fire = result.entities.find((e) => e.base.name === 'Fire');
    expect(fire?.identity).toEqual({
      id: 'fire',
      uuid: 'Compendium.pf2e.journals.JournalEntry.EEZvDB1Z7ezwaxIr.JournalEntryPage.egSErNozlL3HRK1y',
      type: 'domain',
    });
  });

  /* A página inteira é a descrição: as divindades ficam lá, já como `@UUID` clicáveis. */
  it('a descrição é a página inteira', () => {
    const fire = result.entities.find((e) => e.base.name === 'Fire');
    expect(fire?.desc.main).toBe(FIRE_HTML);
  });
});
