/**
 * A sincronização de ponta a ponta: release → zip → packs → receitas → entidades.
 *
 * Amarra `source/` e `normalization/` sem que nenhuma das duas conheça a outra. Fica
 * fora de React de propósito: é lógica pura, testável em Node, e o mesmo código serve o
 * botão da engrenagem e um eventual comando de linha.
 *
 * Não grava nada. Persistência é a Etapa 4b (`core/store/`).
 */

import {
  DEFAULT_CHANNEL,
  KNOWN_GOOD_TAG,
  languageFiles,
  loadInventory,
  parseFolderRoots,
  readEntries,
  readTextEntry,
  type FolderRoots,
  type HttpPort,
  type PackListing,
  type Progress,
  type ZipChannel,
} from '../source/index';
import { buildTraitGlossary, type TraitGlossary } from '../glossary/index';
import { listRetiredRaw, type StorePort } from '../store/index';
import { mergeLanguageFiles } from '../normalization/language';
import { run, type PackDocuments, type Failure, type NormalizedEntity } from '../normalization/run';
import type { Recipe } from '../normalization/recipe';
import type { NormalizationReport } from '../normalization/report';
import { findUnreadPacks, type PackContents, type UnreadPack } from './unread-packs';

/** Em que ponto a sincronização está. A tela desenha a partir disto. */
export type SyncPhase =
  | { readonly kind: 'resolving' }
  | { readonly kind: 'downloading'; readonly loaded: number; readonly total: number | null }
  | { readonly kind: 'reading' }
  | { readonly kind: 'normalizing'; readonly type: string };

/** Um pack que alimenta uma receita, com os bytes exatos como saíram do zip. */
export interface PackSource {
  /** Nome no manifesto. É a chave de `raw/`. */
  readonly name: string;
  /** Nome da entrada no zip. */
  readonly file: string;
  readonly rawBytes: Uint8Array;
}

export interface TypeResult {
  readonly type: string;
  /**
   * TODOS os packs da receita, não só o primeiro. `action` lê dois: `actionspf2e` e
   * `adventure-specific-actions`.
   */
  readonly packs: readonly PackSource[];
  /** Documentos daquele tipo encontrados no pack. */
  readonly total: number;
  readonly imported: number;
  readonly failed: number;
  readonly report: NormalizationReport;
  readonly entities: readonly NormalizedEntity[];
  /**
   * Os APOSENTADOS, renormalizados pela receita ATUAL a partir de `raw/retired/`.
   *
   * Sem isto, a projeção do aposentado ficaria congelada na receita da época em que ele
   * sumiu, e o front teria duas formas do mesmo tipo para desenhar. Com isto, aposentado
   * é entidade normal que por acaso tem uma marca.
   */
  readonly retiredEntities: readonly NormalizedEntity[];
  /**
   * Aposentados que a receita ATUAL não conseguiu ler.
   *
   * Não é estado a contornar: é sinal de que a receita exige um campo que nem sempre
   * existiu. O conserto é marcar o campo como opcional. Enquanto isso, a projeção
   * anterior daquele aposentado é mantida.
   */
  readonly retiredFailures: readonly Failure[];
}

export interface SyncResult {
  readonly systemId: string;
  readonly systemVersion: string;
  readonly releaseTag: string;
  readonly types: readonly TypeResult[];
  /** Soma de `imported` — o número que a barra de topo mostra. */
  readonly total: number;
  /**
   * Packs do release que trazem um tipo que importamos e que nenhuma receita lê.
   *
   * Quase sempre vazio, e é isso que o torna útil: quando não está, apareceu conteúdo
   * novo que merece uma decisão sua. Ver `unread-packs.ts`.
   */
  readonly unreadPacks: readonly UnreadPack[];
  /**
   * O que cada traço quer dizer, lido da tabela de idioma. Ver `core/glossary/traits.ts`.
   *
   * Vem junto com as entradas porque nasce do mesmo zip e envelhece com ele: uma versão
   * nova do Foundry pode trazer traço novo com descrição nova, e as duas coisas têm de
   * chegar juntas.
   */
  readonly traitGlossary: TraitGlossary;
}

