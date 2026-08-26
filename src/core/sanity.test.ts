import { describe, expect, it } from 'vitest';

/**
 * Prova da Etapa 0: o projeto de teste do core roda em Node puro.
 * Se alguém trocar o ambiente para jsdom sem querer, este teste acusa.
 */
describe('ambiente do core', () => {
  it('roda sem DOM', () => {
    expect(typeof globalThis.document).toBe('undefined');
  });
});
