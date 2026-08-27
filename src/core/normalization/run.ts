/**
 * O motor: roda uma receita sobre um conjunto de documentos.
 *
 * Duas saídas, e a segunda é tão importante quanto a primeira:
 *
 *   1. as entidades normalizadas (e as que falharam, com o motivo)
 *   2. o relatório de não mapeados (briefing 5.1)
 *
 * O motor não grava nada. Persistência é a camada `store/`.
 */

import { isRecord } from '../json';
import { DecodeError } from './decoders';
import { resolveTemplate, type Field } from './field';
import { collectPaths, emptyCoverage, isCovered, readPath, type Coverage } from './paths';
import { IDENTITY_PATHS, type FieldMap, type Recipe } from './recipe';
import { buildReport, type NormalizationReport } from './report';

/** Tabela de idioma já fundida: chave achatada -> texto. Ver briefing 7.7. */
export type LanguageTable = ReadonlyMap<string, string>;

export interface Identity {
  readonly id: string;
  readonly uuid: string;
  readonly type: string;
}

export interface NormalizedEntity<TBase = unknown, TDesc = unknown> {
  readonly identity: Identity;
  readonly base: TBase;
  readonly desc: TDesc;
}

export interface Failure {
  /** `_id` do documento, ou `?` se nem isso deu para ler. */
  readonly id: string;
  readonly name: string;
  readonly path: string;
  readonly message: string;
}

export interface RunResult<TBase = unknown, TDesc = unknown> {
  readonly type: string;
  readonly total: number;
  readonly entities: readonly NormalizedEntity<TBase, TDesc>[];
  readonly failures: readonly Failure[];
  readonly report: NormalizationReport;
}

export interface RunOptions {
  readonly language?: LanguageTable;
  /** ID de pasta -> nome da pasta raiz. Ver `core/source/folders.ts`. */
  readonly folders?: ReadonlyMap<string, string>;
}

class MissingFieldError extends Error {
  readonly path: string;
  constructor(path: string) {
    super(`${path}: ausente, e o campo não é opcional nem tem valor padrão`);
    this.name = 'MissingFieldError';
    this.path = path;
  }
}

export function run<TBase, TDesc>(
  recipe: Recipe<TBase, TDesc>,
  documents: readonly unknown[],
  options: RunOptions = {},
): RunResult<TBase, TDesc> {
  const entities: NormalizedEntity<TBase, TDesc>[] = [];
  const failures: Failure[] = [];

  // Inventário de tudo que existe, e cobertura do que a receita tocou.
  const inventory = new Map<string, unknown>();
  const frequency = new Map<string, number>();
  const coverage = emptyCoverage();

  for (const path of IDENTITY_PATHS) coverage.subtree.add(path);
  for (const path of Object.keys(recipe.ignore)) coverage.subtree.add(path);
  for (const path of Object.keys(recipe.defer)) coverage.subtree.add(path);

  const matching = documents.filter((document) => documentType(document) === recipe.type);

  for (const document of matching) {
    const paths = collectPaths(document);
    for (const [path, example] of paths) {
      if (!inventory.has(path)) inventory.set(path, example);
      frequency.set(path, (frequency.get(path) ?? 0) + 1);
    }

    try {
      entities.push(normalizeOne(recipe, document, coverage, options));
    } catch (error) {
      failures.push(toFailure(document, error));
    }
  }

  const unmapped = [...inventory.keys()]
    .filter((path) => !isCovered(path, coverage))
    .map((path) => ({
      path,
      count: frequency.get(path) ?? 0,
      example: inventory.get(path),
    }));

  return {
    type: recipe.type,
    total: matching.length,
    entities,
    failures,
    report: buildReport(recipe, matching.length, unmapped),
  };
}

function documentType(document: unknown): string | null {
  if (!isRecord(document)) return null;
  const type = document['type'];
  return typeof type === 'string' ? type : null;
}