export interface SyncOptions {
  readonly channel?: ZipChannel;
  readonly tag?: string | null;
  readonly onPhase?: (phase: SyncPhase) => void;
  /**
   * Quando presente, os aposentados guardados nele são renormalizados junto. Ausente, o
   * resultado traz só o que veio do pack — é o caso do comando de linha.
   */
  readonly store?: StorePort;
}

export class SyncError extends Error {
  constructor(message: string, options?: { cause: unknown }) {
    super(message, options);
    this.name = 'SyncError';
  }
}

export async function runSync(
  http: HttpPort,
  recipes: readonly Recipe<never, never>[],
  options: SyncOptions = {},
): Promise<SyncResult> {
  const channel = options.channel ?? DEFAULT_CHANNEL;
  const notify = options.onPhase ?? ((): void => undefined);

  notify({ kind: 'resolving' });

  const loaded = await loadInventory(http, {
    channel,
    tag: options.tag === null ? null : (options.tag ?? KNOWN_GOOD_TAG),
    onProgress: (progress: Progress) => {
      notify({ kind: 'downloading', loaded: progress.loaded, total: progress.total });
    },
  });

  notify({ kind: 'reading' });

  // Os QUATRO arquivos do inglês, fundidos na ordem do manifesto (briefing 7.7).
  const language = mergeLanguageFiles(
    languageFiles(loaded.manifest, 'en').map(
      (entry) => JSON.parse(readTextEntry(loaded.zip, entry.path)) as unknown,
    ),
  );

  const types: TypeResult[] = [];

  for (const recipe of recipes) {
    notify({ kind: 'normalizing', type: recipe.type });

    /*
     * Os documentos vão para o motor AGRUPADOS por pack, cada um com a tabela de pastas
     * dele. Achatados, a origem se perdia — e a origem é o que carimba o setor de quem
     * não está em pasta nenhuma.
     */
    const packs: PackSource[] = [];
    const sources: PackDocuments[] = [];

    for (const declared of recipe.packs) {
      const pack = loaded.inventory.packs.find((entry) => entry.name === declared.name);
      if (!pack) {
        throw new SyncError(
          `A receita "${recipe.type}" pede o pack "${declared.name}", que não está no manifesto do release ${loaded.release.tag}.`,
        );
      }

      const rawBytes = readEntries(loaded.zip, [pack.file]).get(pack.file);
      if (!rawBytes) throw new SyncError(`Entrada "${pack.file}" não encontrada no arquivo.`);

      let parsed: unknown;
      try {
        parsed = JSON.parse(new TextDecoder().decode(rawBytes));
      } catch (cause) {
        throw new SyncError(`Não consegui ler ${pack.file} do arquivo compactado.`, { cause });
      }
      if (!Array.isArray(parsed)) {
        throw new SyncError(`${pack.file} não é um array de documentos.`);
      }

      packs.push({ name: declared.name, file: pack.file, rawBytes });

      const folders = readFolders(loaded, channel, declared.name);
      sources.push({
        pack: declared.name,
        // `Array.isArray` sobre `unknown` estreita para `any[]`; a conversão devolve
        // `unknown[]`, que é o que de fato sabemos.
        documents: parsed as unknown[],
        ...(folders === null ? {} : { folders }),
      });
    }

    const result = run(recipe, sources, { language });

    // Os aposentados passam pela MESMA receita, na mesma execução. É o que garante uma
    // forma só para o front desenhar.
    const retired =
      options.store === undefined
        ? { entities: [], failures: [] }
        : renormalizeRetired(recipe, options.store, language, mergeFolders(sources));

    const retiredResult = await retired;

    types.push({
      type: result.type,
      packs,
      total: result.total,
      imported: result.entities.length,
      failed: result.failures.length,
      report: result.report,
      entities: result.entities,
      retiredEntities: retiredResult.entities,
      retiredFailures: retiredResult.failures,
    });
  }

  return {
    systemId: loaded.inventory.systemId,
    systemVersion: loaded.inventory.systemVersion,
    releaseTag: loaded.release.tag,
    unreadPacks: scanUnreadPacks(loaded, recipes),
    types,
    total: types.reduce((sum, entry) => sum + entry.imported, 0),
    traitGlossary: buildTraitGlossary(language),
  };
}

