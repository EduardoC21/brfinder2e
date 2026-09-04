import { describe, expect, it } from 'vitest';

import { decideSync } from './policy';

const PISO = 'pf2e-8.5.0';

const caso = (patch: Partial<Parameters<typeof decideSync>[0]>) =>
  decideSync({
    resolvedTag: 'pf2e-8.6.0',
    failures: 0,
    storedTag: 'pf2e-8.5.0',
    floorTag: PISO,
    ...patch,
  });

describe('decideSync', () => {
  it('a mais nova decodificou limpa: adota', () => {
    expect(caso({})).toEqual({ kind: 'adopt' });
  });

  it('a mais nova falhou e há base: a mesa FICA onde está', () => {
    // É o coração da política: nunca trocar uma base boa por uma pior.
    expect(caso({ failures: 3 })).toEqual({ kind: 'keep', keeping: 'pf2e-8.5.0' });
  });

  it('reparando a MESMA versão gravada, tolera a falha', () => {
    // Recusar aqui prenderia o usuário a uma base corrompida sem poder refazê-la.
    expect(caso({ resolvedTag: 'pf2e-8.5.0', storedTag: 'pf2e-8.5.0', failures: 2 })).toEqual({
      kind: 'adopt',
    });
  });

  it('instalação nova cuja mais nova falhou desce para o piso', () => {
    expect(caso({ storedTag: null, failures: 5 })).toEqual({ kind: 'fallback', tag: PISO });
  });

  it('o piso também falhou e não há nada a perder: grava assim mesmo', () => {
    // Base parcial serve mais que tela vazia, e o relatório mostra quantas falharam.
    expect(caso({ storedTag: null, failures: 5, resolvedTag: PISO })).toEqual({ kind: 'adopt' });
  });

  it('não desce para o piso duas vezes', () => {
    expect(
      caso({ storedTag: null, failures: 5, resolvedTag: 'pf2e-8.6.0', floorTried: true }),
    ).toEqual({ kind: 'adopt' });
  });

  it('a mesa que já está na mais nova e ela continua boa: adota, sem caso especial', () => {
    expect(caso({ resolvedTag: 'pf2e-8.5.0', storedTag: 'pf2e-8.5.0' })).toEqual({
      kind: 'adopt',
    });
  });
});