function normalizeOne<TBase, TDesc>(
  recipe: Recipe<TBase, TDesc>,
  document: unknown,
  coverage: Coverage,
  options: RunOptions,
): NormalizedEntity<TBase, TDesc> {
  return {
    identity: readIdentity(document),
    // A conversão acontece num ponto só. `FieldMapFor<T>` já garantiu, na declaração da
    // receita, que cada campo produz o tipo certo — o motor só monta o objeto.
    base: readBlock(recipe.base, document, coverage, options) as TBase,
    desc: readBlock(recipe.desc, document, coverage, options) as TDesc,
  };
}

function readIdentity(document: unknown): Identity {
  const id = readPath(document, '_id');
  const uuid = readPath(document, '_stats.compendiumSource');
  const type = readPath(document, 'type');
  return {
    id: typeof id.value === 'string' ? id.value : '?',
    // Briefing 7.3: o UUID canônico vem pronto. Ausente é possível em dado antigo.
    uuid: typeof uuid.value === 'string' ? uuid.value : '',
    type: typeof type.value === 'string' ? type.value : '?',
  };
}

function readBlock(
  fields: FieldMap,
  document: unknown,
  coverage: Coverage,
  options: RunOptions,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [name, field] of Object.entries(fields)) {
    const value = readField(field, document, coverage, options);
    if (value !== undefined) out[name] = value;
  }
  return out;
}

function readField(
  field: Field<unknown>,
  document: unknown,
  coverage: Coverage,
  options: RunOptions,
): unknown {
  const found =
    field.source === 'document'
      ? readFromDocument(field, document, coverage)
      : field.source === 'folder'
        ? readFromFolder(field, document, coverage, options.folders)
        : readFromLanguage(field, document, options.language);

  if (!found.present) {
    if (field.fallback !== null) return applyTransform(field, field.fallback.value);
    if (field.isOptional) return undefined;
    throw new MissingFieldError(field.path);
  }

  return applyTransform(field, field.decoder.decode(found.value, field.path));
}

function applyTransform(field: Field<unknown>, value: unknown): unknown {
  return field.transform === null ? value : field.transform(value);
}

interface Found {
  readonly present: boolean;
  readonly value: unknown;
}

function readFromDocument(field: Field<unknown>, document: unknown, coverage: Coverage): Found {
  const read = readPath(document, field.path);
  if (!read.found) return { present: false, value: undefined };
  // A cobertura é registrada mesmo se a decodificação falhar depois: o caminho FOI lido,
  // e listá-lo como não mapeado seria mentira.
  field.decoder.cover(read.value, field.path, coverage);
  return { present: true, value: read.value };
}

/**
 * Lê o ID de pasta do documento e troca pelo nome da raiz.
 *
 * A COBERTURA é registrada mesmo quando a tabela não tem o ID: o caminho `folder` foi
 * lido de qualquer jeito, e listá-lo como não mapeado seria mentira.
 */
function readFromFolder(
  field: Field<unknown>,
  document: unknown,
  coverage: Coverage,
  folders: ReadonlyMap<string, string> | undefined,
): Found {
  const read = readPath(document, field.path);
  if (!read.found) return { present: false, value: undefined };
  coverage.subtree.add(field.path);

  if (typeof read.value !== 'string' || folders === undefined) {
    return { present: false, value: undefined };
  }
  const name = folders.get(read.value);
  return name === undefined ? { present: false, value: undefined } : { present: true, value: name };
}

function readFromLanguage(
  field: Field<unknown>,
  document: unknown,
  language: LanguageTable | undefined,
): Found {
  if (!language) return { present: false, value: undefined };

  const key = resolveTemplate(field.path, (path) => {
    const read = readPath(document, path);
    return typeof read.value === 'string' ? read.value : null;
  });
  if (key === null) return { present: false, value: undefined };

  const value = language.get(key);
  return value === undefined ? { present: false, value: undefined } : { present: true, value };
}

function toFailure(document: unknown, error: unknown): Failure {
  const id = readPath(document, '_id');
  const name = readPath(document, 'name');
  const path =
    error instanceof DecodeError || error instanceof MissingFieldError
      ? error.path
      : '(desconhecido)';
  return {
    id: typeof id.value === 'string' ? id.value : '?',
    name: typeof name.value === 'string' ? name.value : '?',
    path,
    message: error instanceof Error ? error.message : String(error),
  };
}
