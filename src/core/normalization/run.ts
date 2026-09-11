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
import { expandLocalize } from '../markup/localize';
import { DecodeError } from './decoders';
import { resolveTemplate, type Field } from './field';
import type { JournalPages } from './journals';
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
  /** As páginas de jornal por `<jornal>/<página>`. Ver `fromJournal`. */
  readonly journals?: JournalPages;
}

/**
 * Os documentos de UM pack, com o que só o pack sabe.
 *
 * O motor recebe os documentos agrupados por pack, e não uma lista achatada. Achatada, a
 * origem se perdia — e a origem é informação: é ela que diz que uma ação veio do glossário
 * de bestiário e não do pack de ações de PJ, distinção que campo nenhum do documento faz.
 *
 * A tabela de pastas também é por pack. Fundir as tabelas de vários packs funcionaria por
 * sorte: os ids são gerados por pack e nada garante que não colidam.
 */
export interface PackDocuments {
  /** `name` do manifesto, para casar com o `PackSource` da receita. */
  readonly pack: string;
  readonly documents: readonly unknown[];
  /** `<pack>_folders.json` resolvido. Ausente quando o pack não tem esse arquivo. */
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
  sources: readonly PackDocuments[],
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

  /*
   * O CONTEXTO DO PACK acompanha cada documento.
   *
   * `sector` e `folders` vêm daqui, e não das opções globais: dois packs da mesma receita
   * podem ter tabelas de pasta diferentes, e um deles pode não ter tabela nenhuma.
   */
  let matching = 0;

  for (const source of sources) {
    const declared = recipe.packs.find((entry) => entry.name === source.pack);
    const context: PackContext = {
      sector: declared?.sector ?? '',
      ...(source.folders === undefined ? {} : { folders: source.folders }),
    };

    for (const document of source.documents) {
      /*
       * A EXPANSÃO vem antes do filtro: perícia nasce de uma tabela dentro de uma página de
       * jornal, e é o expansor que produz os documentos com `type`. Ver `expand`.
       */
      const documentos = recipe.expand === null ? [document] : recipe.expand(document);

      for (const documento of documentos) {
        // `accepts`, e não `type`: equipamento é uma receita para nove tipos do Foundry.
        if (!recipe.accepts.includes(documentType(documento) ?? '')) continue;
        matching++;

        const paths = collectPaths(documento);
        for (const [path, example] of paths) {
          if (!inventory.has(path)) inventory.set(path, example);
          frequency.set(path, (frequency.get(path) ?? 0) + 1);
        }

        try {
          entities.push(normalizeOne(recipe, documento, coverage, options, context));
        } catch (error) {
          failures.push(toFailure(documento, error));
        }
      }
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
    total: matching,
    entities,
    failures,
    report: buildReport(recipe, matching, unmapped),
  };
}

function documentType(document: unknown): string | null {
  if (!isRecord(document)) return null;
  const type = document['type'];
  return typeof type === 'string' ? type : null;
}

/** O que o pack sabe e o documento não. */
interface PackContext {
  readonly sector: string;
  readonly folders?: ReadonlyMap<string, string>;
}

function normalizeOne<TBase, TDesc>(
  recipe: Recipe<TBase, TDesc>,
  document: unknown,
  coverage: Coverage,
  options: RunOptions,
  context: PackContext,
): NormalizedEntity<TBase, TDesc> {
  return {
    identity: readIdentity(document),
    // A conversão acontece num ponto só. `FieldMapFor<T>` já garantiu, na declaração da
    // receita, que cada campo produz o tipo certo — o motor só monta o objeto.
    base: readBlock(recipe.base, document, coverage, options, context) as TBase,
    /*
     * O `@Localize` é expandido AQUI, e só no bloco de descrição.
     *
     * Ele não referencia outra entrada: é texto que mora na tabela de idioma em vez de
     * morar no pack, e a tabela só existe neste ponto do caminho — a tela recebe o
     * `desc/` já gravado, sem tabela nenhuma junto. Expandir uma vez na normalização é
     * mais barato que carregar 11.802 chaves no navegador para resolver 7.629 tokens.
     *
     * Fica no motor, e não em cada receita, porque receita esquece: são doze, e a que
     * esquecesse entregaria uma descrição com a chave crua no lugar do texto.
     */
    desc: localizeBlock(
      readBlock(recipe.desc, document, coverage, options, context),
      options.language,
    ) as TDesc,
  };
}

/** Expande `@Localize` em toda folha de texto do bloco, em qualquer profundidade. */
function localizeBlock(block: Record<string, unknown>, table: LanguageTable | undefined): unknown {
  return table === undefined ? block : mapStrings(block, (text) => expandLocalize(text, table));
}

function mapStrings(value: unknown, apply: (text: string) => string): unknown {
  if (typeof value === 'string') return apply(value);
  if (Array.isArray(value)) return value.map((item) => mapStrings(item, apply));
  if (isRecord(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) out[key] = mapStrings(item, apply);
    return out;
  }
  return value;
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
  context: PackContext,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [name, field] of Object.entries(fields)) {
    const value = readField(field, document, coverage, options, context);
    if (value !== undefined) out[name] = value;
  }
  return out;
}

