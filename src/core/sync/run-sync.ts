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
  PINNED_TAG,
  languageFiles,
  loadInventory,
  readTextEntry,
  type HttpPort,
  type Progress,
  type ZipChannel,
} from '../source/index';
import { mergeLanguageFiles } from '../normalization/language';
import { run } from '../normalization/run';
import type { Recipe } from '../normalization/recipe';
import type { NormalizationReport } from '../normalization/report';

/** Em que ponto a sincronização está. A tela desenha a partir disto. */
export type SyncPhase =
  | { readonly kind: 'resolving' }
  | { readonly kind: 'downloading'; readonly loaded: number; readonly total: number | null }
  | { readonly kind: 'reading' }
  | { readonly kind: 'normalizing'; readonly type: string };

export interface TypeResult {
  readonly type: string;
  readonly pack: string;
  /** Documentos daquele tipo encontrados no pack. */
  readonly total: number;
  readonly imported: number;
  readonly failed: number;
  readonly report: NormalizationReport;
}

export interface SyncResult {
  readonly systemId: string;
  readonly systemVersion: string;
  readonly releaseTag: string;
  readonly types: readonly TypeResult[];
  /** Soma de `imported` — o número que a barra de topo mostra. */
  readonly total: number;
  readonly entitiesByType: ReadonlyMap<string, readonly unknown[]>;
}

export interface SyncOptions {
  readonly channel?: ZipChannel;
  readonly tag?: string | null;
  readonly onPhase?: (phase: SyncPhase) => void;
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
    tag: options.tag === null ? null : (options.tag ?? PINNED_TAG),
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
  const entitiesByType = new Map<string, readonly unknown[]>();

  for (const recipe of recipes) {
    notify({ kind: 'normalizing', type: recipe.type });

    const packName = recipe.packs[0];
    const pack = loaded.inventory.packs.find((entry) => entry.name === packName);
    if (!pack) {
      throw new SyncError(
        `A receita "${recipe.type}" pede o pack "${String(packName)}", que não está no manifesto do release ${loaded.release.tag}.`,
      );
    }

    let documents: unknown;
    try {
      documents = JSON.parse(readTextEntry(loaded.zip, pack.file));
    } catch (cause) {
      throw new SyncError(`Não consegui ler ${pack.file} do arquivo compactado.`, { cause });
    }
    if (!Array.isArray(documents)) {
      throw new SyncError(`${pack.file} não é um array de documentos.`);
    }

    const result = run(recipe, documents, { language });

    types.push({
      type: result.type,
      pack: pack.file,
      total: result.total,
      imported: result.entities.length,
      failed: result.failures.length,
      report: result.report,
    });
    entitiesByType.set(result.type, result.entities);
  }

  return {
    systemId: loaded.inventory.systemId,
    systemVersion: loaded.inventory.systemVersion,
    releaseTag: loaded.release.tag,
    types,
    total: types.reduce((sum, entry) => sum + entry.imported, 0),
    entitiesByType,
  };
}
