import { describe, expect, it } from 'vitest';

import { collectPaths, emptyCoverage, isCovered, readPath } from './paths';

describe('readPath', () => {
  const doc = { system: { value: { isValued: true }, group: null } };

  it('lê caminho aninhado', () => {
    expect(readPath(doc, 'system.value.isValued')).toEqual({ found: true, value: true });
  });

  it('distingue ausente de presente valendo null', () => {
    expect(readPath(doc, 'system.group')).toEqual({ found: true, value: null });
    expect(readPath(doc, 'system.nada')).toEqual({ found: false, value: undefined });
  });

  it('não explode ao atravessar um não-objeto', () => {
    expect(readPath(doc, 'system.value.isValued.demais').found).toBe(false);
  });
});

describe('collectPaths', () => {
  it('lista folhas, não nós intermediários', () => {
    const paths = collectPaths({ a: { b: 1, c: 'x' } });
    expect([...paths.keys()]).toEqual(['a.b', 'a.c']);
  });

  it('trata array vazio como folha — o caminho existe', () => {
    const paths = collectPaths({ traits: { value: [] } });
    expect([...paths.keys()]).toEqual(['traits.value']);
    expect(paths.get('traits.value')).toEqual([]);
  });

  it('desce em array com a notação []', () => {
    const paths = collectPaths({ rules: [{ key: 'FlatModifier', value: -1 }] });
    expect([...paths.keys()]).toEqual(['rules[].key', 'rules[].value']);
  });

  // É o mecanismo que o briefing (5.1) credita por ter pego system.subfeatures.
  it('percorre TODOS os elementos, achando a chave que só existe em um', () => {
    const paths = collectPaths({
      rules: [{ key: 'A' }, { key: 'B' }, { key: 'C', subfeatures: { proficiency: 3 } }],
    });
    expect([...paths.keys()]).toContain('rules[].subfeatures.proficiency');
  });

  it('acumula em vários documentos', () => {
    const into = collectPaths({ a: 1 });
    collectPaths({ b: 2 }, into);
    expect([...into.keys()].sort()).toEqual(['a', 'b']);
  });
});

describe('isCovered', () => {
  it('subtree cobre tudo abaixo', () => {
    const coverage = emptyCoverage();
    coverage.subtree.add('system.publication');
    expect(isCovered('system.publication.license', coverage)).toBe(true);
    expect(isCovered('system.publication', coverage)).toBe(true);
    expect(isCovered('system.outro', coverage)).toBe(false);
  });

  it('exact cobre só o caminho, não os filhos', () => {
    const coverage = emptyCoverage();
    coverage.exact.add('system.publication');
    expect(isCovered('system.publication', coverage)).toBe(true);
    expect(isCovered('system.publication.remaster', coverage)).toBe(false);
  });

  it('subtree num caminho cobre a notação de array abaixo dele', () => {
    const coverage = emptyCoverage();
    coverage.subtree.add('system.traits.value');
    expect(isCovered('system.traits.value[]', coverage)).toBe(true);
  });

  it('não confunde prefixo de nome com prefixo de caminho', () => {
    const coverage = emptyCoverage();
    coverage.subtree.add('system.value');
    expect(isCovered('system.valueOther', coverage)).toBe(false);
  });
});
