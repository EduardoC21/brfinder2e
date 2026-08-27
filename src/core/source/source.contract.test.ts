/**
 * TESTE DE CONTRATO — briefing, seção 4.2.
 *
 * Bate no repositório de verdade e afirma que o canal ainda resolve. Não roda no
 * `npm test`: toca a rede, baixa 34 MiB e depende da cota da API do GitHub.
 *
 *   npm run test:contract
 *
 * Roda também em CI toda semana (.github/workflows/contract.yml). O objetivo é que,
 * quando o Foundry reorganizar, a falha apareça aqui e diga o que mudou — em vez de o
 * autor descobrir pelo app quebrado no meio da sessão de jogo.
 *
 * As asserções conferem FORMA, não conteúdo. Contar 43 condições viraria teste de
 * conteúdo e quebraria a cada release novo, sem que nada do contrato tivesse mudado.
 */

import { beforeAll, describe, expect, it } from 'vitest';

import { createFetchHttp } from '@platform/http-fetch';
import { isRecord } from '../json';
import { readTextEntry } from './archive';
import { DEFAULT_CHANNEL, KNOWN_GOOD_TAG } from './channels';
import { loadInventory } from './inventory';
import type { LoadedSource } from './inventory';
import { findAsset, listReleases } from './releases';
import type { ReleaseRef } from './types';

const http = createFetchHttp({ headers: { Accept: 'application/vnd.github+json' } });

let releases: ReleaseRef[];
let loaded: LoadedSource;

beforeAll(async () => {
  releases = await listReleases(http, DEFAULT_CHANNEL);
  loaded = await loadInventory(http, { channel: DEFAULT_CHANNEL, tag: KNOWN_GOOD_TAG });
}, 180_000);

describe('canal release-json-assets', () => {
  it('o repositório publica releases que casam com o padrão de tag', () => {
    expect(releases.length).toBeGreaterThan(0);
    for (const release of releases) {
      expect(release.tag).toMatch(DEFAULT_CHANNEL.tagPattern);
    }
  });

  it('a tag fixada ainda existe', () => {
    const tags = releases.map((release) => release.tag);
    expect(
      tags,
      `KNOWN_GOOD_TAG=${KNOWN_GOOD_TAG} sumiu. Tags: ${tags.slice(0, 5).join(', ')}`,
    ).toContain(KNOWN_GOOD_TAG);
  });

  it('o release tem os dois anexos que o canal declara', () => {
    const release = releases.find((candidate) => candidate.tag === KNOWN_GOOD_TAG);
    expect(release).toBeDefined();
    expect(findAsset(release!, DEFAULT_CHANNEL.asset).size).toBeGreaterThan(1_000_000);
    expect(findAsset(release!, DEFAULT_CHANNEL.manifestAsset).size).toBeGreaterThan(0);
  });
});

describe('manifesto', () => {
  it('identifica o sistema pf2e e casa com a tag', () => {
    expect(loaded.manifest.id).toBe('pf2e');
    expect(KNOWN_GOOD_TAG).toBe(`pf2e-${loaded.manifest.version}`);
  });

  it('declara packs e arquivos de idioma', () => {
    expect(loaded.manifest.packs.length).toBeGreaterThan(0);
    const english = loaded.manifest.languages.filter((entry) => entry.lang === 'en');
    // Briefing 7.7: são quatro, e ler só o primeiro quebra os ChoiceSet.
    expect(english.length).toBeGreaterThanOrEqual(4);
  });
});

describe('arquivo compactado', () => {
  it('tem as duas pastas que o canal espera', () => {
    const names = loaded.inventory.packs.map((pack) => pack.file);
    expect(names.some((name) => name.startsWith(`${DEFAULT_CHANNEL.insideZip.packs}/`))).toBe(true);
    const languages = loaded.inventory.languages.map((entry) => entry.path);
    expect(
      languages.some((path) => path.startsWith(`${DEFAULT_CHANNEL.insideZip.languages}/`)),
    ).toBe(true);
  });

  it('TODO pack declarado no manifesto existe no zip', () => {
    // Se isto quebrar, a regra basename(path) mudou — briefing 7.2.
    expect(loaded.inventory.missing, `packs declarados sem arquivo`).toEqual([]);
  });

  it('todo arquivo de idioma declarado existe no zip', () => {
    const ausentes = loaded.inventory.languages.filter((entry) => entry.size === null);
    expect(ausentes.map((entry) => entry.path)).toEqual([]);
  });

  it('não aparece pack novo fora do manifesto sem ser notado', () => {
    // Não é erro ter entrada nova; é erro ela passar despercebida. O comando
    // `npm run packs` lista isto no relatório.
    expect(loaded.inventory.unlisted.map((entry) => entry.name)).toEqual([]);
  });
});

describe('forma de um pack conhecido', () => {
  it('conditions.json é um array de documentos com a forma esperada', () => {
    const pack = loaded.inventory.packs.find((candidate) => candidate.name === 'conditionitems');
    expect(pack, 'o pack conditionitems sumiu do manifesto').toBeDefined();

    const documents: unknown = JSON.parse(readTextEntry(loaded.zip, pack!.file));
    expect(Array.isArray(documents)).toBe(true);
    expect((documents as unknown[]).length).toBeGreaterThan(20);

    const first = (documents as unknown[])[0];
    expect(isRecord(first)).toBe(true);
    const document = first as Record<string, unknown>;

    for (const key of ['_id', 'name', 'type', 'system']) {
      expect(document, `documento sem "${key}"`).toHaveProperty(key);
    }
    expect(document['type']).toBe('condition');

    // Briefing 7.3: o documento do release traz _stats.compendiumSource, que é o UUID
    // canônico. Se sumir, voltamos a ter que montar o identificador na mão.
    const stats = document['_stats'];
    expect(isRecord(stats)).toBe(true);
    expect((stats as Record<string, unknown>)['compendiumSource']).toMatch(
      /^Compendium\.pf2e\.conditionitems\.Item\./,
    );
  });
});
