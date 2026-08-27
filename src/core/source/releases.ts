/** Resolução de release: listar, filtrar pelo padrão de tag e escolher um. */

import { asArray, asRecord, asString, numberField, stringField } from '../json';
import type { Channel, ZipChannel } from './channels';
import type { HttpPort } from './ports';
import type { AssetRef, ReleaseRef, Version } from './types';

export class ChannelNotImplementedError extends Error {
  constructor(channel: Channel) {
    super(
      `Canal "${channel.id}" (kind: ${channel.kind}) não tem implementação. ` +
        `Só o kind "zip" está pronto — ver src/core/source/channels.ts.`,
    );
    this.name = 'ChannelNotImplementedError';
  }
}

export class ReleaseNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReleaseNotFoundError';
  }
}

/** Extrai a versão de uma tag, ou `null` se ela não casar com o padrão do canal. */
export function parseTag(tag: string, pattern: RegExp): Version | null {
  const match = pattern.exec(tag);
  if (!match) return null;
  const [, major, minor, patch] = match;
  if (major === undefined || minor === undefined || patch === undefined) return null;
  return [Number(major), Number(minor), Number(patch)];
}

/** Ordem decrescente: a mais nova primeiro. */
export function compareVersionsDesc(a: Version, b: Version): number {
  return b[0] - a[0] || b[1] - a[1] || b[2] - a[2];
}

/** Converte a resposta da API do GitHub em releases, descartando o que não casa. */
export function parseReleases(payload: unknown, channel: ZipChannel): ReleaseRef[] {
  const items = asArray(payload, 'releases');
  const releases: ReleaseRef[] = [];

  items.forEach((item, index) => {
    const path = `releases[${String(index)}]`;
    const record = asRecord(item, path);
    const tag = stringField(record, 'tag_name', path);

    const version = parseTag(tag, channel.tagPattern);
    if (version === null) return; // sf2e-*, pf2e-anachronism-* e afins

    const assets = asArray(record['assets'], `${path}.assets`).map((asset, assetIndex) => {
      const assetPath = `${path}.assets[${String(assetIndex)}]`;
      const assetRecord = asRecord(asset, assetPath);
      return {
        name: stringField(assetRecord, 'name', assetPath),
        url: stringField(assetRecord, 'browser_download_url', assetPath),
        size: numberField(assetRecord, 'size', assetPath),
      } satisfies AssetRef;
    });

    releases.push({
      tag,
      version,
      publishedAt: asString(record['published_at'], `${path}.published_at`),
      assets,
    });
  });

  releases.sort((a, b) => compareVersionsDesc(a.version, b.version));
  return releases;
}

export async function listReleases(http: HttpPort, channel: Channel): Promise<ReleaseRef[]> {
  if (channel.kind !== 'zip') throw new ChannelNotImplementedError(channel);
  const payload = await http.getJson(`${channel.releasesUrl}?per_page=100`);
  return parseReleases(payload, channel);
}

/**
 * Escolhe um release. Com `tag`, exige aquele exato; sem `tag`, pega o de maior versão.
 *
 * O padrão do projeto é passar a tag fixada (`KNOWN_GOOD_TAG`) — ver o comentário lá.
 */
export async function resolveRelease(
  http: HttpPort,
  channel: Channel,
  options: { readonly tag?: string } = {},
): Promise<ReleaseRef> {
  const releases = await listReleases(http, channel);
  const [newest] = releases;

  if (newest === undefined) {
    throw new ReleaseNotFoundError(
      `Nenhum release do canal "${channel.id}" casou com o padrão de tag.`,
    );
  }

  const { tag } = options;
  if (tag === undefined) return newest;

  const found = releases.find((release) => release.tag === tag);
  if (!found) {
    const nearby = releases
      .slice(0, 5)
      .map((release) => release.tag)
      .join(', ');
    throw new ReleaseNotFoundError(`Release "${tag}" não existe. Mais recentes: ${nearby}`);
  }
  return found;
}

/** Localiza um anexo pelo nome, com erro legível se sumir. */
export function findAsset(release: ReleaseRef, name: string): AssetRef {
  const asset = release.assets.find((candidate) => candidate.name === name);
  if (!asset) {
    const available = release.assets.map((candidate) => candidate.name).join(', ');
    throw new ReleaseNotFoundError(
      `O release ${release.tag} não tem o anexo "${name}". Anexos: ${available || '(nenhum)'}`,
    );
  }
  return asset;
}
