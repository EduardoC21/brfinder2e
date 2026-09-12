import { describe, expect, it } from 'vitest';

import { descriptionAlterations } from './alterations';

const language = new Map([
  ['PF2E.SpecificRule.ChangeShape.Anadi', '<p>You change into a spider […]</p>'],
]);

const anadi = {
  system: {
    description: { value: '<p>Anadi people are […]</p>' },
    rules: [
      { key: 'RollOption', option: 'change-shape' },
      {
        itemType: 'action',
        key: 'ItemAlteration',
        mode: 'override',
        predicate: ['item:slug:change-shape'],
        property: 'description',
        value: [{ text: 'PF2E.SpecificRule.ChangeShape.Anadi' }],
      },
      { key: 'GrantItem', uuid: 'Compendium.pf2e.actionspf2e.Item.34E7k2YRcsOU5uyl' },
    ],
  },
};

describe('descriptionAlterations', () => {
  it('lê a alteração estática, com a chave de idioma resolvida', () => {
    expect(descriptionAlterations(anadi, { language })).toEqual([
      {
        targetType: 'action',
        targetSlug: 'change-shape',
        mode: 'override',
        blocks: [{ text: '<p>You change into a spider […]</p>' }],
      },
    ]);
  });

  it('descarta o bloco cuja chave não resolve, e a alteração que fica sem bloco', () => {
    expect(descriptionAlterations(anadi, {})).toEqual([]);
  });

  /* Predicado com estado da ficha não é alvo: uma consulta não sabe se a magia está amplificada. */
  it('ignora o predicado que depende de estado', () => {
    const doc = {
      system: {
        rules: [
          {
            itemType: 'spell',
            key: 'ItemAlteration',
            mode: 'add',
            predicate: ['item:slug:x', 'item:tag:amped'],
            property: 'description',
            value: [{ text: 'literal' }],
          },
        ],
      },
    };
    expect(descriptionAlterations(doc, {})).toEqual([]);
  });

  it('`{item|description}` é a própria descrição de quem concede; título e divisor passam', () => {
    const doc = {
      system: {
        description: { value: '<p>Own text</p>' },
        rules: [
          {
            itemType: 'feat',
            key: 'ItemAlteration',
            mode: 'add',
            predicate: ['item:slug:monster-hunter'],
            property: 'description',
            value: [{ title: 'Monster Warden', text: '{item|description}', divider: true }],
          },
        ],
      },
    };
    expect(descriptionAlterations(doc, {})).toEqual([
      {
        targetType: 'feat',
        targetSlug: 'monster-hunter',
        mode: 'add',
        blocks: [{ text: '<p>Own text</p>', title: 'Monster Warden', divider: true }],
      },
    ]);
  });
});
