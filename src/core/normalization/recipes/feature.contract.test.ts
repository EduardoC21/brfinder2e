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
  const fonte = (nome: string) => {
    const pack = loaded.inventory.packs.find((entry) => entry.name === nome);
    const declaration = loaded.manifest.packs.find((entry) => entry.name === nome);
    if (!pack || !declaration) throw new Error(`o pack ${nome} sumiu do manifesto`);
    const folders = parseFolderRoots(
      JSON.parse(readTextEntry(loaded.zip, DEFAULT_CHANNEL.packFoldersFile(declaration))),
    );
    return {
      pack: nome,
      documents: JSON.parse(readTextEntry(loaded.zip, pack.file)) as unknown[],
      folders,
    };
  };
  result = run(featureRecipe, [fonte('ancestryfeatures'), fonte('classfeatures')]);
}, 180_000);

const deAncestralidade = () => result.entities.filter((e) => e.base.category === 'ancestryfeature');
const deClasse = () => result.entities.filter((e) => e.base.category !== 'ancestryfeature');

describe('as 55 habilidades de ancestralidade e as 874 de classe reais', () => {
  it('normalizam todas, sem falha e com relatório limpo', () => {
    expect(result.failures).toEqual([]);
    expect(result.entities).toHaveLength(929);
    expect(result.report.unmapped, JSON.stringify(result.report.unmapped, null, 1)).toEqual([]);
    expect(isClean(result.report)).toBe(true);
  });

  it('as 55 são ancestryfeature com a dona pela pasta; as 874 são classfeature (856) e calling (18)', () => {
    expect(deAncestralidade()).toHaveLength(55);
    expect(deAncestralidade().filter((e) => e.base.owner === '')).toHaveLength(0);
    const por = new Map<string, number>();
    for (const e of deClasse()) por.set(e.base.category, (por.get(e.base.category) ?? 0) + 1);
    expect(Object.fromEntries(por)).toEqual({ classfeature: 856, calling: 18 });
  });

  /* A dona pelo traço: 769 com um só; as outras (chamados, partilhadas) ficam vazias. */
  it('769 habilidades de classe têm uma classe dona', () => {
    expect(deClasse().filter((e) => e.base.classOwner !== '')).toHaveLength(769);
  });

  /* A etiqueta das opções: 324 habilidades são opção de algo; "Druidic Order" escolhe entre 9. */
  it('as etiquetas ligam a escolha às opções', () => {
    expect(deClasse().filter((e) => e.base.tags.length > 0)).toHaveLength(324);
    const ordem = result.entities.find((e) => e.base.name === 'Druidic Order');
    expect(ordem?.base.choiceTag).toBe('druid-order');
    expect(result.entities.filter((e) => e.base.tags.includes('druid-order'))).toHaveLength(9);
  });

  it('nível 0 em 39 e 1 em 16 nas de ancestralidade', () => {
    expect(deAncestralidade().filter((e) => e.base.level === 0)).toHaveLength(39);
    expect(deAncestralidade().filter((e) => e.base.level === 1)).toHaveLength(16);
  });
});
