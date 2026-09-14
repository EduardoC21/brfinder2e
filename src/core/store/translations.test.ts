import { describe, expect, it } from 'vitest';

import { createMemoryStore } from './memory';
import {
  deleteTranslation,
  readTranslations,
  sourceHash,
  translationKeys,
  writeTranslation,
} from './translations';

const agora = '2026-09-14T12:00:00.000Z';

describe('a camada de traduções', () => {
  it('grava por língua e tipo, e lê de volta com a origem', async () => {
    const store = createMemoryStore();
    await writeTranslation(store, 'pt-BR', 'spell', 'abc', 'main', {
      html: '<p>Cura.</p>',
      method: 'llm',
      at: agora,
      sourceHash: sourceHash('<p>Heal.</p>'),
    });
    const lidas = await readTranslations(store, 'pt-BR', 'spell');
    expect(lidas['abc']?.['main']?.method).toBe('llm');
    expect(await translationKeys(store)).toEqual(['trans/pt-BR/spell']);
    /* Outra língua é outro conjunto. */
    expect(await readTranslations(store, 'es', 'spell')).toEqual({});
  });

  it('a manual nunca é sobrescrita por outra forma', async () => {
    const store = createMemoryStore();
    const base = { at: agora, sourceHash: sourceHash('x') };
    await writeTranslation(store, 'pt-BR', 'feat', 'k', 'main', {
      ...base,
      html: 'minha',
      method: 'manual',
    });
    await writeTranslation(store, 'pt-BR', 'feat', 'k', 'main', {
      ...base,
      html: 'máquina',
      method: 'local',
    });
    expect((await readTranslations(store, 'pt-BR', 'feat'))['k']?.['main']?.html).toBe('minha');
    /* Mas a manual substitui a manual. */
    await writeTranslation(store, 'pt-BR', 'feat', 'k', 'main', {
      ...base,
      html: 'corrigida',
      method: 'manual',
    });
    expect((await readTranslations(store, 'pt-BR', 'feat'))['k']?.['main']?.html).toBe('corrigida');
  });

  it('ignora o que está gravado numa forma que não é a de hoje', async () => {
    const store = createMemoryStore();
    await store.put('trans/pt-BR/spell', { abc: { main: { html: 1 }, page: 'texto' }, zzz: 3 });
    expect(await readTranslations(store, 'pt-BR', 'spell')).toEqual({});
  });

  it('a impressão digital muda com o texto e é estável', () => {
    expect(sourceHash('a')).toBe(sourceHash('a'));
    expect(sourceHash('a')).not.toBe(sourceHash('b'));
    expect(sourceHash('')).toHaveLength(8);
  });
});

describe('deleteTranslation', () => {
  it('tira um campo; a entrada some quando fica sem campos; o resto fica', async () => {
    const store = createMemoryStore();
    const t = (html: string) => ({ html, method: 'manual' as const, at: 'x', sourceHash: 'h' });
    await writeTranslation(store, 'pt-BR', 'spell', 'a', 'main', t('a-main'));
    await writeTranslation(store, 'pt-BR', 'spell', 'a', 'page', t('a-page'));
    await writeTranslation(store, 'pt-BR', 'spell', 'b', 'main', t('b-main'));
    await deleteTranslation(store, 'pt-BR', 'spell', 'a', 'main');
    expect(Object.keys((await readTranslations(store, 'pt-BR', 'spell'))['a'] ?? {})).toEqual([
      'page',
    ]);
    await deleteTranslation(store, 'pt-BR', 'spell', 'a', 'page');
    const depois = await readTranslations(store, 'pt-BR', 'spell');
    expect(Object.keys(depois)).toEqual(['b']);
    /* Apagada a manual, a máquina volta a poder gravar. */
    await writeTranslation(store, 'pt-BR', 'spell', 'a', 'main', { ...t('llm'), method: 'llm' });
    expect((await readTranslations(store, 'pt-BR', 'spell'))['a']?.['main']?.html).toBe('llm');
  });
});
