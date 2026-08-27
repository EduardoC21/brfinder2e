/**
 * A orquestração da camada: canal -> release -> manifesto -> zip -> inventário.
 *
 * É o único ponto que a tela de sincronização (Etapa 4) vai chamar. Recebe a porta HTTP
 * por parâmetro, então não sabe se está rodando em Node, no navegador ou no Tauri.
 */

import { DEFAULT_CHANNEL, KNOWN_GOOD_TAG, type ZipChannel } from './channels';
import { listEntries } from './archive';
import { parseManifest } from './manifest';
import { buildInventory } from './packs';
import type { HttpPort, Progress } from './ports';
import { findAsset, resolveRelease } from './releases';
import type { Manifest, PackInventory, ReleaseRef } from './types';

export interface LoadInventoryOptions {
  readonly channel?: ZipChannel;
  /**
   * Ausente: usa a tag fixada (`KNOWN_GOOD_TAG`), que é o comportamento de produção.
   * `null`: usa o release mais recente que casar com o padrão do canal.
   * String: exige aquela tag exata.
   */
  readonly tag?: string | null;
  /** Release já resolvido. Evita uma segunda chamada à API quando quem chama já resolveu. */
  readonly release?: ReleaseRef;
  /** Zip já em mãos. Pula o download — o comando usa isto para não rebaixar 34 MB. */
  readonly cachedZip?: Uint8Array;
  readonly onProgress?: (progress: Progress) => void;
}

export interface LoadedSource {
  readonly release: ReleaseRef;
  readonly manifest: Manifest;
  readonly inventory: PackInventory;
  /** O zip cru, para quem for ler packs depois sem baixar de novo. */
  readonly zip: Uint8Array;
  /** `true` quando o zip veio de `cachedZip` em vez da rede. */
  readonly fromCache: boolean;
}

export async function loadInventory(
  http: HttpPort,
  options: LoadInventoryOptions = {},
): Promise<LoadedSource> {
  const channel: ZipChannel = options.channel ?? DEFAULT_CHANNEL;
  const tag = options.tag === null ? undefined : (options.tag ?? KNOWN_GOOD_TAG);

  const release =
    options.release ?? (await resolveRelease(http, channel, tag === undefined ? {} : { tag }));

  const manifestAsset = findAsset(release, channel.manifestAsset);
  const manifest = parseManifest(await http.getJson(manifestAsset.url));

  const zipAsset = findAsset(release, channel.asset);
  const fromCache = options.cachedZip !== undefined;
  const zip = options.cachedZip ?? (await http.getBytes(zipAsset.url, options.onProgress));

  const entries = listEntries(zip);
  const inventory = buildInventory(manifest, entries, channel);

  return { release, manifest, inventory, zip, fromCache };
}
