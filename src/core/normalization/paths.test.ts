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
  /**
   * Registra a folha E o nó que a contém. O nó de passagem não polui o relatório porque
   * `isCovered` o considera coberto quando algo dentro dele foi lido — ver o teste lá
   * embaixo. Sem registrar o nó, um campo presente em 8 documentos aparecia como "2/574".
   */
  it('lista as folhas e os nós que as contêm', () => {
    const paths = collectPaths({ a: { b: 1, c: 'x' } });
    expect([...paths.keys()]).toEqual(['a', 'a.b', 'a.c']);
  });

  it('trata array vazio como folha — o caminho existe', () => {
    const paths = collectPaths({ traits: { value: [] } });
    expect([...paths.keys()]).toEqual(['traits', 'traits.value']);
    expect(paths.get('traits.value')).toEqual([]);
  });

  it('desce em array com a notação [], sem perder o caminho do próprio array', () => {
    const paths = collectPaths({ rules: [{ key: 'FlatModifier', value: -1 }] });
    expect([...paths.keys()]).toEqual(['rules', 'rules[]', 'rules[].key', 'rules[].value']);
  });

  /**
   * Regressão. Antes disto, um campo presente nos 43 documentos aparecia no relatório
   * como "35/43" (os que tinham array vazio) mais uma linha "[]" separada — e a leitura
   * óbvia, "falta em 8 documentos", era falsa.
   */
  it('conta o array cheio e o vazio no MESMO caminho', () => {
    const into = collectPaths({ overrides: [] });
    collectPaths({ overrides: ['hostile'] }, into);
    expect([...into.keys()].sort()).toEqual(['overrides', 'overrides[]']);
    // e o exemplo guardado é o preenchido, não o vazio
    expect(into.get('overrides')).toEqual(['hostile']);
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

/**
 * Regressão irmã da do array, achada ao rodar a receita de `action`.
 *
 * `system.traits.selected` existe em 8 documentos, mas aparecia como "2/574" — os dois em
 * que o objeto estava VAZIO. Nos outros seis o inventário descia nos filhos e não
 * registrava o pai, então a leitura óbvia era que o campo mal existia.
 */
describe('objeto intermediário no inventário', () => {
  it('conta o objeto cheio e o vazio no MESMO caminho', () => {
    const into = collectPaths({ traits: { selected: {} } });
    collectPaths({ traits: { selected: { general: 'General' } } }, into);
    expect([...into.keys()].sort()).toEqual([
      'traits',
      'traits.selected',
      'traits.selected.general',
    ]);
  });

  it('nó de passagem não vai para o relatório quando algo dentro dele foi lido', () => {
    const coverage = emptyCoverage();
    coverage.subtree.add('system.slug');
    // `system` é só caminho até o que a receita leu: não é campo por decidir.
    expect(isCovered('system', coverage)).toBe(true);
    // mas um irmão não lido continua aparecendo
    expect(isCovered('system.outro', coverage)).toBe(false);
  });
});
