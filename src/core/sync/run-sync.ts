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
  readEntries,
  readTextEntry,
  type HttpPort,
  type Progress,
  type ZipChannel,
} from '../source/index';
import { listRetiredRaw, type StorePort } from '../store/index';
import { mergeLanguageFiles } from '../normalization/language';
import { run, type Failure, type NormalizedEntity } from '../normalization/run';
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
  /** Nome do pack no manifesto, usado como chave de `raw/`. */
  readonly packName: string;
  /** Nome da entrada no zip. */
  readonly pack: string;
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
  /**
   * Os bytes do pack, exatamente como saíram do zip. Guardados para a camada `raw/`
   * (briefing 5.2) — que é gravada a partir daqui, nunca a partir da projeção.
   */
  readonly rawBytes: Uint8Array;
}

export interface SyncResult {
  readonly systemId: string;
  readonly systemVersion: string;
  readonly releaseTag: string;
  readonly types: readonly TypeResult[];
  /** Soma de `imported` — o número que a barra de topo mostra. */
  readonly total: number;
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

    const packName = recipe.packs[0];
    const pack = loaded.inventory.packs.find((entry) => entry.name === packName);
    if (!pack) {
      throw new SyncError(
        `A receita "${recipe.type}" pede o pack "${String(packName)}", que não está no manifesto do release ${loaded.release.tag}.`,
      );
    }

    const rawBytes = readEntries(loaded.zip, [pack.file]).get(pack.file);
    if (!rawBytes) throw new SyncError(`Entrada "${pack.file}" não encontrada no arquivo.`);

    let documents: unknown;
    try {
      documents = JSON.parse(new TextDecoder().decode(rawBytes));
    } catch (cause) {
      throw new SyncError(`Não consegui ler ${pack.file} do arquivo compactado.`, { cause });
    }
    if (!Array.isArray(documents)) {
      throw new SyncError(`${pack.file} não é um array de documentos.`);
    }

    const result = run(recipe, documents, { language });

    // Os aposentados passam pela MESMA receita, na mesma execução. É o que garante uma
    // forma só para o front desenhar.
    const retired =
      options.store === undefined
        ? { entities: [], failures: [] }
        : renormalizeRetired(recipe, options.store, language);

    const retiredResult = await retired;

    types.push({
      type: result.type,
      packName: String(packName),
      pack: pack.file,
      total: result.total,
      imported: result.entities.length,
      failed: result.failures.length,
      report: result.report,
      entities: result.entities,
      retiredEntities: retiredResult.entities,
      retiredFailures: retiredResult.failures,
      rawBytes,
    });
  }

  return {
    systemId: loaded.inventory.systemId,
    systemVersion: loaded.inventory.systemVersion,
    releaseTag: loaded.release.tag,
    types,
    total: types.reduce((sum, entry) => sum + entry.imported, 0),
  };
}

/** Roda a receita ATUAL sobre os documentos crus guardados em `raw/retired/<tipo>/`. */
async function renormalizeRetired(
  recipe: Recipe<never, never>,
  store: StorePort,
  language: ReadonlyMap<string, string>,
): Promise<{ entities: readonly NormalizedEntity[]; failures: readonly Failure[] }> {
  const stored = await listRetiredRaw(store, recipe.type);
  if (stored.length === 0) return { entities: [], failures: [] };

  const result = run(
    recipe,
    stored.map((entry) => entry.document),
    { language },
  );
  return { entities: result.entities, failures: result.failures };
}
