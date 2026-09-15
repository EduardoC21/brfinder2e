/**
 * A LÓGICA da central de traduções (Etapa 54), sem I/O: o que se aceita, o que se
 * oferece primeiro, e a janela de limite por remetente. Pura de propósito — é o que se
 * testa sem banco e sem rede; `index.ts` liga isto ao D1 e ao HTTP.
 *
 * As regras vêm do autor (OPEN-DECISIONS #16):
 *   - só entra o que passa na MESMA trava do editor: as marcas do Foundry do original
 *     (`@UUID[…]`, `@Damage[…]`…) têm de estar no HTML enviado, com o mesmo alvo;
 *   - todas as candidatas válidas ficam, separadas por remetente; a oferecida primeiro é a
 *     de mais "Usar", e no empate a mais recente;
 *   - mesma versão = mesma impressão digital do original (`sourceHash`).
 */

export const LANGUAGES: readonly string[] = ['pt-BR'];
export const METHODS: readonly string[] = ['llm', 'manual'];

/** O que o app manda ao terminar uma tradução (ou ao enviar uma correção, se a pessoa quiser). */
export interface Submission {
  readonly language: string;
  readonly entityType: string;
  readonly key: string;
  readonly field: string;
  readonly sourceHash: string;
  readonly html: string;
  readonly method: string;
  readonly model: string | null;
  readonly senderId: string;
  readonly senderName: string | null;
  /** Os alvos das marcas do Foundry do ORIGINAL (sem o rótulo): a trava. */
  readonly marks: readonly string[];
}

const HTML_MAX = 300_000;
const TEXT_MAX = 200;
const MARKS_MAX = 500;
const ID = /^[A-Za-z0-9_-]{8,64}$/;
const HASH = /^[0-9a-f]{8}$/;
const TYPE = /^[a-z][a-z0-9-]{1,31}$/;
const FIELD = /^[a-zA-Z][a-zA-Z0-9]{0,31}$/;
/* A chave do Foundry: `Compendium.pf2e.<pack>.Item.<id>`, ou a de página de jornal. */
const KEY = /^[A-Za-z0-9._-]{8,200}$/;

function texto(value: unknown, max = TEXT_MAX): string | null {
  return typeof value === 'string' && value.length > 0 && value.length <= max ? value : null;
}

/** Lê e valida o corpo de um envio. Devolve a submissão limpa, ou a razão da recusa. */
export function parseSubmission(
  body: unknown,
):
  { readonly ok: true; readonly value: Submission } | { readonly ok: false; readonly why: string } {
  if (typeof body !== 'object' || body === null) return { ok: false, why: 'corpo não é objeto' };
  const b = body as Record<string, unknown>;
  const language = texto(b['language'], 16);
  if (language === null || !LANGUAGES.includes(language)) return { ok: false, why: 'língua' };
  const entityType = texto(b['entityType'], 32);
  if (entityType === null || !TYPE.test(entityType)) return { ok: false, why: 'tipo' };
  const key = texto(b['key']);
  if (key === null || !KEY.test(key)) return { ok: false, why: 'chave' };
  const field = texto(b['field'], 32);
  if (field === null || !FIELD.test(field)) return { ok: false, why: 'campo' };
  const sourceHash = texto(b['sourceHash'], 8);
  if (sourceHash === null || !HASH.test(sourceHash)) return { ok: false, why: 'impressão digital' };
  const html = texto(b['html'], HTML_MAX);
  if (html === null) return { ok: false, why: 'html vazio ou grande demais' };
  const method = texto(b['method'], 16);
  if (method === null || !METHODS.includes(method)) return { ok: false, why: 'forma' };
  const senderId = texto(b['senderId'], 64);
  if (senderId === null || !ID.test(senderId)) return { ok: false, why: 'remetente' };
  const model = b['model'] === undefined || b['model'] === null ? null : texto(b['model'], 64);
  const nome = b['senderName'];
  const senderName = nome === undefined || nome === null || nome === '' ? null : texto(nome, 40);
  if (nome !== undefined && nome !== null && nome !== '' && senderName === null) {
    return { ok: false, why: 'apelido' };
  }
  const marks = b['marks'];
  if (!Array.isArray(marks) || marks.length > MARKS_MAX) return { ok: false, why: 'marcas' };
  const alvos: string[] = [];
  for (const marca of marks) {
    if (typeof marca !== 'string' || marca === '' || marca.length > 400) {
      return { ok: false, why: 'marca' };
    }
    alvos.push(marca);
  }
  const faltam = missingMarks(alvos, html);
  if (faltam.length > 0) return { ok: false, why: `marca perdida: ${faltam[0] ?? ''}` };
  return {
    ok: true,
    value: {
      language,
      entityType,
      key,
      field,
      sourceHash,
      html,
      method,
      model,
      senderId,
      senderName,
      marks: alvos,
    },
  };
}

