/**
 * Procurar versão nova, sem baixar 34 MiB para descobrir que não há nenhuma.
 *
 * A checagem barata usa só o `system.json` do release (~50 KiB): dá para saber se os packs
 * que as receitas pedem continuam declarados. É o bastante para pegar a quebra mais
 * provável — pack renomeado ou removido do manifesto.
 *
 * O que ela NÃO pega é campo que mudou de tipo dentro de um documento. Isso só aparece ao
 * rodar as receitas, e por isso a regra de aceitação está em quem chama: uma atualização
 * de versão só é gravada se rodar com ZERO falhas de decodificação. Se falhar, a base
 * anterior continua valendo — o app segue na última versão compatível, que é exatamente o
 * comportamento pedido.
 */

import {
  DEFAULT_CHANNEL,
  findAsset,
  listReleases,
  parseManifest,
  type HttpPort,
  type ReleaseRef,
  type ZipChannel,
} from '../source/index';
import type { Recipe } from '../normalization/recipe';

export interface UpdateCheck {
  /** A tag em uso hoje, ou `null` numa instalação nova. */
  readonly current: string | null;
  /** O release mais recente que o canal enxerga. */
  readonly newest: ReleaseRef;
  /** `true` quando o mais recente é diferente do que está em uso. */
  readonly hasUpdate: boolean;
  /**
   * Packs que as receitas pedem e o manifesto do candidato não declara. Vazio é o normal;
   * qualquer coisa aqui significa que o app precisa de uma atualização antes de subir.
   */
  readonly missingPacks: readonly string[];
}

export async function checkForUpdate(
  http: HttpPort,
  recipes: readonly Recipe<never, never>[],
  current: string | null,
  channel: ZipChannel = DEFAULT_CHANNEL,
): Promise<UpdateCheck> {
  const releases = await listReleases(http, channel);
  const [newest] = releases;
  if (newest === undefined) {
    throw new Error(`Nenhum release do canal "${channel.id}" casou com o padrão de tag.`);
  }

  const manifestAsset = findAsset(newest, channel.manifestAsset);
  const manifest = parseManifest(await http.getJson(manifestAsset.url));
  const declared = new Set(manifest.packs.map((pack) => pack.name));

  const wanted = new Set(recipes.flatMap((recipe) => recipe.packs));
  const missingPacks = [...wanted].filter((pack) => !declared.has(pack)).sort();

  return {
    current,
    newest,
    hasUpdate: current !== newest.tag,
    missingPacks,
  };
}
