import { describe, expect, it } from 'vitest';

import { DEFAULT_CHANNEL, basename } from './channels';
import { buildInventory, sortBySizeDesc, totalPackSize } from './packs';
import type { ArchiveEntry, Manifest } from './types';

const manifest: Manifest = {
  id: 'pf2e',
  version: '8.4.1',
  packs: [
    // Os três casos do briefing 7.2: name != basename(path).
    { name: 'conditionitems', path: 'packs/conditions', label: 'Conditions', type: 'Item' },
    { name: 'feats-srd', path: 'packs/feats', label: 'Feats', type: 'Item' },
    { name: 'classfeatures', path: 'packs/class-features', label: 'Features', type: 'Item' },
  ],
  languages: [{ lang: 'en', name: 'English', path: 'lang/en.json' }],
};

const entries: ArchiveEntry[] = [
  { name: 'packs/conditions.json', size: 300, compressedSize: 30 },
  { name: 'packs/feats.json', size: 900, compressedSize: 90 },
  { name: 'packs/class-features.json', size: 600, compressedSize: 60 },
  { name: 'packs/conditions_folders.json', size: 10, compressedSize: 5 },
  { name: 'lang/en.json', size: 50, compressedSize: 5 },
  { name: 'lang/sf2e-overrides-en.json', size: 20, compressedSize: 4 },
  { name: 'packs/bestiary.json', size: 7, compressedSize: 3 },
];

describe('basename', () => {
  it('é a regra que faz o pack ser achado (briefing 7.2)', () => {
    expect(basename('packs/class-features')).toBe('class-features');
    expect(basename('conditions')).toBe('conditions');
  });
});

describe('buildInventory', () => {
  const inventory = buildInventory(manifest, entries, DEFAULT_CHANNEL);

  it('acha o arquivo pelo path, não pelo name', () => {
    const conditions = inventory.packs.find((pack) => pack.name === 'conditionitems');
    expect(conditions?.file).toBe('packs/conditions.json');
    expect(conditions?.size).toBe(300);
  });

  it('não reporta nada faltando quando tudo casa', () => {
    expect(inventory.missing).toEqual([]);
  });

  it('marca como ausente o pack declarado que não existe no arquivo', () => {
    const semArquivo = buildInventory(manifest, entries.slice(1), DEFAULT_CHANNEL);
    expect(semArquivo.missing).toEqual(['packs/conditions.json']);
    expect(semArquivo.packs[0]?.size).toBeNull();
  });

  it('ignora _folders.json e lang/, mas denuncia pack não declarado', () => {
    // O bestiário existe no zip e não está no manifesto de teste: tem que aparecer.
    expect(inventory.unlisted.map((entry) => entry.name)).toEqual(['packs/bestiary.json']);
  });

  it('cruza os arquivos de idioma', () => {
    expect(inventory.languages).toEqual([{ lang: 'en', path: 'lang/en.json', size: 50 }]);
  });
});

describe('totalPackSize e sortBySizeDesc', () => {
  const inventory = buildInventory(manifest, entries, DEFAULT_CHANNEL);

  it('soma só os packs, não as entradas avulsas', () => {
    expect(totalPackSize(inventory)).toBe(1800);
  });

  it('ordena do maior para o menor sem mexer no array original', () => {
    const sorted = sortBySizeDesc(inventory.packs);
    expect(sorted.map((pack) => pack.name)).toEqual([
      'feats-srd',
      'classfeatures',
      'conditionitems',
    ]);
    expect(inventory.packs[0]?.name).toBe('conditionitems');
  });
});
