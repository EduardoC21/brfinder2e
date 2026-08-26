import { describe, expect, it } from 'vitest';

/**
 * Prova da Etapa 0: o projeto de teste do nucleo roda em Node puro.
 * Se alguem trocar o ambiente para jsdom sem querer, este teste acusa.
 */
describe('ambiente do nucleo', () => {
  it('roda sem DOM', () => {
    expect(typeof globalThis.document).toBe('undefined');
  });
});
