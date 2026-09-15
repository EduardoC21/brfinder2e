import { describe, expect, it } from 'vitest';

import {
  displayName,
  setNameTable,
  translatedLabel,
  translatedName,
  translatedNameOf,
} from './text';

describe('a tabela de nomes', () => {
  it('displayName segue a preferência; translatedName e translatedLabel, não', () => {
    setNameTable({ condition: { Enfeebled: 'Enfraquecido' } }, false);
    expect(displayName('condition', 'Enfeebled')).toBe('Enfeebled');
    expect(translatedName('condition', 'Enfeebled')).toBe('Enfraquecido');
    /* O rótulo que é o nome, ou o nome com o valor atrás; o resto fica. */
    expect(translatedLabel('condition', 'Enfeebled', 'Enfeebled')).toBe('Enfraquecido');
    expect(translatedLabel('condition', 'Enfeebled', 'Enfeebled 2')).toBe('Enfraquecido 2');
    expect(translatedLabel('condition', 'Enfeebled', 'enfeebled')).toBe('enfeebled');
    expect(translatedLabel('spell', 'Fireball', 'Fireball')).toBe('Fireball');
    /* Sem o tipo, como a blindagem pergunta. */
    expect(translatedNameOf('Enfeebled')).toBe('Enfraquecido');
    expect(translatedNameOf('Fireball')).toBeNull();

    setNameTable({ condition: { Enfeebled: 'Enfraquecido' } }, true);
    expect(displayName('condition', 'Enfeebled')).toBe('Enfraquecido');
    expect(displayName('condition', 'Dying')).toBe('Dying');
  });
});
