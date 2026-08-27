/**
 * Grava o resultado da sincronização, e diz o que mudou.
 *
 * A ordem importa: para cada tipo, LÊ a base anterior, compara, e só então sobrescreve.
 * Invertido, a comparação seria sempre contra o que acabou de ser gravado, e o relatório
 * diria "nada mudou" para sempre.
 *
 * A camada `raw/` é gravada a partir dos bytes do zip, nunca da projeção — é o que mantém
 * aberta a porta da exportação para o Foundry (OPEN-DECISIONS, item 1).
 */

import {
  diffEntities,
  entityKey,
  readBase,
  toStored,
  writeBase,
  writeDesc,
  writeMeta,
  writeRaw,
  type EntityDiff,
  type StoreMeta,
  type StorePort,
} from '../store/index';
import type { SyncResult } from './run-sync';

export interface PersistedType {
  readonly type: string;
  readonly diff: EntityDiff;
}

export interface PersistResult {
  readonly meta: StoreMeta;
  readonly types: readonly PersistedType[];
}

export async function persistSync(
  store: StorePort,
  result: SyncResult,
  now: () => Date = () => new Date(),
): Promise<PersistResult> {
  const types: PersistedType[] = [];

  for (const type of result.types) {
    const stored = type.entities.map(toStored);

    // Lê ANTES de gravar. Ver o comentário do topo.
    const previous = await readBase(store, type.type);
    const diff = diffEntities(previous, stored);

    await writeRaw(store, type.packName, type.rawBytes);
    await writeBase(store, type.type, stored);
    await writeDesc(
      store,
      type.type,
      Object.fromEntries(type.entities.map((entity) => [entityKey(entity), entity.desc])),
    );

    types.push({ type: type.type, diff });
  }

  const meta: StoreMeta = {
    systemId: result.systemId,
    systemVersion: result.systemVersion,
    releaseTag: result.releaseTag,
    syncedAt: now().toISOString(),
    total: result.total,
  };
  await writeMeta(store, meta);

  return { meta, types };
}