/**
 * A trava, do lado de cá: cada alvo do original tem de aparecer no HTML tantas vezes
 * quantas veio (o rótulo entre chaves pode mudar; o alvo não). A mesma regra do editor.
 */
export function missingMarks(marks: readonly string[], html: string): string[] {
  const esperados = new Map<string, number>();
  for (const marca of marks) esperados.set(marca, (esperados.get(marca) ?? 0) + 1);
  const faltam: string[] = [];
  for (const [alvo, n] of esperados) {
    let achados = 0;
    let i = html.indexOf(alvo);
    while (i !== -1 && achados < n) {
      achados += 1;
      i = html.indexOf(alvo, i + alvo.length);
    }
    if (achados < n) faltam.push(alvo);
  }
  return faltam;
}

/** Uma linha do depósito, como sai do banco. */
export interface Row {
  readonly id: number;
  readonly entity_key: string;
  readonly field: string;
  readonly source_hash: string;
  readonly html: string;
  readonly method: string;
  readonly model: string | null;
  readonly sender_id: string;
  readonly sender_name: string | null;
  readonly created_at: string;
  readonly uses: number;
}

/** O que o app recebe: uma candidata por (chave, campo, impressão), com quantas há. */
export interface Offered {
  readonly id: number;
  readonly key: string;
  readonly field: string;
  readonly sourceHash: string;
  readonly html: string;
  readonly method: string;
  readonly model: string | null;
  readonly senderName: string | null;
  readonly createdAt: string;
  readonly uses: number;
  readonly candidates: number;
}

/** Mais "Usar" primeiro; no empate, a mais recente. */
export function compareCandidates(a: Row, b: Row): number {
  return b.uses - a.uses || b.created_at.localeCompare(a.created_at);
}

/** Agrupa as linhas por (chave, campo, impressão) e oferece a melhor de cada grupo. */
export function pickOffered(rows: readonly Row[]): Offered[] {
  const grupos = new Map<string, Row[]>();
  for (const row of rows) {
    const chave = `${row.entity_key}|${row.field}|${row.source_hash}`;
    const grupo = grupos.get(chave);
    if (grupo === undefined) grupos.set(chave, [row]);
    else grupo.push(row);
  }
  const out: Offered[] = [];
  for (const grupo of grupos.values()) {
    const melhor = [...grupo].sort(compareCandidates)[0];
    if (melhor === undefined) continue;
    out.push({
      id: melhor.id,
      key: melhor.entity_key,
      field: melhor.field,
      sourceHash: melhor.source_hash,
      html: melhor.html,
      method: melhor.method,
      model: melhor.model,
      senderName: melhor.sender_name,
      createdAt: melhor.created_at,
      uses: melhor.uses,
      candidates: grupo.length,
    });
  }
  return out;
}

/** Envios por hora que um remetente pode fazer antes de esperar. Uma classe inteira cabe. */
export const SUBMISSIONS_PER_HOUR = 120;
