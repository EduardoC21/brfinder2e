import { describe, expect, it } from 'vitest';

import { distanceFeet } from './distance';

describe('distanceFeet', () => {
  it('lê o formato comum: número e unidade', () => {
    expect(distanceFeet('30 feet')).toBe(30);
    expect(distanceFeet('60 ft')).toBe(60);
  });

  it('converte milha em pés', () => {
    expect(distanceFeet('1 mile')).toBe(5280);
    expect(distanceFeet('100 miles')).toBe(528_000);
  });

  it('aceita vírgula de milhar', () => {
    expect(distanceFeet('1,000 feet')).toBe(1000);
  });

  it('acha o número no meio da frase, com ou sem hífen', () => {
    expect(distanceFeet('1-mile-radius circle centered on you')).toBe(5280);
    expect(distanceFeet('emanation up to 40-feet')).toBe(40);
    expect(distanceFeet('30 feet (burst only)')).toBe(30);
  });

  it('toque é ZERO, e não ausência — em qualquer caixa', () => {
    expect(distanceFeet('touch')).toBe(0);
    expect(distanceFeet('Touch')).toBe(0);
  });

  it('número seco é em pés', () => {
    expect(distanceFeet('30')).toBe(30);
  });

  it('devolve nulo quando não há número nenhum', () => {
    expect(distanceFeet('')).toBeNull();
    expect(distanceFeet('varies')).toBeNull();
    expect(distanceFeet('planetary')).toBeNull();
    expect(distanceFeet('half your Speed')).toBeNull();
  });
});
