import { describe, expect, it } from 'vitest';

import { missingMarks } from './marks';

describe('a trava das marcas do editor', () => {
  const original =
    '<p>@UUID[Compendium.pf2e.spells-srd.Item.x]{Fireball} deals @Damage[6d6[fire]] twice: @Damage[6d6[fire]].</p>';

  it('aceita o rótulo trocado e a ordem trocada; recusa marca perdida ou a menos', () => {
    expect(
      missingMarks(
        original,
        '<p>@Damage[6d6[fire]] e @Damage[6d6[fire]] de @UUID[Compendium.pf2e.spells-srd.Item.x]{Bola de Fogo}</p>',
      ),
    ).toEqual([]);
    expect(missingMarks(original, '<p>Bola de Fogo causa @Damage[6d6[fire]].</p>')).toEqual([
      '@UUID[Compendium.pf2e.spells-srd.Item.x]',
      '@Damage[6d6[fire]]',
    ]);
    /* Marca a MAIS não é erro: a pessoa pode citar um link de novo. */
    expect(missingMarks('<p>x</p>', '<p>@Damage[1d4[fire]]</p>')).toEqual([]);
  });
});
