import { describe, expect, it } from 'vitest';

import { createMemoryStore } from '../store/memory';
import { sourceHash } from '../store/translations';
import {
  acceptedTranslation,
  centralBase,
  marksOf,
  newSenderId,
  offeredFor,
  readCentral,
  refreshCentral,
  submitTranslation,
  type CentralPort,
} from './central';

function porta(respostas: Record<string, unknown>, enviados: unknown[] = []): CentralPort {
  return {
    getJson: (url) => {
      const chave = Object.keys(respostas).find((fim) => url.endsWith(fim));
      return chave === undefined
        ? Promise.reject(new Error(`404 ${url}`))
        : Promise.resolve(respostas[chave]);
    },
    postJson: (url, body) => {
      enviados.push({ url, body });
      return Promise.resolve({ id: 1 });
    },
    delete: () => Promise.resolve({}),
  };
}

describe('a central, do lado do app', () => {
  it('baixa o pacote de um tipo, guarda por chave e campo, e oferece só pelo original certo', async () => {
    const store = createMemoryStore();
    const original = '<p>Make a Strike.</p>';
    const port = porta({
      '/v1/translations/pt-BR/feat': {
        items: [
          {
            id: 7,
            key: 'k1',
            field: 'main',
            sourceHash: sourceHash(original),
            html: '<p>Faça um Golpe.</p>',
            method: 'llm',
            model: 'm',
            senderName: 'Edu',
            createdAt: '2026-09-15',
            uses: 2,
            candidates: 3,
          },
          {
            id: 8,
            key: 'k1',
            field: 'name',
            sourceHash: sourceHash('Sudden Charge'),
            html: 'Investida Súbita',
            method: 'llm',
            createdAt: '2026-09-15',
          },
          { id: 9, key: 'lixo' },
        ],
      },
    });
    expect(await refreshCentral(port, store, 'https://c', 'pt-BR', 'feat')).toBe(2);
    const oferecidas = await readCentral(store, 'pt-BR', 'feat');
    expect(oferecidas['k1']?.['main']?.candidates).toBe(3);
    expect(offeredFor(oferecidas, 'k1', 'main', original)?.id).toBe(7);
    /* O texto do Foundry mudou: a candidata velha não serve. */
    expect(offeredFor(oferecidas, 'k1', 'main', '<p>Make two Strikes.</p>')).toBeNull();
    expect(offeredFor(oferecidas, 'k1', 'name', 'Sudden Charge')?.html).toBe('Investida Súbita');
    expect(acceptedTranslation(oferecidas['k1']!['main']!, 'agora').method).toBe('shared');
  });

  it('envia com as marcas do original — a trava que a central confere', async () => {
    const enviados: { url: string; body: unknown }[] = [];
    const port = porta({}, enviados);
    const original =
      '<p>@UUID[Compendium.pf2e.spells-srd.Item.x]{Fireball} for @Damage[2d6[fire]].</p>';
    await submitTranslation(
      port,
      'https://c',
      'pt-BR',
      'spell',
      'k',
      'main',
      original,
      { html: '<p>…</p>', method: 'llm', at: 'x', sourceHash: sourceHash(original) },
      'gemini-flash-latest',
      { id: 'aparelho-000000000001', name: null },
    );
    expect(enviados[0]?.url).toBe('https://c/v1/translations');
    expect((enviados[0]?.body as { marks: string[] }).marks).toEqual([
      '@UUID[Compendium.pf2e.spells-srd.Item.x]',
      '@Damage[2d6[fire]]',
    ]);
  });

  it('a base sem barra no fim; o id anônimo com 24 caracteres do alfabeto', () => {
    expect(centralBase(' https://c.workers.dev/ ')).toBe('https://c.workers.dev');
    expect(marksOf('<p>@Damage[1d6[fire]] and [[/r 1d4]]{x}</p>')).toEqual([
      '@Damage[1d6[fire]]',
      '[[/r 1d4]]',
    ]);
    const id = newSenderId((n) => new Uint8Array(n).map((_, i) => i * 7));
    expect(id).toMatch(/^[A-Za-z0-9_-]{24}$/);
  });
});
