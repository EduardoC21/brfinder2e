import { describe, expect, it } from 'vitest';

import { ShieldError, shield } from './shield';

const uuid = '@UUID[Compendium.pf2e.spells-srd.Item.abcdefghijklmnop]{Fireball}';
const damage = '@Damage[2d6[fire]]';
const roll = '[[/r 1d20+5 #Reflex]]{Reflex save}';

describe('a blindagem', () => {
  it('troca as marcas por elementos e as refaz iguais quando nada muda', () => {
    const html = `<p>Cast ${uuid} for ${damage}. Roll ${roll}.</p>`;
    const s = shield(html);
    expect(s.marks).toBe(3);
    expect(s.text).toBe(
      '<p>Cast <x-ref i="1">Fireball</x-ref> for <x-tok i="2"></x-tok>. Roll <x-ref i="3">Reflex save</x-ref>.</p>',
    );
    expect(s.restore(s.text)).toBe(html);
  });

  it('põe o rótulo traduzido de volta na marca', () => {
    const s = shield(`<p>${uuid}</p>`);
    expect(s.restore('<p><x-ref i="1">Bola de Fogo</x-ref></p>')).toBe(
      '<p>@UUID[Compendium.pf2e.spells-srd.Item.abcdefghijklmnop]{Bola de Fogo}</p>',
    );
  });

  it('falha quando o tradutor engole uma marca', () => {
    const s = shield(`<p>${uuid} and ${damage}</p>`);
    expect(() => s.restore('<p><x-ref i="1">Bola de Fogo</x-ref> e</p>')).toThrow(ShieldError);
    expect(() =>
      s.restore('<p><x-ref i="1">x</x-ref> <x-tok i="2"></x-tok> <x-tok i="9"></x-tok></p>'),
    ).toThrow(ShieldError);
  });

  it('o glossário protege o termo, só em texto, com a caixa do original', () => {
    const s = shield(
      '<p class="Strike">Make a Strike. A strike hits. <em>Fortitude</em> save.</p>',
      {
        phrases: [
          { en: 'Strike', pt: 'Golpe', exact: true },
          { en: 'fortitude', pt: 'Fortitude' },
        ],
      },
    );
    expect(s.text).toBe(
      '<p class="Strike">Make a <x-g i="1">Strike</x-g>. A strike hits. <em><x-g i="2">Fortitude</x-g></em> save.</p>',
    );
    /* Ao refazer, o que o tradutor fez com o termo sai, e o da comunidade entra. */
    expect(
      s.restore(
        '<p class="Strike">Faça um <x-g i="1">greve</x-g>. Um golpe acerta. <em><x-g i="2">fortaleza</x-g></em> salvamento.</p>',
      ),
    ).toBe('<p class="Strike">Faça um Golpe. Um golpe acerta. <em>Fortitude</em> salvamento.</p>');
  });

  it('em caixa alta, o termo volta em caixa alta — e o exato aceita', () => {
    const s = shield('<p><strong>Key Attribute: STRENGTH OR DEXTERITY</strong></p>', {
      phrases: [
        { en: 'Strength', pt: 'Força', exact: true },
        { en: 'Dexterity', pt: 'Destreza' },
      ],
    });
    expect(s.restore(s.text)).toBe('<p><strong>Key Attribute: FORÇA OR DESTREZA</strong></p>');
  });

  it('um termo que o tradutor engoliu não é erro: fica o que ele escreveu', () => {
    const s = shield('<p>Make a Strike now.</p>', {
      phrases: [{ en: 'Strike', pt: 'Golpe', exact: true }],
    });
    expect(s.restore('<p>Faça uma greve agora.</p>')).toBe('<p>Faça uma greve agora.</p>');
  });

  it('o termo mais longo vence o mais curto', () => {
    const s = shield('<p>a saving throw and a throw</p>', {
      phrases: [
        { en: 'throw', pt: 'arremesso' },
        { en: 'saving throw', pt: 'salvamento' },
      ],
    });
    expect(s.text).toBe('<p>a <x-g i="1">saving throw</x-g> and a <x-g i="2">throw</x-g></p>');
    expect(s.restore('<p>um <x-g i="1">x</x-g> e um <x-g i="2">y</x-g></p>')).toBe(
      '<p>um salvamento e um arremesso</p>',
    );
  });

  it('o rótulo que o pacote conhece vai em inglês e volta pelo nome', () => {
    const s = shield(`<p>${uuid}</p>`, {
      nameOf: (label) => (label === 'Fireball' ? 'Bola de Fogo' : null),
    });
    expect(s.text).toBe('<p><x-ref i="1">Fireball</x-ref></p>');
    expect(s.restore('<p><x-ref i="1">Bola de fogo qualquer</x-ref></p>')).toContain(
      '{Bola de Fogo}',
    );
  });
});

describe('o glossário fixo', () => {
  it('não tem termo repetido em caixa diferente — a passada única exige', async () => {
    const { CORE_PHRASES } = await import('./phrases');
    const chaves = CORE_PHRASES.map((p) => p.en.toLowerCase());
    expect(new Set(chaves).size).toBe(chaves.length);
  });
});
