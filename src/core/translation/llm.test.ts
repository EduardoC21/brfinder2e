import { describe, expect, it } from 'vitest';

import { buildPrompt, createLlmProvider, pickDefaultModel, unfence, type LlmChat } from './llm';

describe('o provedor de modelo de linguagem', () => {
  it('lista os termos numerados no prompt, e a volta põe o termo da comunidade', async () => {
    const pedidos: { model: string; system: string; user: string }[] = [];
    const chat: LlmChat = {
      models: () => Promise.resolve([]),
      complete: (r) => {
        pedidos.push(r);
        /* O modelo escreve o termo dentro do span (ou não — a volta descarta o conteúdo). */
        return Promise.resolve(
          '```html\n<p>Faça um <span translate="no" i="1">Golpe</span> contra <x-ref i="1">Fireball</x-ref> por <x-tok i="2"></x-tok> de dano.</p>\n```',
        );
      },
    };
    const provedor = createLlmProvider(
      chat,
      () => Promise.resolve({ model: 'gemini-x', hasKey: true }),
      {
        phrases: [{ en: 'Strike', pt: 'Golpe', exact: true }],
        nameOf: (label) => (label === 'Fireball' ? 'Bola de Fogo' : null),
      },
    );
    const out = await provedor.translate({
      language: 'pt-BR',
      entityType: 'spell',
      key: 'k',
      field: 'main',
      html: '<p>Make a Strike against @UUID[Compendium.pf2e.spells-srd.Item.x]{Fireball} for @Damage[2d6[fire]] damage.</p>',
    });
    expect(out).toBe(
      '<p>Faça um Golpe contra @UUID[Compendium.pf2e.spells-srd.Item.x]{Bola de Fogo} por @Damage[2d6[fire]] de dano.</p>',
    );
    expect(pedidos[0]?.model).toBe('gemini-x');
    expect(pedidos[0]?.user).toContain('TERMOS:\n1: Golpe');
    expect(pedidos[0]?.user).toContain('<span translate="no" i="1">Strike</span>');
  });

  it('sem chave é "precisa configurar"; com chave, pronto', async () => {
    const chat: LlmChat = {
      complete: () => Promise.resolve(''),
      models: () => Promise.resolve([]),
    };
    const sem = createLlmProvider(chat, () => Promise.resolve({ model: 'm', hasKey: false }));
    const com = createLlmProvider(chat, () => Promise.resolve({ model: 'm', hasKey: true }));
    expect((await sem.availability('pt-BR')).kind).toBe('needs-setup');
    expect((await com.availability('pt-BR')).kind).toBe('ready');
  });

  it('tira a cerca de código, e o prompt sem termos diz "(nenhum)"', () => {
    expect(unfence('```html\n<p>x</p>\n```')).toBe('<p>x</p>');
    expect(unfence('<p>x</p>')).toBe('<p>x</p>');
    expect(buildPrompt('<p>x</p>', []).user).toContain('(nenhum)');
  });
});

describe('pickDefaultModel', () => {
  const lista = [
    { id: 'gemini-3.1-pro', label: 'Pro' },
    { id: 'gemini-3.1-flash-lite', label: 'Lite' },
    { id: 'gemini-3.1-flash', label: 'Flash' },
  ];
  it('mantém o guardado se existe; senão um flash sem lite; senão o primeiro', () => {
    expect(pickDefaultModel(lista, 'gemini-3.1-pro')).toBe('gemini-3.1-pro');
    expect(pickDefaultModel(lista, 'gemini-2.5-flash')).toBe('gemini-3.1-flash');
    expect(pickDefaultModel([{ id: 'gemini-x', label: 'x' }], 'nada')).toBe('gemini-x');
    expect(pickDefaultModel([], 'nada')).toBeNull();
  });
});
