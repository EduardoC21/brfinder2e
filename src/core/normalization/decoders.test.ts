import { describe, expect, it } from 'vitest';

import { DecodeError, bool, int, listOf, nullable, oneOf, shape, text, textList } from './decoders';
import { emptyCoverage } from './paths';

describe('decodificadores de folha', () => {
  it('aceitam o tipo certo', () => {
    expect(text.decode('Frightened', 'name')).toBe('Frightened');
    expect(bool.decode(false, 'p')).toBe(false);
    expect(int.decode(3, 'p')).toBe(3);
    expect(textList.decode(['a', 'b'], 'p')).toEqual(['a', 'b']);
  });

  it('recusam o tipo errado nomeando o caminho', () => {
    expect(() => text.decode(42, 'system.slug')).toThrow(/system\.slug: esperado texto/);
    expect(() => int.decode(1.5, 'p')).toThrow(DecodeError);
    expect(() => textList.decode(['a', 7], 'traits')).toThrow(/traits\[1\]: esperado texto/);
  });

  it('recusam null — para aceitar, é preciso dizer com nullable', () => {
    expect(() => text.decode(null, 'system.group')).toThrow(DecodeError);
    expect(nullable(text).decode(null, 'system.group')).toBeNull();
    expect(nullable(text).decode('status', 'system.group')).toBe('status');
  });
});

describe('shape', () => {
  const publication = shape({ license: text, title: text });
  const value = { license: 'ORC', title: 'Player Core', remaster: true };

  it('lê as chaves declaradas', () => {
    expect(publication.decode(value, 'system.publication')).toEqual({
      license: 'ORC',
      title: 'Player Core',
    });
  });

  /**
   * A propriedade central do relatório de não mapeados. Se `shape` cobrisse a subárvore
   * inteira, `system.publication.remaster` sumiria calado — e ele é falso em 5.872
   * entidades (briefing 7.8).
   */
  it('NÃO cobre a chave que não declarou', () => {
    const coverage = emptyCoverage();
    publication.cover(value, 'system.publication', coverage);
    expect(coverage.exact.has('system.publication')).toBe(true);
    expect(coverage.subtree.has('system.publication.license')).toBe(true);
    expect(coverage.subtree.has('system.publication.remaster')).toBe(false);
  });
});

describe('listOf', () => {
  it('decodifica cada elemento', () => {
    const decoder = listOf(shape({ key: text }));
    expect(decoder.decode([{ key: 'FlatModifier' }], 'system.rules')).toEqual([
      { key: 'FlatModifier' },
    ]);
  });

  it('cobre com a notação []', () => {
    const coverage = emptyCoverage();
    listOf(shape({ key: text })).cover([{ key: 'A' }], 'system.rules', coverage);
    expect(coverage.subtree.has('system.rules[].key')).toBe(true);
  });
});

describe('oneOf', () => {
  // As cinco formas de ChoiceSet do briefing 7.8, reduzidas ao essencial.
  const choices = oneOf({
    explicit: listOf(shape({ value: text })),
    byFilter: shape({ filter: textList }),
    byFlag: text,
  });

  it('reconhece cada forma e diz qual casou', () => {
    expect(choices.decode([{ value: 'a' }], 'p').variant).toBe('explicit');
    expect(choices.decode({ filter: ['item:tag:x'] }, 'p').variant).toBe('byFilter');
    expect(choices.decode('flags.pf2e.x', 'p').variant).toBe('byFlag');
  });

  /**
   * O ponto todo: uma sexta forma numa versão futura do Foundry vira erro visível, com o
   * valor real na mensagem — em vez de passar batido.
   */
  it('falha com o valor real quando nenhuma forma casa', () => {
    expect(() => choices.decode({ inesperado: 1 }, 'system.choices')).toThrow(
      /system\.choices: esperado uma de \{explicit\|byFilter\|byFlag\}/,
    );
  });

  it('cobre o que a forma vencedora cobre', () => {
    const coverage = emptyCoverage();
    choices.cover({ filter: ['x'] }, 'system.choices', coverage);
    expect(coverage.subtree.has('system.choices.filter')).toBe(true);
  });
});
