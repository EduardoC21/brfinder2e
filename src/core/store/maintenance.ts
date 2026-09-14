/**
 * As duas vassouras do armazenamento: apagar a base inteira, e apagar só o que caiu em
 * desuso.
 *
 * Pedidas pelo autor na Etapa 20, depois de ver a lápide funcionar: os dois índices que
 * saíram da fonte de Regras ficaram na base dele como aposentados, e não havia como
 * tirá-los. A lápide existe para proteger a ficha (ARCHITECTURE, "A lápide"); quem não tem
 * ficha apontando para o aposentado quer só que ele suma.
 *
 * ⚠️ As duas são DESTRUTIVAS e as duas PRESERVAM as preferências. A base se refaz com uma
 * sincronização; a largura da coluna que a pessoa arrastou, não.
 */

import { activeOnly, retiredOnly, type StoredEntity } from './diff';
import {
  KEY_META,
  keyBase,
  keyRetiredRaw,
  readBase,
  readDesc,
  readMeta,
  writeBase,
  writeDesc,
  writeMeta,
} from './layers';
import type { StorePort } from './ports';

/** As chaves da BASE — tudo que a sincronização grava. `prefs/` fica de fora. */
const PREFIXOS_DA_BASE = ['raw/', 'base/', 'desc/', 'glossary/'] as const;

/**
 * Apaga a base inteira, e nada mais.
 *
 * Não é `store.clear()`: o mesmo armazenamento guarda as preferências, e "limpar a base"
 * não é "esquecer como eu gosto da tela". Apaga por prefixo, e o `meta` por nome.
 */
export async function clearData(store: StorePort): Promise<void> {
  const chaves: string[] = [];
  for (const prefixo of PREFIXOS_DA_BASE) chaves.push(...(await store.keys(prefixo)));
  for (const chave of chaves) await store.delete(chave);
  await store.delete(KEY_META);
}

export interface PurgeResult {
  /** Quantas entradas aposentadas foram apagadas, somando os tipos. */
  readonly removed: number;
}

/**
 * Apaga as entradas APOSENTADAS de todos os tipos: a projeção em `base/`, a descrição em
 * `desc/` e o documento cru em `raw/retired/`.
 *
 * As ativas não são tocadas. E o `meta` ganha uma REVISÃO nova — é o que faz a tela reler
 * a base sem uma sincronização: a lista lê pela versão da base, e a versão precisa mudar
 * para ela perceber que a base mudou.
 */
export async function purgeRetired(store: StorePort): Promise<PurgeResult> {
  let removed = 0;

  const tipos = (await store.keys('base/')).map((chave) => chave.slice('base/'.length));
  for (const tipo of tipos) {
    const entidades = await readBase(store, tipo);
    if (entidades === null) continue;
    const aposentadas = retiredOnly(entidades);
    if (aposentadas.length === 0) continue;

    await writeBase(store, tipo, activeOnly(entidades));
    await apagarDescricoes(store, tipo, aposentadas);
    for (const entidade of aposentadas) await store.delete(keyRetiredRaw(tipo, entidade.key));
    removed += aposentadas.length;
  }

  if (removed > 0) {
    const meta = await readMeta(store);
    if (meta !== null) await writeMeta(store, { ...meta, revision: meta.revision + 1 });
  }
  return { removed };
}

/** Tira das descrições do tipo as chaves das entidades apagadas. */
async function apagarDescricoes(
  store: StorePort,
  tipo: string,
  apagadas: readonly StoredEntity[],
): Promise<void> {
  const descricoes = await readDesc(store, tipo);
  if (descricoes === null) return;
  const fora = new Set(apagadas.map((entidade) => entidade.key));
  const restantes = Object.fromEntries(
    Object.entries(descricoes).filter(([chave]) => !fora.has(chave)),
  );
  await writeDesc(store, tipo, restantes);
}

/** Existe algo aposentado na base? Para o botão saber se tem o que fazer. */
export async function countRetired(store: StorePort): Promise<number> {
  let total = 0;
  const tipos = (await store.keys(keyBase(''))).map((chave) => chave.slice('base/'.length));
  for (const tipo of tipos) {
    const entidades = await readBase(store, tipo);
    if (entidades !== null) total += retiredOnly(entidades).length;
  }
  return total;
}

/**
 * A terceira vassoura (Etapa 43): o que uma versão anterior gravou e o app de hoje não
 * lê mais. Roda sozinha ao abrir — não é decisão de ninguém, é lixo — e devolve quantas
 * chaves tirou, para o registro. Hoje: o cache do modelo do Bergamot (`bergamot/…`, uns
 * 22 MB), que saiu na Etapa 42.
 */
const PREFIXOS_ORFAOS = ['bergamot/'] as const;

export async function purgeLegacy(store: StorePort): Promise<number> {
  let tiradas = 0;
  for (const prefixo of PREFIXOS_ORFAOS) {
    for (const chave of await store.keys(prefixo)) {
      await store.delete(chave);
      tiradas += 1;
    }
  }
  return tiradas;
}
