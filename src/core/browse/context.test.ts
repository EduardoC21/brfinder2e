import { describe, expect, it } from 'vitest';

import { contextFor } from './context';

const alteracao = {
  targetType: 'action',
  targetSlug: 'change-shape',
  mode: 'override',
  blocks: [{ text: '<p>spider</p>' }],
};
const anadi = { key: 'a', uuid: 'a', base: { name: 'Anadi', alterations: [alteracao] } };
const changeShape = { key: 'c', uuid: 'c', base: { name: 'Change Shape', slug: 'change-shape' } };
const outra = { key: 'o', uuid: 'o', base: { name: 'Stride', slug: 'stride' } };

describe('contextFor', () => {
  it('acha a alteração pelo tipo e pelo slug do alvo', () => {
    expect(contextFor(anadi, 'action', changeShape)).toEqual({
      from: 'Anadi',
      alteration: alteracao,
    });
  });

  it('não acha quando o alvo é outro, o tipo é outro, ou quem abre não tem alterações', () => {
    expect(contextFor(anadi, 'action', outra)).toBeNull();
    expect(contextFor(anadi, 'feat', changeShape)).toBeNull();
    expect(contextFor(changeShape, 'action', changeShape)).toBeNull();
  });
});
