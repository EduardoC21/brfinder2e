import { describe, expect, it } from 'vitest';

import type { NormalizedEntity } from '../normalization/run';
import {
  createMemoryStore,
  readBase,
  readDesc,
  readMeta,
  readRaw,
  type StorePort,
} from '../store/index';
import { persistSync } from './persist';
import type { SyncResult, TypeResult } from './run-sync';

function entity(uuid: string, base: unknown, desc: unknown): NormalizedEntity {
  return { identity: { id: uuid.slice(-3), uuid, type: 'condition' }, base, desc };
}

const RAW = new TextEncoder().encode('[{"name":"Blinded"}]');

function result(entities: readonly NormalizedEntity[]): SyncResult {
  const type: TypeResult = {
    type: 'condition',
    packName: 'conditionitems',
    pack: 'packs/conditions.json',
    total: entities.length,
    imported: entities.length,
    failed: 0,
    report: {
      type: 'condition',
      documents: entities.length,
      unmapped: [],
      ignored: [],
      deferred: [],
    },
    entities,
    rawBytes: RAW,
  };
  return {
    systemId: 'pf2e',
    systemVersion: '8.4.1',
    releaseTag: 'pf2e-8.4.1',
    types: [type],
    total: entities.length,
  };
}

const at = (iso: string) => () => new Date(iso);

describe('persistSync', () => {
  it('grava as três camadas do briefing 5.2', async () => {
    const store: StorePort = createMemoryStore();
    const primeira = [
      entity('u1', { name: 'Blinded' }, { main: '<p>a</p>' }),
      entity('u2', { name: 'Prone' }, { main: '<p>b</p>' }),
    ];

    await persistSync(store, result(primeira), at('2026-08-27T12:00:00.000Z'));

    // raw/ sai dos bytes do zip, não da projeção
    expect(await readRaw(store, 'conditionitems')).toEqual(RAW);

    const base = await readBase(store, 'condition');
    expect(base?.map((e) => e.base)).toEqual([{ name: 'Blinded' }, { name: 'Prone' }]);

    expect(await readDesc(store, 'condition')).toEqual({
      u1: { main: '<p>a</p>' },
      u2: { main: '<p>b</p>' },
    });

    expect(await readMeta(store)).toEqual({
      systemId: 'pf2e',
      systemVersion: '8.4.1',
      releaseTag: 'pf2e-8.4.1',
      syncedAt: '2026-08-27T12:00:00.000Z',
      total: 2,
    });
  });

  it('na primeira sincronização tudo é novo', async () => {
    const store = createMemoryStore();
    const persisted = await persistSync(
      store,
      result([entity('u1', { name: 'Blinded' }, {})]),
      at('2026-08-27T12:00:00.000Z'),
    );
    expect(persisted.types[0]?.diff).toEqual({ added: 1, updated: 0, unchanged: 0, removed: 0 });
  });

  /**
   * A ordem importa: se a gravação viesse antes da leitura, a comparação seria contra o
   * que acabou de ser escrito e o relatório diria "nada mudou" para sempre.
   */
  it('compara contra a base ANTERIOR, não contra a que acabou de gravar', async () => {
    const store = createMemoryStore();
    const antes = [
      entity('u1', { name: 'Blinded', group: 'senses' }, {}),
      entity('u2', { name: 'Prone', group: null }, {}),
    ];
    await persistSync(store, result(antes), at('2026-08-27T12:00:00.000Z'));

    const depois = [
      entity('u1', { name: 'Blinded', group: 'senses' }, {}), // igual
      entity('u3', { name: 'Dazzled', group: 'senses' }, {}), // nova; u2 sumiu
    ];
    const persisted = await persistSync(store, result(depois), at('2026-08-27T13:00:00.000Z'));

    expect(persisted.types[0]?.diff).toEqual({
      added: 1,
      updated: 0,
      unchanged: 1,
      removed: 1,
    });
  });

  it('sincronizar duas vezes o mesmo release não acusa mudança', async () => {
    const store = createMemoryStore();
    const entities = [entity('u1', { name: 'Blinded' }, {}), entity('u2', { name: 'Prone' }, {})];

    await persistSync(store, result(entities), at('2026-08-27T12:00:00.000Z'));
    const segunda = await persistSync(store, result(entities), at('2026-08-27T13:00:00.000Z'));

    expect(segunda.types[0]?.diff).toEqual({ added: 0, updated: 0, unchanged: 2, removed: 0 });
    // e a meta é atualizada, para a data mostrada ser a da última vez
    expect((await readMeta(store))?.syncedAt).toBe('2026-08-27T13:00:00.000Z');
  });

  it('meta com forma inesperada é tratada como ausente, não quebra', async () => {
    const store = createMemoryStore();
    await store.put('meta', { systemId: 'pf2e' }); // gravada por uma versão antiga
    expect(await readMeta(store)).toBeNull();
  });
});
