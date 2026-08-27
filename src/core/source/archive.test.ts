import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';

import { ArchiveError, listEntries, readEntries, readTextEntry } from './archive';

const zip = zipSync(
  {
    'packs/conditions.json': strToU8(JSON.stringify([{ name: 'Blinded' }])),
    'packs/feats.json': strToU8(JSON.stringify([{ name: 'Power Attack' }])),
    'lang/en.json': strToU8('{"PF2E":{}}'),
  },
  { level: 6 },
);

describe('listEntries', () => {
  it('lê nome e tamanho descomprimido de cada arquivo', () => {
    const entries = listEntries(zip);
    expect(entries.map((entry) => entry.name).sort()).toEqual([
      'lang/en.json',
      'packs/conditions.json',
      'packs/feats.json',
    ]);
    const conditions = entries.find((entry) => entry.name === 'packs/conditions.json');
    expect(conditions?.size).toBe(JSON.stringify([{ name: 'Blinded' }]).length);
  });

  it('descarta entradas de diretório', () => {
    const withDir = zipSync({ 'packs/': strToU8(''), 'packs/a.json': strToU8('[]') });
    expect(listEntries(withDir).map((entry) => entry.name)).toEqual(['packs/a.json']);
  });

  it('falha com erro nomeado quando os bytes não são um zip', () => {
    expect(() => listEntries(new Uint8Array([1, 2, 3, 4]))).toThrow(ArchiveError);
  });
});

describe('readEntries', () => {
  it('descomprime só o que foi pedido', () => {
    const result = readEntries(zip, ['packs/feats.json']);
    expect([...result.keys()]).toEqual(['packs/feats.json']);
  });

  it('acusa entrada inexistente em vez de devolver vazio em silêncio', () => {
    expect(() => readEntries(zip, ['packs/spells.json'])).toThrow(/ausentes.*spells/s);
  });
});

describe('readTextEntry', () => {
  it('decodifica como UTF-8', () => {
    expect(JSON.parse(readTextEntry(zip, 'packs/feats.json'))).toEqual([{ name: 'Power Attack' }]);
  });
});
