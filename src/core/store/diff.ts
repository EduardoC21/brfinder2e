/**
 * A diferença entre a base que já estava gravada e a que acabou de ser normalizada.
 *
 * É o que o relatório da engrenagem mostra: quantas entraram, quantas mudaram, quantas
 * ficaram iguais e quantas sumiram do release. Custo: uma leitura da base anterior.
 */

import type { NormalizedEntity } from '../normalization/run';

export interface EntityDiff {
  /** Não existia antes. */
  readonly added: number;
  /** Existia e o conteúdo mudou. */
  readonly updated: number;
  readonly unchanged: number;
  /** Existia na base anterior e não veio nesta sincronização. */
  readonly removed: number;
}

export const EMPTY_DIFF: EntityDiff = { added: 0, updated: 0, unchanged: 0, removed: 0 };

/**
 * A identidade da entidade para fins de comparação.
 *
 * O UUID canônico (`_stats.compendiumSource`, briefing 7.3) é o certo. O `_id` entra só
 * como reserva para dado antigo, onde o UUID pode não existir — e vai prefixado para não
 * colidir por acaso com um UUID.
 */
export function entityKey(entity: NormalizedEntity): string {
  return entity.identity.uuid === '' ? `id:${entity.identity.id}` : entity.identity.uuid;
}

/**
 * Serialização com chaves ordenadas.
 *
 * `JSON.stringify` direto compararia a ORDEM das chaves também. Como a ordem vem de
 * `Object.entries` sobre o mapa de campos da receita, mexer a ordem de duas linhas na
 * receita marcaria as 6.283 entidades como "atualizadas" sem nenhuma ter mudado.
 */
export function stableStringify(value: unknown): string {
  // `JSON.stringify(undefined)` devolve `undefined`, e não string — o tipo da lib mente
  // sobre isso. Tratado à parte para o `??` não virar condição impossível aos olhos do lint.
  if (value === undefined) return 'null';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;

  const record = value as Record<string, unknown>;
  const pairs = Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`);
  return `{${pairs.join(',')}}`;
}

/** O que fica gravado por entidade. `desc` mora noutra chave, por ser pesado. */
export interface StoredEntity {
  readonly key: string;
  readonly id: string;
  readonly uuid: string;
  readonly base: unknown;
}

export function toStored(entity: NormalizedEntity): StoredEntity {
  return {
    key: entityKey(entity),
    id: entity.identity.id,
    uuid: entity.identity.uuid,
    base: entity.base,
  };
}

export function diffEntities(
  previous: readonly StoredEntity[] | null,
  next: readonly StoredEntity[],
): EntityDiff {
  // Sem base anterior, tudo é novo. Diferente de "base anterior vazia", que também dá
  // tudo novo — mas aí `removed` seria 0 de qualquer jeito.
  if (previous === null) return { ...EMPTY_DIFF, added: next.length };

  const before = new Map(previous.map((entity) => [entity.key, stableStringify(entity.base)]));

  let added = 0;
  let updated = 0;
  let unchanged = 0;

  for (const entity of next) {
    const antes = before.get(entity.key);
    if (antes === undefined) added++;
    else if (antes === stableStringify(entity.base)) unchanged++;
    else updated++;
    before.delete(entity.key);
  }

  // O que sobrou no mapa existia antes e não veio agora.
  return { added, updated, unchanged, removed: before.size };
}
