import { describe, expect, it } from 'vitest';

import { JsonShapeError } from '../json';
import { languageFiles, parseManifest } from './manifest';

const raw = {
  id: 'pf2e',
  version: '8.4.1',
  // Campos que o manifesto real tem e a camada de fonte ignora de propósito.
  title: 'Pathfinder Second Edition',
  compatibility: { minimum: '13', verified: '14' },
  packs: [{ name: 'conditionitems', path: 'packs/conditions', label: 'Conditions', type: 'Item' }],
  languages: [
    { lang: 'en', name: 'English', path: 'lang/en.json' },
    { lang: 'en', name: 'English (RE)', path: 'lang/re-en.json' },
    { lang: 'pt-BR', name: 'Português', path: 'lang/pt-BR.json' },
  ],
};

describe('parseManifest', () => {
  it('lê id, versão, packs e idiomas', () => {
    const manifest = parseManifest(raw);
    expect(manifest.id).toBe('pf2e');
    expect(manifest.version).toBe('8.4.1');
    expect(manifest.packs).toHaveLength(1);
    expect(manifest.packs[0]?.path).toBe('packs/conditions');
  });

  it('nomeia o campo exato quando a forma quebra', () => {
    const quebrado = { ...raw, packs: [{ name: 'x', path: 'y', label: 'z' }] };
    expect(() => parseManifest(quebrado)).toThrow(JsonShapeError);
    expect(() => parseManifest(quebrado)).toThrow(/packs\[0\]\.type: esperado string/);
  });

  it('rejeita payload que nem é objeto', () => {
    expect(() => parseManifest('não é json de manifesto')).toThrow(/system\.json: esperado object/);
  });
});

describe('languageFiles', () => {
  // Briefing 7.7: o inglês tem QUATRO arquivos e o Foundry funde todos. As chaves de
  // prompt dos ChoiceSet moram em re-en.json — ler só o primeiro deixa o painel de
  // escolha mostrando a chave crua.
  it('devolve TODOS os arquivos do idioma, na ordem do manifesto', () => {
    const files = languageFiles(parseManifest(raw), 'en');
    expect(files.map((file) => file.path)).toEqual(['lang/en.json', 'lang/re-en.json']);
  });

  it('devolve vazio para idioma que o sistema não declara', () => {
    expect(languageFiles(parseManifest(raw), 'ja')).toEqual([]);
  });
});
