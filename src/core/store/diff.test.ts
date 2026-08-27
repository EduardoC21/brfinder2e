import { describe, expect, it } from 'vitest';

import type { NormalizedEntity } from '../normalization/run';
import { diffEntities, entityKey, stableStringify, toStored } from './diff';

function entity(uuid: string, base: unknown, id = 'AAA'): NormalizedEntity {
  return { identity: { id, uuid, type: 'condition' }, base, desc: {} };
}

describe('entityKey', () => {
  it('usa o UUID canônico do release (briefing 7.3)', () => {
    expect(entityKey(entity('Compendium.pf2e.x.Item.A', {}))).toBe('Compendium.pf2e.x.Item.A');
  });

  it('cai no _id, prefixado, quando não há UUID', () => {
    expect(entityKey(entity('', {}, 'ZZZ'))).toBe('id:ZZZ');
  });
});

describe('stableStringify', () => {
  /**
   * A razão de existir. Com JSON.stringify direto, mexer a ordem de duas linhas na receita
   * marcaria as 6.283 entidades como "atualizadas" sem nenhuma ter mudado.
   */
  it('ignora a ordem das chaves', () => {
    expect(stableStringify({ a: 1, b: 2 })).toBe(stableStringify({ b: 2, a: 1 }));
  });

  it('ordena em profundidade, e preserva a ordem de array', () => {
    expect(stableStringify({ x: { b: 1, a: 2 } })).toBe('{"x":{"a":2,"b":1}}');
    expect(stableStringify(['b', 'a'])).toBe('["b","a"]');
    expect(stableStringify(['b', 'a'])).not.toBe(stableStringify(['a', 'b']));
  });

  it('distingue null de ausente e trata os primitivos', () => {
    expect(stableStringify(null)).toBe('null');
    expect(stableStringify({ a: null })).toBe('{"a":null}');
    expect(stableStringify('x')).toBe('"x"');
    expect(stableStringify(3)).toBe('3');
  });
});

describe('diffEntities', () => {
  const anterior = [
    toStored(entity('u1', { name: 'Blinded', group: 'senses' })),
    toStored(entity('u2', { name: 'Off-Guard', group: null })),
    toStored(entity('u3', { name: 'Prone', group: null })),
  ];

  it('sem base anterior, tudo é novo', () => {
    expect(diffEntities(null, anterior)).toEqual({
      added: 3,
      updated: 0,
      unchanged: 0,
      removed: 0,
    });
  });

  it('base idêntica não acusa mudança nenhuma', () => {
    expect(diffEntities(anterior, anterior)).toEqual({
      added: 0,
      updated: 0,
      unchanged: 3,
      removed: 0,
    });
  });

  it('separa nova, mudada, igual e sumida', () => {
    const agora = [
      toStored(entity('u1', { name: 'Blinded', group: 'senses' })), // igual
      toStored(entity('u2', { name: 'Off-Guard', group: 'detection' })), // mudou
      toStored(entity('u4', { name: 'Dazzled', group: 'senses' })), // nova
      // u3 sumiu
    ];
    expect(diffEntities(anterior, agora)).toEqual({
      added: 1,
      updated: 1,
      unchanged: 1,
      removed: 1,
    });
  });

  it('a ordem das chaves da projeção não conta como mudança', () => {
    const outraOrdem = [
      toStored(entity('u1', { group: 'senses', name: 'Blinded' })),
      toStored(entity('u2', { group: null, name: 'Off-Guard' })),
      toStored(entity('u3', { group: null, name: 'Prone' })),
    ];
    expect(diffEntities(anterior, outraOrdem).unchanged).toBe(3);
  });

  it('base anterior vazia é diferente de base anterior ausente só em removed', () => {
    expect(diffEntities([], anterior)).toEqual({
      added: 3,
      updated: 0,
      unchanged: 0,
      removed: 0,
    });
  });
});
