/**
 * TESTE DE CONTRATO da receita de `feature` — as 55 habilidades de ancestralidade reais.
 *
 * Fora do `npm test`: baixa 34 MiB. Roda com `npm run test:contract`.
 */

import { beforeAll, describe, expect, it } from 'vitest';

import {
  DEFAULT_CHANNEL,
  KNOWN_GOOD_TAG,
  loadInventory,
  parseFolderRoots,
  readTextEntry,
} from '@core/source/index';
import { createFetchHttp } from '@platform/http-fetch';
import { isClean } from '../report';
import { run, type RunResult } from '../run';
import { featureRecipe, type FeatureBase, type FeatureDesc } from './feature';

const http = createFetchHttp({ headers: { Accept: 'application/vnd.github+json' } });
let result: RunResult<FeatureBase, FeatureDesc>;

beforeAll(async () => {
  const loaded = await loadInventory(http, { tag: KNOWN_GOOD_TAG });
  const pack = loaded.inventory.packs.find((entry) => entry.name === 'ancestryfeatures');
  if (!pack) throw new Error('o pack ancestryfeatures sumiu do manifesto');
  const declaration = loaded.manifest.packs.find((entry) => entry.name === 'ancestryfeatures');
  if (!declaration) throw new Error('o pack ancestryfeatures sumiu do manifesto');
  const folders = parseFolderRoots(
    JSON.parse(readTextEntry(loaded.zip, DEFAULT_CHANNEL.packFoldersFile(declaration))),
  );
  result = run(featureRecipe, [
    {
      pack: 'ancestryfeatures',
      documents: JSON.parse(readTextEntry(loaded.zip, pack.file)) as unknown[],
      folders,
    },
  ]);
}, 180_000);

describe('as 55 habilidades de ancestralidade reais', () => {
  it('normalizam todas, sem falha e com relatório limpo', () => {
    expect(result.failures).toEqual([]);
    expect(result.entities).toHaveLength(55);
    expect(result.report.unmapped, JSON.stringify(result.report.unmapped, null, 1)).toEqual([]);
    expect(isClean(result.report)).toBe(true);
  });

  it('todas são ancestryfeature, e a dona vem da pasta em todas', () => {
    expect(result.entities.every((e) => e.base.category === 'ancestryfeature')).toBe(true);
    expect(result.entities.filter((e) => e.base.owner === '')).toHaveLength(0);
  });

  it('nível 0 em 39 e 1 em 16', () => {
    expect(result.entities.filter((e) => e.base.level === 0)).toHaveLength(39);
    expect(result.entities.filter((e) => e.base.level === 1)).toHaveLength(16);
  });
});
