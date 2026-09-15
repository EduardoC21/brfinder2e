/**
 * O CLIENTE da central de traduções (Etapa 55; o servidor é `server/`, as regras estão
 * em OPEN-DECISIONS #16). O core não sabe de `fetch`: recebe uma porta com GET e POST
 * (`CentralPort`) e cuida do que é regra — o que se envia, o que se guarda, o que se
 * oferece.
 *
 * O que fica no armazenamento: `trans/<língua>/central/<tipo>` — as candidatas oferecidas
 * pela central, por chave e campo, com a impressão digital do original. É um CACHE: o app
 * o refaz na sincronização e no "Atualizar", e nunca o exporta. A tradução ACEITA vai
 * para `trans/<língua>/<tipo>` como qualquer outra, com a forma `shared`.
 */

import { parseMarkup } from '../markup/parse';
import { isRecord } from '../json';
import type { StorePort } from '../store/ports';
import { sourceHash, type Translation } from '../store/translations';

export interface CentralPort {
  getJson(url: string): Promise<unknown>;
  postJson(url: string, body: unknown): Promise<unknown>;
  delete(url: string, body: unknown): Promise<unknown>;
}

/** Uma candidata oferecida pela central, como o app a guarda. */
export interface Offered {
  readonly id: number;
  readonly sourceHash: string;
  readonly html: string;
  readonly method: string;
  readonly model: string | null;
  readonly senderName: string | null;
  readonly createdAt: string;
  readonly uses: number;
  readonly candidates: number;
}

/** Por chave da entrada, por campo. */
export type OfferedByKey = Readonly<Record<string, Readonly<Record<string, Offered>>>>;

export const keyCentral = (language: string, type: string): string =>
  `trans/${language}/central/${type}`;
export const keyCentralMeta = (language: string): string => `trans/${language}/central/meta`;

/** A URL da central sem barra no fim; vazia = sem central. */
export function centralBase(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

function lerOferecida(value: unknown): Offered | null {
  if (!isRecord(value)) return null;
  const {
    id,
    sourceHash: hash,
    html,
    method,
    model,
    senderName,
    createdAt,
    uses,
    candidates,
  } = value;
  if (
    typeof id !== 'number' ||
    typeof hash !== 'string' ||
    typeof html !== 'string' ||
    typeof method !== 'string' ||
    typeof createdAt !== 'string'
  ) {
    return null;
  }
  return {
    id,
    sourceHash: hash,
    html,
    method,
    model: typeof model === 'string' ? model : null,
    senderName: typeof senderName === 'string' ? senderName : null,
    createdAt,
    uses: typeof uses === 'number' ? uses : 0,
    candidates: typeof candidates === 'number' ? candidates : 1,
  };
}

/**
 * Baixa o pacote de um tipo e o guarda por cima do que havia. Sempre inteiro: o pacote é
 * a "melhor candidata" por entrada, e uma candidata pode ter perdido o lugar para outra —
 * o `since` do servidor não serviria para isso.
 */
export async function refreshCentral(
  port: CentralPort,
  store: StorePort,
  base: string,
  language: string,
  type: string,
): Promise<number> {
  const resposta = await port.getJson(
    `${base}/v1/translations/${encodeURIComponent(language)}/${encodeURIComponent(type)}`,
  );
  const items = isRecord(resposta) && Array.isArray(resposta['items']) ? resposta['items'] : [];
  const porChave: Record<string, Record<string, Offered>> = {};
  let n = 0;
  for (const item of items) {
    const oferecida = lerOferecida(item);
    if (oferecida === null || !isRecord(item)) continue;
    const { key, field } = item;
    if (typeof key !== 'string' || typeof field !== 'string') continue;
    const campos = porChave[key] ?? {};
    campos[field] = oferecida;
    porChave[key] = campos;
    n += 1;
  }
  await store.put(keyCentral(language, type), porChave);
  return n;
}

export async function readCentral(
  store: StorePort,
  language: string,
  type: string,
): Promise<OfferedByKey> {
  const value = await store.get(keyCentral(language, type));
  if (!isRecord(value)) return {};
  const out: Record<string, Record<string, Offered>> = {};
  for (const [key, campos] of Object.entries(value)) {
    if (!isRecord(campos)) continue;
    const porCampo: Record<string, Offered> = {};
    for (const [field, raw] of Object.entries(campos)) {
      const oferecida = lerOferecida(raw);
      if (oferecida !== null) porCampo[field] = oferecida;
    }
    if (Object.keys(porCampo).length > 0) out[key] = porCampo;
  }
  return out;
}

/** A candidata que serve para ESTE original: mesma impressão digital, senão nada. */
export function offeredFor(
  offered: OfferedByKey,
  key: string,
  field: string,
  original: string,
): Offered | null {
  const candidata = offered[key]?.[field];
  if (candidata === undefined) return null;
  /* O nome não tem "original" de verdade além do próprio nome: a impressão é dele. */
  return candidata.sourceHash === sourceHash(original) ? candidata : null;
}

/** A tradução gravada a partir de uma candidata aceita — leva o id, que é o voto. */
export function acceptedTranslation(offered: Offered, at: string): Translation {
  return {
    html: offered.html,
    method: 'shared',
    at,
    sourceHash: offered.sourceHash,
    sharedId: offered.id,
  };
}

/** Uma candidata de uma entrada, como a central lista (todas, por campo). */
export interface Candidate extends Offered {
  readonly field: string;
}

/**
 * Todas as candidatas de UMA entrada (Etapa 56): é o "‹ 2/3 ›". Só se busca quando o
 * pacote diz que há mais de uma; a mais votada primeiro, como a central ordena.
 */
export async function fetchCandidates(
  port: CentralPort,
  base: string,
  language: string,
  type: string,
  key: string,
): Promise<Candidate[]> {
  const resposta = await port.getJson(
    `${base}/v1/translations/${encodeURIComponent(language)}/${encodeURIComponent(type)}/${encodeURIComponent(key)}`,
  );
  const items = isRecord(resposta) && Array.isArray(resposta['items']) ? resposta['items'] : [];
  const out: Candidate[] = [];
  for (const item of items) {
    const oferecida = lerOferecida(item);
    if (oferecida === null || !isRecord(item) || typeof item['field'] !== 'string') continue;
    out.push({ ...oferecida, field: item['field'] });
  }
  return out;
}

/** Os alvos das marcas do Foundry de um HTML — a trava que a central confere do lado de lá. */
export function marksOf(html: string): string[] {
  const alvos: string[] = [];
  for (const token of parseMarkup(html)) {
    if (token.kind === 'text') continue;
    alvos.push(token.raw.replace(/\{[^}]*\}$/, ''));
  }
  return alvos;
}

