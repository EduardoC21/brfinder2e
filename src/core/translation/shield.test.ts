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
      '<p class="Strike">Make a <span translate="no">Golpe</span>. A strike hits. <em><span translate="no">Fortitude</span></em> save.</p>',
    );
    /* Ao refazer, o invólucro some e o termo fica. */
    expect(s.restore(s.text)).toBe(
      '<p class="Strike">Make a Golpe. A strike hits. <em>Fortitude</em> save.</p>',
    );
  });

  it('o termo mais longo vence o mais curto', () => {
    const s = shield('<p>a saving throw and a throw</p>', {
      phrases: [
        { en: 'throw', pt: 'arremesso' },
        { en: 'saving throw', pt: 'salvamento' },
      ],
    });
    expect(s.text).toBe(
      '<p>a <span translate="no">salvamento</span> and a <span translate="no">arremesso</span></p>',
    );
  });

  it('o rótulo que o pacote conhece entra pronto e protegido', () => {
    const s = shield(`<p>${uuid}</p>`, {
      nameOf: (label) => (label === 'Fireball' ? 'Bola de Fogo' : null),
    });
    expect(s.text).toBe('<p><x-ref i="1"><span translate="no">Bola de Fogo</span></x-ref></p>');
    expect(s.restore(s.text)).toContain('{Bola de Fogo}');
  });
});

describe('o glossário fixo', () => {
  it('não tem termo repetido em caixa diferente — a passada única exige', async () => {
    const { CORE_PHRASES } = await import('./phrases');
    const chaves = CORE_PHRASES.map((p) => p.en.toLowerCase());
    expect(new Set(chaves).size).toBe(chaves.length);
  });
});
