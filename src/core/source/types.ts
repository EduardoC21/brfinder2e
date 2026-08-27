/** Tipos da camada `source/`: o que existe na fonte, antes de qualquer normalização. */

/** Versão semântica, já separada em números para poder comparar. */
export type Version = readonly [major: number, minor: number, patch: number];

/** Um arquivo anexado a um release do GitHub. */
export interface AssetRef {
  readonly name: string;
  readonly url: string;
  /** Bytes, segundo a API do GitHub. */
  readonly size: number;
}

/** Um release que casa com o padrão de tag do canal. */
export interface ReleaseRef {
  readonly tag: string;
  readonly version: Version;
  readonly publishedAt: string;
  readonly assets: readonly AssetRef[];
}

/** Um pack declarado no manifesto (`system.json`). */
export interface PackDeclaration {
  /** Identificador lógico. Ex.: `conditionitems`. NÃO é o nome do arquivo. */
  readonly name: string;
  /** Caminho de saída do build. Ex.: `packs/conditions`. É daqui que sai o arquivo. */
  readonly path: string;
  /** Rótulo de exibição. Ex.: `Conditions`. */
  readonly label: string;
  /** `Item`, `Actor`, `JournalEntry`, `Macro` ou `RollTable`. */
  readonly type: string;
}

/** Um arquivo de idioma declarado no manifesto. */
export interface LanguageDeclaration {
  readonly lang: string;
  readonly name: string;
  readonly path: string;
}

/** O manifesto do sistema, já validado. */
export interface Manifest {
  readonly id: string;
  readonly version: string;
  readonly packs: readonly PackDeclaration[];
  readonly languages: readonly LanguageDeclaration[];
}

/** Uma entrada dentro do arquivo compactado, com tamanho lido sem descomprimir. */
export interface ArchiveEntry {
  readonly name: string;
  /** Bytes depois de descomprimir. */
  readonly size: number;
  /** Bytes dentro do zip. */
  readonly compressedSize: number;
}

/** Um pack do manifesto cruzado com a entrada correspondente no arquivo. */
export interface PackListing {
  readonly name: string;
  readonly label: string;
  readonly type: string;
  /** Nome da entrada no zip, derivado de `basename(path)`. */
  readonly file: string;
  /** Bytes descomprimidos. `null` quando o arquivo não existe no zip. */
  readonly size: number | null;
}

/**
 * O resultado completo do cruzamento manifesto × arquivo.
 *
 * Segue a filosofia da seção 5.1 do briefing aplicada à camada de fonte: nada some em
 * silêncio. O que o manifesto declara e não existe aparece em `missing`; o que existe no
 * zip e ninguém declarou aparece em `unlisted`.
 */
export interface PackInventory {
  readonly systemId: string;
  readonly systemVersion: string;
  readonly packs: readonly PackListing[];
  /** Declarados no manifesto, ausentes no arquivo. Deveria estar sempre vazio. */
  readonly missing: readonly string[];
  /** Presentes no arquivo e fora do manifesto, já sem `_folders.json` nem `lang/`. */
  readonly unlisted: readonly ArchiveEntry[];
  readonly languages: readonly LanguageListing[];
}

export interface LanguageListing {
  readonly lang: string;
  readonly path: string;
  readonly size: number | null;
}
