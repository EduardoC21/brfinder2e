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

  it('o rótulo que ninguém conhece fica no original — nome próprio não se adivinha', () => {
    const s = shield(`<p>${uuid}</p>`);
    expect(s.restore('<p><x-ref i="1">Bola de Fogo (em inglês)</x-ref></p>')).toBe(
      '<p>@UUID[Compendium.pf2e.spells-srd.Item.abcdefghijklmnop]{Fireball}</p>',
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
      '<p class="Strike">Make a <span translate="no" i="1">Strike</span>. A strike hits. <em><span translate="no" i="2">Fortitude</span></em> save.</p>',
    );
    /* Ao refazer, o que o tradutor fez com o termo sai, e o da comunidade entra. */
    expect(
      s.restore(
        '<p class="Strike">Faça um <span translate="no" i="1">greve</span>. Um golpe acerta. <em><span translate="no" i="2">fortaleza</span></em> salvamento.</p>',
      ),
    ).toBe('<p class="Strike">Faça um Golpe. Um golpe acerta. <em>Fortitude</em> salvamento.</p>');
  });

  it('original em minúscula → termo em minúscula, mesmo que o pacote capitalize', () => {
    const s = shield('<p>the same AC and saves as you; a reactive strike</p>', {
      phrases: [
        { en: 'AC', pt: 'CA', exact: true },
        { en: 'saves', pt: 'Salvamentos' },
        { en: 'Reactive Strike', pt: 'Golpe Reativo' },
      ],
    });
    expect(s.restore(s.text)).toBe('<p>the same CA and salvamentos as you; a golpe reativo</p>');
  });

  it('capitaliza só quando a maiúscula é da frase, não do termo', () => {
    const s = shield('<p>Saving throw. Your Reflex saves improve.</p>', {
      phrases: [
        { en: 'saving throw', pt: 'salvamento' },
        { en: 'Reflex saves', pt: 'salvamentos de Reflexos' },
      ],
    });
    expect(s.restore(s.text)).toBe('<p>Salvamento. Your salvamentos de Reflexos improve.</p>');
  });

  it('o ordinal inglês vai protegido e volta com º', () => {
    const s = shield('<p>a 5th-rank spell at 17th level, 1st and 2nd</p>');
    expect(s.text).toBe(
      '<p>a <span translate="no" i="1">5th</span>-rank spell at <span translate="no" i="2">17th</span> level, <span translate="no" i="3">1st</span> and <span translate="no" i="4">2nd</span></p>',
    );
    expect(s.restore(s.text)).toBe('<p>a 5º-rank spell at 17º level, 1º and 2º</p>');
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

  it('dois termos colados pelo tradutor voltam com espaço, e o rótulo aceita termo logo depois', () => {
    const s = shield('<p><strong>Bloodline Skills</strong> Nature; void healing</p>', {
      phrases: [
        { en: 'Nature', pt: 'Natureza' },
        { en: 'void', pt: 'vazio' },
        { en: 'healing', pt: 'cura' },
      ],
    });
    expect(s.text).toContain('<x-lab i="1">Bloodline Skills</x-lab>');
    expect(
      s.restore(
        '<p><x-lab i="1">Perícias</x-lab> <span translate="no" i="1">Nature</span>; <span translate="no" i="2">void</span><span translate="no" i="3">healing</span></p>',
      ),
    ).toBe('<p><strong>Perícias</strong> Natureza; vazio cura</p>');
  });

  it('o termo mais longo vence o mais curto', () => {
    const s = shield('<p>a saving throw and a throw</p>', {
      phrases: [
        { en: 'throw', pt: 'arremesso' },
        { en: 'saving throw', pt: 'salvamento' },
      ],
    });
    expect(s.text).toBe(
      '<p>a <span translate="no" i="1">saving throw</span> and a <span translate="no" i="2">throw</span></p>',
    );
    expect(
      s.restore(
        '<p>um <span translate="no" i="1">x</span> e um <span translate="no" i="2">y</span></p>',
      ),
    ).toBe('<p>um salvamento e um arremesso</p>');
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

  it('o rótulo que o glossário conhece inteiro volta pelo glossário', () => {
    const s = shield('<p>@UUID[Compendium.pf2e.actionspf2e.Item.x]{Strike} now</p>', {
      phrases: [{ en: 'Strike', pt: 'Golpe', exact: true }],
    });
    expect(s.text).toBe('<p><x-ref i="1">Strike</x-ref> now</p>');
    expect(s.restore('<p><x-ref i="1">greve</x-ref> agora</p>')).toBe(
      '<p>@UUID[Compendium.pf2e.actionspf2e.Item.x]{Golpe} agora</p>',
    );
  });

  it('o ". ." que o motor deixa depois de uma marca vira "."', () => {
    const s = shield(`<p>Cast ${uuid}. Then ${damage}.</p>`);
    expect(
      s.restore('<p>Conjure <x-ref i="1">Bola</x-ref>. . Então <x-tok i="2"></x-tok>. .</p>'),
    ).toBe(`<p>Conjure ${uuid}. Então ${damage}.</p>`);
  });

  it('protege o número com sinal, resolve "Nome 1" pelo nome, e aceita termo dentro do rótulo', () => {
    const s = shield(
      '<p><strong>Bloodline Skills</strong> Nature. You take a –4 penalty and are @UUID[Compendium.pf2e.conditionitems.Item.x]{Enfeebled 2}.</p>',
      {
        phrases: [{ en: 'Skills', pt: 'Perícias' }],
        nameOf: (label) => (label === 'Enfeebled' ? 'Enfraquecido' : null),
      },
    );
    expect(s.text).toBe(
      '<p><x-lab i="1">Bloodline <span translate="no" i="1">Skills</span></x-lab> Nature. You take a <span translate="no" i="2">–4</span> penalty and are <x-ref i="1">Enfeebled 2</x-ref>.</p>',
    );
    expect(
      s.restore(
        '<p><x-lab i="1">Linhagem <span translate="no" i="1">Skills</span></x-lab> Natureza. Você sofre uma penalidade de <span translate="no" i="2">4 euros</span> e fica <x-ref i="1">Enfeebled 2</x-ref>.</p>',
      ),
    ).toBe(
      '<p><strong>Linhagem Perícias</strong> Natureza. Você sofre uma penalidade de –4 e fica @UUID[Compendium.pf2e.conditionitems.Item.x]{Enfraquecido 2}.</p>',
    );
  });

  it('devolve o espaço que o tradutor engole depois da marca, e tira o termo duplicado', () => {
    const s = shield(`<p>takes ${damage} damage and a Strike</p>`, {
      phrases: [{ en: 'Strike', pt: 'Golpe', exact: true }],
    });
    expect(
      s.restore(
        '<p>leva  <x-tok i="1"></x-tok>dano e um <span translate="no" i="1">Strike</span> <span translate="no" i="1">Strike</span></p>',
      ),
    ).toBe(`<p>leva  ${damage} dano e um Golpe </p>`);
  });

  it('o rótulo de bloco vira bloco para o tradutor e volta negrito', () => {
    const s = shield(
      '<p><strong>Trigger</strong> A creature moves. <strong>Effect</strong> You Strike.</p><p>You gain a <strong>+2 bonus</strong> to hit.</p><li><strong>Sacred Animal</strong> fox</li>',
    );
    expect(s.text).toBe(
      '<p><x-lab i="1">Trigger</x-lab> A creature moves. <x-lab i="2">Effect</x-lab> You Strike.</p><p>You gain a <strong><span translate="no" i="1">+2</span> bonus</strong> to hit.</p><li><x-lab i="3">Sacred Animal</x-lab> fox</li>',
    );
    expect(
      s.restore(
        '<p><x-lab i="1">Gatilho</x-lab> Uma criatura se move. <x-lab i="2">Efeito</x-lab> Você golpeia.</p><p>Você ganha um <strong>bônus de +2</strong> para acertar.</p><li><x-lab i="3">Animal Sagrado</x-lab> raposa</li>',
      ),
    ).toBe(
      '<p><strong>Gatilho</strong> Uma criatura se move. <strong>Efeito</strong> Você golpeia.</p><p>Você ganha um <strong>bônus de +2</strong> para acertar.</p><li><strong>Animal Sagrado</strong> raposa</li>',
    );
    /* Um rótulo que sumiu é texto perdido: falha. */
    expect(() => s.restore('<p>Uma criatura se move.</p>')).toThrow(ShieldError);
  });
});

describe('o glossário fixo', () => {
  it('não tem termo repetido em caixa diferente — a passada única exige', async () => {
    const { CORE_PHRASES } = await import('./phrases');
    const chaves = CORE_PHRASES.map((p) => p.en.toLowerCase());
    expect(new Set(chaves).size).toBe(chaves.length);
  });
});