function readField(
  field: Field<unknown>,
  document: unknown,
  coverage: Coverage,
  options: RunOptions,
  context: PackContext,
): unknown {
  // O derivado recebe o DOCUMENTO inteiro, e não um caminho. Ver `fromDocument`.
  if (field.source === 'derived') return applyTransform(field, document);

  const found =
    field.source === 'document'
      ? readFromDocument(field, document, coverage)
      : field.source === 'sector'
        ? readSector(field, document, coverage, context)
        : field.source === 'journal'
          ? readFromTable(field, document, options.journals)
          : readFromTable(field, document, options.language);

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
 * O setor: a pasta raiz do documento, ou o carimbo do pack.
 *
 * A COBERTURA é registrada sempre que o caminho `folder` foi lido, mesmo quando a tabela
 * não tem o id: listá-lo como não mapeado seria mentira.
 *
 * Quatro situações, e cada uma tem uma resposta diferente:
 *
 *   sem chave `folder`        o carimbo do pack. É o caso de `adventure-specific-actions`,
 *                             `class-features`, `boons-and-curses` — packs sem pastas.
 *   pack sem tabela           o carimbo do pack, pela mesma razão.
 *   pasta órfã                VAZIO. A chave aponta para uma pasta fora do arquivo:
 *                             `Disengage` aponta para `fn4rMlw19rVjvyjV`, que não existe.
 *                             É defeito do dado, e carimbar seria esconder.
 *   pasta conhecida           o nome da RAIZ da árvore.
 */
function readSector(
  field: Field<unknown>,
  document: unknown,
  coverage: Coverage,
  context: PackContext,
): Found {
  const read = readPath(document, field.path);
  if (read.found) coverage.subtree.add(field.path);

  // Sem chave `folder`: o documento não está organizado, e o carimbo do pack responde.
  if (!read.found || typeof read.value !== 'string') {
    return { present: true, value: context.sector };
  }

  /*
   * COM chave `folder`, o carimbo nunca entra — nem quando a tabela falta.
   *
   * O carimbo significa "este pack não organiza em pastas". Um documento que declara
   * pasta está dizendo o contrário, e carimbá-lo seria contradizer o dado: marcaria como
   * "de aventura" um punhado de ações de classe. Vazio é a resposta honesta para
   * "declarou pasta, e não consegui resolver qual".
   */
  return { present: true, value: context.folders?.get(read.value) ?? '' };
}

/**
 * Uma TABELA de consulta, pela chave que o modelo do campo resolve contra o documento. É
 * a mesma leitura para a tabela de idioma (`fromLang`) e a de páginas de jornal
 * (`fromJournal`): as duas são `Map<string, string>` e as duas têm chave com `{caminho}`.
 */
function readFromTable(
  field: Field<unknown>,
  document: unknown,
  table: ReadonlyMap<string, string> | undefined,
): Found {
  if (!table) return { present: false, value: undefined };

  const key = resolveTemplate(field.path, (path) => {
    const read = readPath(document, path);
    return typeof read.value === 'string' ? read.value : null;
  });
  if (key === null) return { present: false, value: undefined };

  const value = table.get(key);
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
