/**
 * Grava o resultado da sincronização, e diz o que mudou.
 *
 * Duas ordens importam aqui, e ambas têm teste dedicado:
 *
 * 1. Para cada tipo, LÊ a base anterior, compara, e só então sobrescreve. Invertido, a
 *    comparação seria contra o que acabou de ser gravado e o relatório diria "nada mudou"
 *    para sempre.
 * 2. O documento cru de quem sumiu é salvo ANTES de `raw/<pack>` ser sobrescrito — é a
 *    última janela em que ele existe.
 *
 * A LÁPIDE (OPEN-DECISIONS, item 2): entrada que some da fonte não é apagada. Ela fica
 * gravada com `retiredIn`, sai da busca e continua resolvendo por UUID. Apagar quebraria
 * toda ficha que a referencie — e medimos que isso acontece: 4 talentos sumiram entre
 * `pf2e-7.9.1` e `pf2e-8.4.1`, e nenhum deles existe hoje em pack nenhum.
 */

import { isRecord } from '../json';
import { RECIPES_REVISION } from './revision';
import {
  activeOnly,
  diffEntities,
  entityKey,
  readBase,
  readDesc,
  readRaw,
  retire,
  retiredOnly,
  toStored,
  writeBase,
  writeDesc,
  writeGlossary,
  writeMeta,
  writeRaw,
  writeRetiredRaw,
  type EntityDiff,
  type StoreMeta,
  type StorePort,
  type StoredEntity,
} from '../store/index';
import type { PackSource, SyncResult, TypeResult } from './run-sync';

export interface PersistedType {
  readonly type: string;
  readonly diff: EntityDiff;
  /** Quantas entradas estão aposentadas no total, somando as de sincronizações anteriores. */
  readonly retired: number;
  /**
   * Quantas aposentadas a receita ATUAL não conseguiu reler, e por isso mantiveram a
   * projeção antiga. Diferente de zero significa receita a consertar.
   */
  readonly staleRetired: number;
}

export interface PersistResult {
  readonly meta: StoreMeta;
  readonly types: readonly PersistedType[];
}

export async function persistSync(
  store: StorePort,
  result: SyncResult,
  now: () => Date = () => new Date(),
): Promise<PersistResult> {
  const types: PersistedType[] = [];

  for (const type of result.types) {
    types.push(await persistType(store, type, result.releaseTag));
  }

  /*
   * O glossário é SUBSTITUÍDO inteiro, sem diff nem aposentadoria.
   *
   * As entradas têm as duas coisas porque uma ficha pode apontar para uma que sumiu. Um
   * traço que sair da tabela de idioma some da caixinha e pronto — não há nada que
   * dependa dele além do mouse parado em cima.
   */
  await writeGlossary(store, 'traits', result.traitGlossary);
  await writeGlossary(store, 'terms-en', result.termsEn);

  const meta: StoreMeta = {
    systemId: result.systemId,
    systemVersion: result.systemVersion,
    releaseTag: result.releaseTag,
    syncedAt: now().toISOString(),
    total: result.total,
    revision: 0,
    recipes: RECIPES_REVISION,
  };
  await writeMeta(store, meta);

  return { meta, types };
}

async function persistType(
  store: StorePort,
  type: TypeResult,
  releaseTag: string,
): Promise<PersistedType> {
  const incoming = type.entities.map(toStored);

  // Tudo que é leitura acontece antes de qualquer escrita deste tipo.
  const previous = await readBase(store, type.type);
  const previousDesc = await readDesc(store, type.type);

  const previousActive = previous === null ? null : activeOnly(previous);
  const diff = diffEntities(previousActive, incoming);

  const arriving = new Set(incoming.map((entity) => entity.key));
  const newlyRetired = (previousActive ?? []).filter((entity) => !arriving.has(entity.key));

  // O documento cru de quem sumiu, salvo enquanto raw/<pack> ainda é o anterior.
  if (newlyRetired.length > 0) {
    await saveRetiredDocuments(store, type.type, type.packs, newlyRetired);
  }

  const carried = carryRetired(previous, type, arriving, releaseTag);

  // Um raw/ por pack: a receita de `action` lê dois, e cada um mantém os próprios bytes.
  for (const pack of type.packs) {
    await writeRaw(store, pack.name, pack.rawBytes);
  }
  await writeBase(store, type.type, [
    ...incoming,
    ...newlyRetired.map((entity) => retire(entity, releaseTag)),
    ...carried.entities,
  ]);
  await writeDesc(store, type.type, {
    // Ordem importa: a descrição renormalizada do aposentado vence a antiga, e a do vivo
    // vence tudo.
    ...carryDesc(previousDesc, [...newlyRetired, ...carried.entities]),
    ...Object.fromEntries(type.retiredEntities.map((e) => [entityKey(e), e.desc])),
    ...Object.fromEntries(type.entities.map((e) => [entityKey(e), e.desc])),
  });

  return {
    type: type.type,
    diff,
    retired: newlyRetired.length + carried.entities.length,
    staleRetired: carried.stale,
  };
}

