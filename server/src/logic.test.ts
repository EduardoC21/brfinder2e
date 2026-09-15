import { describe, expect, it } from 'vitest';

import { missingMarks, parseSubmission, pickOffered, type Row } from './logic';

const envio = {
  language: 'pt-BR',
  entityType: 'spell',
  key: 'Compendium.pf2e.spells-srd.Item.abcdefghijklmnop',
  field: 'main',
  sourceHash: '25a2f4c0',
  html: '<p>Conjure @UUID[Compendium.pf2e.spells-srd.Item.x]{Bola de Fogo} e cause @Damage[6d6[fire]].</p>',
  method: 'llm',
  model: 'gemini-flash-latest',
  senderId: 'aparelho-0001',
  senderName: 'Edu',
  marks: ['@UUID[Compendium.pf2e.spells-srd.Item.x]', '@Damage[6d6[fire]]'],
};

describe('parseSubmission', () => {
  it('aceita o envio limpo e devolve a submissão', () => {
    const lido = parseSubmission(envio);
    expect(lido.ok).toBe(true);
    if (lido.ok) expect(lido.value.senderName).toBe('Edu');
  });

  it('recusa marca perdida — a mesma trava do editor', () => {
    const lido = parseSubmission({ ...envio, html: '<p>Bola de Fogo, 6d6.</p>' });
    expect(lido).toEqual({
      ok: false,
      why: 'marca perdida: @UUID[Compendium.pf2e.spells-srd.Item.x]',
    });
  });

  it('recusa o que não é do contrato: língua, forma, impressão, apelido comprido', () => {
    expect(parseSubmission({ ...envio, language: 'fr' }).ok).toBe(false);
    expect(parseSubmission({ ...envio, method: 'local' }).ok).toBe(false);
    expect(parseSubmission({ ...envio, sourceHash: 'xyz' }).ok).toBe(false);
    expect(parseSubmission({ ...envio, senderName: 'a'.repeat(41) }).ok).toBe(false);
    expect(parseSubmission(null).ok).toBe(false);
  });

  it('apelido vazio ou ausente vira nulo; modelo ausente também', () => {
    const a = parseSubmission({ ...envio, senderName: '', model: undefined });
    expect(a.ok && a.value.senderName === null && a.value.model === null).toBe(true);
  });
});

describe('missingMarks', () => {
  it('conta repetições: duas marcas iguais precisam aparecer duas vezes', () => {
    expect(missingMarks(['@Damage[1d6]', '@Damage[1d6]'], 'x @Damage[1d6] y')).toEqual([
      '@Damage[1d6]',
    ]);
    expect(missingMarks(['@Damage[1d6]', '@Damage[1d6]'], '@Damage[1d6] @Damage[1d6]')).toEqual([]);
  });
});

describe('pickOffered', () => {
  const linha = (id: number, uses: number, at: string, extra: Partial<Row> = {}): Row => ({
    id,
    entity_key: 'k',
    field: 'main',
    source_hash: 'h',
    html: `<p>${String(id)}</p>`,
    method: 'llm',
    model: null,
    sender_id: `s${String(id)}`,
    sender_name: null,
    created_at: at,
    uses,
    ...extra,
  });

  it('mais "Usar" primeiro; empate, a mais recente; e conta as candidatas', () => {
    const oferecidas = pickOffered([
      linha(1, 2, '2026-09-01'),
      linha(2, 5, '2026-08-01'),
      linha(3, 5, '2026-09-10'),
      linha(4, 0, '2026-09-15', { field: 'page' }),
    ]);
    expect(oferecidas.map((o) => [o.field, o.id, o.candidates])).toEqual([
      ['main', 3, 3],
      ['page', 4, 1],
    ]);
  });

  it('impressões diferentes do original são grupos diferentes', () => {
    const oferecidas = pickOffered([
      linha(1, 0, '2026-09-01'),
      linha(2, 0, '2026-09-02', { source_hash: 'outra' }),
    ]);
    expect(oferecidas).toHaveLength(2);
  });
});
