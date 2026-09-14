import { describe, expect, it } from 'vitest';

import type { HttpPort } from '../source/ports';
import { createMemoryStore } from '../store/memory';
import {
  fetchCommunityPack,
  latestCommunityTag,
  readCommunityMeta,
  readCommunityNames,
  readCommunityTraits,
  writeCommunityPack,
} from './community';

/** Um HTTP de mentira: responde por URL, e falha no que não conhece. */
function http(respostas: Readonly<Record<string, unknown>>): HttpPort {
  return {
    getJson: (url) => {
      const chave = Object.keys(respostas).find((fim) => url.endsWith(fim));
      return chave === undefined
        ? Promise.reject(new Error(`404 ${url}`))
        : Promise.resolve(respostas[chave]);
    },
    getBytes: () => Promise.reject(new Error('não usado')),
  };
}

const tabela = {
  PF2E: {
    TraitAgile: 'Ágil',
    TraitDescriptionAgile: '<p>A penalidade de ataques múltiplos é menor.</p>',
    TraitHumanoid: 'Humanoide',
  },
};

describe('o pacote da comunidade', () => {
  it('lê a tag do último release, e cai em master sem ela', async () => {
    expect(await latestCommunityTag(http({ 'releases/latest': { tag_name: 'v8.1.2.0' } }))).toBe(
      'v8.1.2.0',
    );
    expect(await latestCommunityTag(http({}))).toBe('master');
  });

  it('monta traços, nomes e dicionário; pack que falta não derruba', async () => {
    const pack = await fetchCommunityPack(
      http({
        'pt-BR.json': tabela,
        'dictionary.json': { duration: { '1 minute': '1 minuto' }, lixo: 3 },
        'compendium/pf2e.feats-srd.json': {
          entries: { 'Power Attack': { name: 'Ataque Poderoso', description: 'fora' }, X: {} },
        },
      }),
      'v1',
    );
    expect(pack.tag).toBe('v1');
    /* Só o traço COM descrição entra no glossário — Humanoid tem rótulo e não descrição. */
    expect(Object.keys(pack.traits)).toEqual(['agile']);
    expect(pack.traits['agile']?.label).toBe('Ágil');
    expect(pack.names['feat']).toEqual({ 'Power Attack': 'Ataque Poderoso' });
    expect(pack.names['spell']).toBeUndefined();
    expect(pack.dictionary).toEqual({ duration: { '1 minute': '1 minuto' } });
  });

  it('grava sob trans/<língua>/glossary e lê de volta com a meta', async () => {
    const store = createMemoryStore();
    const meta = await writeCommunityPack(
      store,
      'pt-BR',
      {
        tag: 'v1',
        traits: { agile: { label: 'Ágil', description: 'x' } },
        names: { feat: { A: 'B' }, spell: { C: 'D', E: 'F' } },
        dictionary: {},
      },
      '2026-09-14T12:00:00.000Z',
    );
    expect(meta).toEqual({ tag: 'v1', at: '2026-09-14T12:00:00.000Z', traits: 1, names: 3 });
    expect(await readCommunityMeta(store, 'pt-BR')).toEqual(meta);
    expect(await readCommunityTraits(store, 'pt-BR')).toEqual({
      agile: { label: 'Ágil', description: 'x' },
    });
    expect((await readCommunityNames(store, 'pt-BR'))['spell']).toEqual({ C: 'D', E: 'F' });
    expect([...(await store.keys('trans/'))].sort()).toEqual([
      'trans/pt-BR/glossary/dictionary',
      'trans/pt-BR/glossary/meta',
      'trans/pt-BR/glossary/names',
      'trans/pt-BR/glossary/traits',
    ]);
  });
});