/**
 * Os aposentados que continuam aposentados, já renormalizados pela receita ATUAL.
 *
 * É o que garante uma forma só em `base/`: vivo e aposentado saem da mesma receita, na
 * mesma execução. Cada um mantém o `retiredIn` original — a tag em que ELE sumiu, não a
 * da sincronização de agora.
 *
 * Aposentado que a receita atual não conseguiu ler mantém a projeção anterior e é contado
 * em `stale`. Isso não é estado a contornar: é sinal de que a receita exige um campo que
 * nem sempre existiu, e o conserto é marcar o campo como opcional.
 */
function carryRetired(
  previous: readonly StoredEntity[] | null,
  type: TypeResult,
  arriving: ReadonlySet<string>,
  releaseTag: string,
): { entities: StoredEntity[]; stale: number } {
  const previouslyRetired = previous === null ? [] : retiredOnly(previous);
  const fresh = new Map(type.retiredEntities.map(toStored).map((e) => [e.key, e]));

  const entities: StoredEntity[] = [];
  let stale = 0;

  for (const old of previouslyRetired) {
    // Voltou a existir na fonte: sai da lista de aposentados, senão ficaria gravado duas
    // vezes, vivo e com lápide.
    if (arriving.has(old.key)) continue;

    const renormalized = fresh.get(old.key);
    if (renormalized === undefined) {
      entities.push(old);
      stale++;
    } else {
      entities.push({ ...renormalized, retiredIn: old.retiredIn ?? releaseTag });
    }
  }

  return { entities, stale };
}

/**
 * Localiza nos packs ANTERIORES o documento de cada entrada aposentada e guarda cada um em
 * `raw/retired/<tipo>/<chave>`.
 *
 * Varre todos os packs da receita: uma entrada de `action` pode ter vindo de
 * `actionspf2e` ou de `adventure-specific-actions`, e daqui não dá para saber de qual.
 *
 * Só roda quando há aposentadoria — é raro (4 talentos em sete meses), e o custo é
 * decodificar os packs anteriores uma vez.
 */
async function saveRetiredDocuments(
  store: StorePort,
  type: string,
  packs: readonly PackSource[],
  entities: readonly StoredEntity[],
): Promise<void> {
  const byId = new Map<string, unknown>();

  for (const pack of packs) {
    const bytes = await readRaw(store, pack.name);
    if (bytes === null) continue;

    let documents: unknown;
    try {
      documents = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      // Sem o pack anterior legível não há o que salvar dele. A lápide em `base/`
      // continua valendo — só a exportação daquela entrada fica sem o documento cru.
      continue;
    }
    if (!Array.isArray(documents)) continue;

    for (const document of documents) {
      if (!isRecord(document)) continue;
      const id = document['_id'];
      if (typeof id === 'string' && !byId.has(id)) byId.set(id, document);
    }
  }

  for (const entity of entities) {
    const document = byId.get(entity.id);
    if (document !== undefined) await writeRetiredRaw(store, type, entity.key, document);
  }
}

/** Mantém a descrição das aposentadas, para a tela de detalhe não ficar vazia. */
function carryDesc(
  previous: Readonly<Record<string, unknown>> | null,
  entities: readonly StoredEntity[],
): Record<string, unknown> {
  if (previous === null) return {};
  const kept: Record<string, unknown> = {};
  for (const entity of entities) {
    const desc = previous[entity.key];
    if (desc !== undefined) kept[entity.key] = desc;
  }
  return kept;
}
