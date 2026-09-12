import { describe, expect, it } from 'vitest';

import { retire, toStored } from './diff';
import { createMemoryStore } from './memory';
import {
  readBase,
  readDesc,
  readMeta,
  readRetiredRaw,
  writeBase,
  writeDesc,
  writeMeta,
  writeRaw,
  writeRetiredRaw,
} from './layers';
import { clearData, countRetired, purgeRetired } from './maintenance';
import type { NormalizedEntity } from '../normalization/run';

function entidade(key: string): NormalizedEntity {
  return {
    identity: { id: key, uuid: `uuid-${key}`, type: 'rule' },
    base: { name: key },
    desc: { main: '' },
  };
}

/** Uma base com duas ativas, uma aposentada, descrições, raw e preferências. */
async function montar() {
  const store = createMemoryStore();
  await writeBase(store, 'rule', [
    toStored(entidade('a')),
    toStored(entidade('b')),
    retire(toStored(entidade('velha')), 'pf2e-8.4.1'),
  ]);
  await writeDesc(store, 'rule', {
    'uuid-a': { main: 'a' },
    'uuid-b': { main: 'b' },
    'uuid-velha': { main: 'v' },
  });
  await writeRetiredRaw(store, 'rule', 'uuid-velha', { _id: 'velha' });
  await writeRaw(store, 'journals', new Uint8Array([1, 2, 3]));
  await store.put('glossary/traits', { agile: { label: 'Agile', description: '…' } });
  await store.put('prefs/ui', { layout: { railCollapsed: true } });
  await writeMeta(store, {
    systemId: 'pf2e',
    systemVersion: '8.5.0',
    releaseTag: 'pf2e-8.5.0',
    syncedAt: '2026-09-11T00:00:00.000Z',
    total: 2,
    revision: 0,
    recipes: 3,
  });
  return store;
}

describe('purgeRetired', () => {
  it('apaga só o aposentado, nas três camadas, e sobe a revisão', async () => {
    const store = await montar();
    expect(await countRetired(store)).toBe(1);

    expect(await purgeRetired(store)).toEqual({ removed: 1 });

    expect((await readBase(store, 'rule'))?.map((e) => e.key)).toEqual(['uuid-a', 'uuid-b']);
    expect(Object.keys((await readDesc(store, 'rule')) ?? {})).toEqual(['uuid-a', 'uuid-b']);
    expect(await readRetiredRaw(store, 'rule', 'uuid-velha')).toBeUndefined();
    expect((await readMeta(store))?.revision).toBe(1);
    expect(await countRetired(store)).toBe(0);
  });

  /* Sem aposentado, nada muda — nem a revisão, para a tela não reler à toa. */
  it('sem aposentado não mexe em nada', async () => {
    const store = await montar();
    await purgeRetired(store);
    const antes = await readMeta(store);
    expect(await purgeRetired(store)).toEqual({ removed: 0 });
    expect(await readMeta(store)).toEqual(antes);
  });
});

describe('clearData', () => {
  it('apaga a base inteira e PRESERVA as preferências', async () => {
    const store = await montar();
    await clearData(store);
    expect(await readMeta(store)).toBeNull();
    expect(await readBase(store, 'rule')).toBeNull();
    expect(await readDesc(store, 'rule')).toBeNull();
    expect(await store.get('glossary/traits')).toBeUndefined();
    expect(await store.keys('raw/')).toEqual([]);
    // A largura da coluna que a pessoa arrastou não se refaz com uma sincronização.
    expect(await store.get('prefs/ui')).toEqual({ layout: { railCollapsed: true } });
  });
});
