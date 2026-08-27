/**
 * Cruzamento manifesto × arquivo compactado.
 *
 * É aqui que a regra do briefing 7.2 vira código: o arquivo no zip é o `basename` do
 * `path` do manifesto, não o `name`. Errar isso faz 97 packs "sumirem" de uma vez.
 *
 * Nada some em silêncio (mesma filosofia da seção 5.1, aplicada à fonte): o que o
 * manifesto declara e não existe vai para `missing`; o que existe no zip e ninguém
 * declarou vai para `unlisted`.
 */

import type { ZipChannel } from './channels';
import type { ArchiveEntry, LanguageListing, Manifest, PackInventory, PackListing } from './types';

/**
 * Entradas que existem no zip de propósito e não são pack nem idioma.
 * `_folders.json` são as pastas do compêndio — briefing 7.2 manda ignorar.
 */
function isKnownNonPack(name: string, channel: ZipChannel): boolean {
  return name.endsWith('_folders.json') || name.startsWith(`${channel.insideZip.languages}/`);
}

export function buildInventory(
  manifest: Manifest,
  entries: readonly ArchiveEntry[],
  channel: ZipChannel,
): PackInventory {
  const sizeByName = new Map(entries.map((entry) => [entry.name, entry.size]));

  const packs: PackListing[] = manifest.packs.map((pack) => {
    const file = channel.packFile(pack);
    return {
      name: pack.name,
      label: pack.label,
      type: pack.type,
      file,
      size: sizeByName.get(file) ?? null,
    } satisfies PackListing;
  });

  const missing = packs.filter((pack) => pack.size === null).map((pack) => pack.file);

  const declared = new Set(packs.map((pack) => pack.file));
  const unlisted = entries.filter(
    (entry) => !declared.has(entry.name) && !isKnownNonPack(entry.name, channel),
  );

  const languages: LanguageListing[] = manifest.languages.map((language) => ({
    lang: language.lang,
    path: language.path,
    size: sizeByName.get(language.path) ?? null,
  }));

  return {
    systemId: manifest.id,
    systemVersion: manifest.version,
    packs,
    missing,
    unlisted,
    languages,
  };
}

/** Soma dos tamanhos descomprimidos dos packs presentes. */
export function totalPackSize(inventory: PackInventory): number {
  return inventory.packs.reduce((sum, pack) => sum + (pack.size ?? 0), 0);
}

/** Ordena por tamanho decrescente — o que interessa olhar primeiro é o maior. */
export function sortBySizeDesc(packs: readonly PackListing[]): PackListing[] {
  return [...packs].sort((a, b) => (b.size ?? -1) - (a.size ?? -1));
}