export interface Sender {
  readonly id: string;
  readonly name: string | null;
}

/** Envia UMA tradução gravada para a central. Falha em silêncio é decisão de quem chama. */
export async function submitTranslation(
  port: CentralPort,
  base: string,
  language: string,
  entityType: string,
  key: string,
  field: string,
  original: string,
  translation: Translation,
  model: string | null,
  sender: Sender,
): Promise<void> {
  await port.postJson(`${base}/v1/translations`, {
    language,
    entityType,
    key,
    field,
    sourceHash: translation.sourceHash,
    html: translation.html,
    method: translation.method,
    model,
    senderId: sender.id,
    senderName: sender.name,
    marks: marksOf(original),
  });
}

/** "Usar": o voto do aparelho vai para esta candidata (um por entrada e campo). */
export async function markUse(
  port: CentralPort,
  base: string,
  id: number,
  sender: Sender,
): Promise<void> {
  await port.postJson(`${base}/v1/translations/${String(id)}/use`, { senderId: sender.id });
}

/** Os votos em lote — "Aceitar todas" —, até 500 por pedido. */
export async function markUses(
  port: CentralPort,
  base: string,
  ids: readonly number[],
  sender: Sender,
): Promise<void> {
  for (let i = 0; i < ids.length; i += 500) {
    await port.postJson(`${base}/v1/uses`, { senderId: sender.id, ids: ids.slice(i, i + 500) });
  }
}

/** Apagou a compartilhada do aparelho: o voto vai junto. */
export async function unmarkUse(
  port: CentralPort,
  base: string,
  id: number,
  sender: Sender,
): Promise<void> {
  await port.delete(`${base}/v1/translations/${String(id)}/use`, { senderId: sender.id });
}

/** Um id anônimo por aparelho: 24 caracteres de `[A-Za-z0-9_-]`, gerado uma vez. */
export function newSenderId(random: (n: number) => Uint8Array): string {
  const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
  const bytes = random(24);
  let id = '';
  for (const b of bytes) id += alfabeto.charAt(b % alfabeto.length);
  return id;
}
