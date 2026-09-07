import { describe, expect, it } from 'vitest';

import { EMPTY_POPOUTS, popoutReducer, type PopoutState } from './popouts';

/* Uma entrada mínima: o reducer só a guarda, nunca a lê. */
function fake(key: string) {
  return { key, base: { name: key } } as never;
}

function abrir(estado: PopoutState, key: string): PopoutState {
  // O painel carrega o próprio tipo e os próprios campos: ele pode vir da busca global,
  // de uma fonte que não é a que está na tela.
  return popoutReducer(estado, {
    kind: 'open',
    entity: fake(key),
    entityType: 'condition',
    fields: [],
  });
}

describe('popoutReducer', () => {
  it('abrir empilha em cascata, sem um painel cobrir o outro', () => {
    const dois = abrir(abrir(EMPTY_POPOUTS, 'a'), 'b');
    expect(dois.items).toHaveLength(2);
    expect(dois.items[1]?.x).toBeGreaterThan(dois.items[0]?.x ?? 0);
    expect(dois.items[1]?.y).toBeGreaterThan(dois.items[0]?.y ?? 0);
  });

  it('a mesma entrada pode ter dois painéis: a identidade é do painel', () => {
    const dois = abrir(abrir(EMPTY_POPOUTS, 'a'), 'a');
    expect(dois.items).toHaveLength(2);
    expect(dois.items[0]?.id).not.toBe(dois.items[1]?.id);
  });

  it('focar traz para a frente sem mexer na ORDEM da lista', () => {
    const dois = abrir(abrir(EMPTY_POPOUTS, 'a'), 'b');
    const primeiro = dois.items[0];
    if (primeiro === undefined) throw new Error('esperava dois painéis');

    const focado = popoutReducer(dois, { kind: 'focus', id: primeiro.id });
    // A ordem é a mesma — é o z que muda. Reordenar moveria o nó no DOM.
    expect(focado.items.map((i) => i.id)).toEqual(dois.items.map((i) => i.id));
    expect(focado.items[0]?.z).toBeGreaterThan(focado.items[1]?.z ?? 0);
  });

  it('focar quem já está na frente não gera estado novo', () => {
    const dois = abrir(abrir(EMPTY_POPOUTS, 'a'), 'b');
    const frente = dois.items[1];
    if (frente === undefined) throw new Error('esperava dois painéis');
    expect(popoutReducer(dois, { kind: 'focus', id: frente.id })).toBe(dois);
  });

  it('fechar o do meio devolve a vaga da cascata', () => {
    const tres = abrir(abrir(abrir(EMPTY_POPOUTS, 'a'), 'b'), 'c');
    const meio = tres.items[1];
    if (meio === undefined) throw new Error('esperava três painéis');

    const restam = popoutReducer(tres, { kind: 'close', id: meio.id });
    const novo = abrir(restam, 'd');
    // Três abertos, um fechado, um aberto: o novo ocupa a terceira posição, não a quarta.
    expect(novo.items[2]?.x).toBe(tres.items[2]?.x);
  });

  it('fechar um painel não move os outros', () => {
    const dois = abrir(abrir(EMPTY_POPOUTS, 'a'), 'b');
    const primeiro = dois.items[0];
    if (primeiro === undefined) throw new Error('esperava dois painéis');
    const restam = popoutReducer(dois, { kind: 'close', id: primeiro.id });
    expect(restam.items[0]).toBe(dois.items[1]);
  });
});
