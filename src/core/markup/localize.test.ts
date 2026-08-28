import { describe, expect, it } from 'vitest';

import { expandLocalize } from './localize';

const tabela = new Map([
  [
    'PF2E.condition.sickened.rules',
    '<p>You feel ill. Sickened always includes a value.</p><p>You can spend a single action.</p>',
  ],
  ['PF2E.encadeada', 'antes @Localize[PF2E.condition.sickened.rules] depois'],
  ['PF2E.ciclo', 'volta @Localize[PF2E.ciclo]'],
]);

describe('expandLocalize', () => {
  it('a descrição da Sickened é SÓ um @Localize, e sem expandir ela é vazia', () => {
    expect(expandLocalize('<p>@Localize[PF2E.condition.sickened.rules]</p>', tabela)).toContain(
      'You feel ill',
    );
  });

  it('o texto ao redor fica intacto', () => {
    expect(expandLocalize('a @Localize[PF2E.ausente] b', tabela)).toBe(
      'a @Localize[PF2E.ausente] b',
    );
  });

  it('chave ausente fica visível em vez de virar silêncio', () => {
    // String vazia esconderia o problema; a chave crua na tela denuncia.
    expect(expandLocalize('@Localize[PF2E.nao.existe]', tabela)).toBe('@Localize[PF2E.nao.existe]');
  });

  it('cadeia expande até o fim', () => {
    expect(expandLocalize('@Localize[PF2E.encadeada]', tabela)).toContain('You feel ill');
  });

  it('ciclo para em vez de estourar a pilha', () => {
    expect(expandLocalize('@Localize[PF2E.ciclo]', tabela)).toContain('volta');
  });

  it('texto sem @Localize sai idêntico, sem pagar o parse', () => {
    expect(expandLocalize('<p>nada aqui</p>', tabela)).toBe('<p>nada aqui</p>');
  });
});
