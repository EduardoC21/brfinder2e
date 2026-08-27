import { describe, expect, it } from 'vitest';

import { DEFAULT_CHANNEL } from './channels';
import type { HttpPort } from './ports';
import {
  ReleaseNotFoundError,
  compareVersionsDesc,
  findAsset,
  parseReleases,
  parseTag,
  resolveRelease,
} from './releases';

/** Porta falsa: devolve o que o teste mandar, sem tocar na rede. */
function fakeHttp(json: unknown): HttpPort {
  return {
    getJson: () => Promise.resolve(json),
    getBytes: () => Promise.reject(new Error('não deveria baixar bytes neste teste')),
  };
}

function release(tag: string, assets: readonly string[] = ['json-assets.zip', 'system.json']) {
  return {
    tag_name: tag,
    published_at: '2026-08-17T00:00:00Z',
    assets: assets.map((name) => ({
      name,
      browser_download_url: `https://example.test/${tag}/${name}`,
      size: 100,
    })),
  };
}

describe('parseTag', () => {
  it('aceita o padrão do sistema', () => {
    expect(parseTag('pf2e-8.4.1', DEFAULT_CHANNEL.tagPattern)).toEqual([8, 4, 1]);
  });

  // Briefing 7.1: foi exatamente este engano que quebrou uma tentativa anterior.
  it('rejeita os módulos que dividem o repositório', () => {
    for (const tag of ['sf2e-1.4.1', 'pf2e-anachronism-2.3.0', 'pf2e-8.4', 'v8.4.1']) {
      expect(parseTag(tag, DEFAULT_CHANNEL.tagPattern)).toBeNull();
    }
  });
});

describe('compareVersionsDesc', () => {
  it('ordena da mais nova para a mais velha, respeitando cada posição', () => {
    const versions = [
      [8, 1, 2],
      [8, 4, 1],
      [7, 9, 1],
      [8, 4, 0],
      [10, 0, 0],
    ] as const;
    const sorted = [...versions].sort(compareVersionsDesc);
    expect(sorted).toEqual([
      [10, 0, 0],
      [8, 4, 1],
      [8, 4, 0],
      [8, 1, 2],
      [7, 9, 1],
    ]);
  });
});

describe('parseReleases', () => {
  it('descarta o que não casa e ordena por versão', () => {
    const parsed = parseReleases(
      [release('sf2e-1.4.1'), release('pf2e-8.1.2'), release('pf2e-8.4.1')],
      DEFAULT_CHANNEL,
    );
    expect(parsed.map((item) => item.tag)).toEqual(['pf2e-8.4.1', 'pf2e-8.1.2']);
  });

  it('aponta o campo exato quando a forma muda', () => {
    expect(() => parseReleases([{ tag_name: 42 }], DEFAULT_CHANNEL)).toThrow(
      /releases\[0\]\.tag_name: esperado string/,
    );
  });
});

describe('resolveRelease', () => {
  const payload = [release('pf2e-8.4.1'), release('pf2e-8.4.0'), release('sf2e-1.4.1')];

  it('sem tag, escolhe a maior versão', async () => {
    const found = await resolveRelease(fakeHttp(payload), DEFAULT_CHANNEL);
    expect(found.tag).toBe('pf2e-8.4.1');
  });

  it('com tag, exige aquela exata', async () => {
    const found = await resolveRelease(fakeHttp(payload), DEFAULT_CHANNEL, { tag: 'pf2e-8.4.0' });
    expect(found.tag).toBe('pf2e-8.4.0');
  });

  it('falha com mensagem útil quando a tag não existe', async () => {
    await expect(
      resolveRelease(fakeHttp(payload), DEFAULT_CHANNEL, { tag: 'pf2e-9.9.9' }),
    ).rejects.toThrow(/não existe.*pf2e-8\.4\.1/s);
  });

  it('falha quando nenhum release casa com o padrão', async () => {
    await expect(
      resolveRelease(fakeHttp([release('sf2e-1.4.1')]), DEFAULT_CHANNEL),
    ).rejects.toThrow(ReleaseNotFoundError);
  });
});

describe('findAsset', () => {
  it('lista os anexos disponíveis quando o pedido some', () => {
    const [found] = parseReleases([release('pf2e-8.4.1', ['system.json'])], DEFAULT_CHANNEL);
    expect(() => findAsset(found!, 'json-assets.zip')).toThrow(/não tem o anexo.*system\.json/s);
  });
});
