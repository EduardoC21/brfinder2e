import { describe, expect, it } from 'vitest';

import { polishPortuguese } from './polish';

describe('o polimento do português', () => {
  it('põe o º nos ordinais que o motor escreve com "o" ou "a", só em texto', () => {
    expect(
      polishPortuguese(
        '<p>No 9o nível; 3o: [x], 4a: [y]. Página 10a</p><p class="4o">@UUID[Compendium.x.Item.4o]{5o lugar}</p>',
      ),
    ).toBe(
      '<p>No 9º nível; 3º: [x], 4º: [y]. Página 10º</p><p class="4o">@UUID[Compendium.x.Item.4o]{5o lugar}</p>',
    );
  });

  it('não mexe em número seguido de letra que não é ordinal', () => {
    expect(polishPortuguese('<p>1d6 e 2d8, 10 pés, versão 2a1</p>')).toBe(
      '<p>1d6 e 2d8, 10 pés, versão 2a1</p>',
    );
  });
});