/**
 * Lê `<pack>_folders.json`, se existir.
 *
 * Nem todo pack tem: são 54 arquivos de pasta para 98 packs. Ausência não é erro — quem
 * usa `fromSector` cai no carimbo declarado no pack.
 */
function readFolders(
  loaded: {
    readonly zip: Uint8Array;
    readonly manifest: {
      readonly packs: readonly { readonly name: string; readonly path: string }[];
    };
  },
  channel: ZipChannel,
  packName: string,
): FolderRoots | null {
  const declaration = loaded.manifest.packs.find((entry) => entry.name === packName);
  if (!declaration) return null;
  try {
    const raw = readTextEntry(
      loaded.zip,
      channel.packFoldersFile({ ...declaration, label: '', type: '' }),
    );
    return parseFolderRoots(JSON.parse(raw));
  } catch {
    return null;
  }
}

/**
 * Varre TODOS os packs do release só para saber quais tipos cada um traz.
 *
 * Custa ~1,1 s medido no `pf2e-8.5.0` (98 packs, 29.617 documentos) — cabe numa
 * sincronização que já baixa 36 MiB e leva vários segundos. Não vale gastar uma porta de
 * configuração para economizar isso.
 *
 * Falha de leitura num pack é ignorada de propósito: isto é um AVISO, e um aviso que
 * derruba a sincronização é pior que aviso nenhum.
 */
function scanUnreadPacks(
  loaded: {
    readonly zip: Uint8Array;
    readonly inventory: { readonly packs: readonly PackListing[] };
  },
  recipes: readonly Recipe<never, never>[],
): readonly UnreadPack[] {
  const lidos = new Set(recipes.flatMap((recipe) => recipe.packs.map((pack) => pack.name)));
  const importados = new Set(recipes.map((recipe) => recipe.type));

  const contents: PackContents[] = [];
  for (const pack of loaded.inventory.packs) {
    if (lidos.has(pack.name)) continue;
    try {
      const bytes = readEntries(loaded.zip, [pack.file]).get(pack.file);
      if (!bytes) continue;
      const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
      if (!Array.isArray(parsed)) continue;
      contents.push({
        pack: pack.name,
        types: (parsed as { type?: unknown }[]).map((doc) =>
          typeof doc.type === 'string' ? doc.type : '',
        ),
      });
    } catch {
      // Pack ilegível não vira erro de sincronização — vira ausência de aviso.
    }
  }

  return findUnreadPacks(contents, lidos, importados);
}

/** Junta as tabelas de pasta de todos os packs da receita, para os aposentados. */
function mergeFolders(sources: readonly PackDocuments[]): ReadonlyMap<string, string> {
  const todas = new Map<string, string>();
  for (const source of sources) {
    if (source.folders === undefined) continue;
    for (const [id, name] of source.folders) todas.set(id, name);
  }
  return todas;
}

/**
 * Roda a receita ATUAL sobre os documentos crus guardados em `raw/retired/<tipo>/`.
 *
 * ⚠️ O aposentado não sabe de qual PACK veio: `raw/retired/<tipo>/<chave>` guarda só o
 * documento. Então ele recebe as tabelas de pasta de todos os packs da receita — a chave
 * de pasta está no próprio documento e resolve certo — mas NÃO recebe carimbo de setor.
 *
 * O efeito visível: um aposentado que estava numa pasta mantém o setor; um que vinha de
 * pack sem pastas fica com o setor vazio. Vazio é honesto — "não sei" — enquanto carimbar
 * seria adivinhar. O conserto de verdade é gravar o pack junto do documento aposentado, e
 * isso muda a forma do armazenamento.
 */
async function renormalizeRetired(
  recipe: Recipe<never, never>,
  store: StorePort,
  language: ReadonlyMap<string, string>,
  folders: ReadonlyMap<string, string>,
): Promise<{ entities: readonly NormalizedEntity[]; failures: readonly Failure[] }> {
  const stored = await listRetiredRaw(store, recipe.type);
  if (stored.length === 0) return { entities: [], failures: [] };

  const result = run(
    recipe,
    [
      {
        pack: '(aposentados)',
        documents: stored.map((entry) => entry.document),
        folders,
      },
    ],
    { language },
  );
  return { entities: result.entities, failures: result.failures };
}
