/**
 * O PACOTE DA COMUNIDADE (Etapa 31): a tradução pt-BR do sistema pf2e para o Foundry,
 * `mclemente/fvtt-ptbr-pf2e-translation`, lida como GLOSSÁRIO — não como tradução da
 * prosa. Decisão do autor: dela tiramos o core (nomes e descrições de traços, os termos
 * do sistema) e os PADRÕES de tradução (o nome em português de cada talento, magia e
 * item; as frases fixas de duração, alcance e alvo) que alimentam o contexto dos modelos
 * de linguagem, para eles acertarem o vocabulário do RPG em português. As descrições que
 * o pacote tem (parciais, de antes do Remaster) ficam de fora.
 *
 * O que se lê do repositório, na tag do último release:
 *
 *   translation/pt-BR/pt-BR.json          a tabela de idioma — `PF2E.Trait*` e
 *                                         `PF2E.TraitDescription*`, como a `en.json`
 *   translation/pt-BR/dictionary.json     frases fixas por campo ("1 minute" → "1 minuto")
 *   translation/pt-BR/compendium/*.json   Babele: por pack, `entries[nome].name` — só o
 *                                         nome, nunca a descrição
 *
 * É conteúdo de terceiros (Paizo via a comunidade): baixado a pedido, nunca embutido no
 * app. Gravado sob `trans/<língua>/glossary/…`, ao lado das traduções, e NÃO sob
 * `glossary/` — `glossary/` é prefixo da base e `clearData` o apaga; o pacote, como as
 * traduções, sobrevive à sincronização e ao apagar da base.
 */

import { buildTraitGlossary, type TraitGlossary } from '../glossary/index';
import { isRecord } from '../json';
import { mergeLanguageFiles } from '../normalization/language';
import type { HttpPort } from '../source/ports';
import type { StorePort } from '../store/ports';

export const COMMUNITY_REPO = 'mclemente/fvtt-ptbr-pf2e-translation';
const RAW = 'https://raw.githubusercontent.com';

/** Os packs do Babele que viram nomes, e o tipo de entidade de cada um aqui dentro. */
const PACKS_DE_NOMES: readonly (readonly [string, string])[] = [
  ['pf2e.feats-srd', 'feat'],
  ['pf2e.spells-srd', 'spell'],
  ['pf2e.equipment-srd', 'equipment'],
  ['pf2e.actionspf2e', 'action'],
  ['pf2e.conditionitems', 'condition'],
  ['pf2e.ancestries', 'ancestry'],
  ['pf2e.backgrounds', 'background'],
  ['pf2e.classes', 'class'],
  ['pf2e.classfeatures', 'feature'],
  ['pf2e.ancestryfeatures', 'feature'],
  ['pf2e.heritages', 'heritage'],
  ['pf2e.deities', 'deity'],
  ['pf2e.familiar-abilities', 'familiar'],
];

export interface CommunityPack {
  readonly tag: string;
  readonly traits: TraitGlossary;
  /** `{ feat: { 'Power Attack': 'Ataque Poderoso' }, … }` — o nome em português por tipo. */
  readonly names: Readonly<Record<string, Readonly<Record<string, string>>>>;
  /** `{ duration: { '1 minute': '1 minuto' }, … }` — as frases fixas por campo. */
  readonly dictionary: Readonly<Record<string, Readonly<Record<string, string>>>>;
}

export interface CommunityMeta {
  readonly tag: string;
  /** ISO 8601, em UTC. */
  readonly at: string;
  readonly traits: number;
  readonly names: number;
}

export const keyCommunity = (language: string, part: string): string =>
  `trans/${language}/glossary/${part}`;

/** A tag do último release do repositório; `master` quando não há release ou a API falha. */
export async function latestCommunityTag(http: HttpPort): Promise<string> {
  try {
    const release = await http.getJson(
      `https://api.github.com/repos/${COMMUNITY_REPO}/releases/latest`,
    );
    if (isRecord(release) && typeof release['tag_name'] === 'string') return release['tag_name'];
  } catch {
    // Sem release, ou sem API: o branch principal serve.
  }
  return 'master';
}

function nomesDoBabele(payload: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!isRecord(payload) || !isRecord(payload['entries'])) return out;
  for (const [original, entry] of Object.entries(payload['entries'])) {
    if (isRecord(entry) && typeof entry['name'] === 'string' && entry['name'] !== '') {
      out[original] = entry['name'];
    }
  }
  return out;
}

function frasesDoDicionario(payload: unknown): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  if (!isRecord(payload)) return out;
  for (const [campo, frases] of Object.entries(payload)) {
    if (!isRecord(frases)) continue;
    const porFrase: Record<string, string> = {};
    for (const [en, pt] of Object.entries(frases)) {
      if (typeof pt === 'string') porFrase[en] = pt;
    }
    out[campo] = porFrase;
  }
  return out;
}

/** Baixa o pacote na tag dada. Um pack de nomes que falhe não derruba o resto. */
export async function fetchCommunityPack(http: HttpPort, tag: string): Promise<CommunityPack> {
  const base = `${RAW}/${COMMUNITY_REPO}/${tag}/translation/pt-BR`;
  const tabela = await http.getJson(`${base}/pt-BR.json`);
  const traits = buildTraitGlossary(mergeLanguageFiles([tabela]));
  let dictionary: CommunityPack['dictionary'] = {};
  try {
    dictionary = frasesDoDicionario(await http.getJson(`${base}/dictionary.json`));
  } catch {
    // O dicionário é apoio: sem ele, o pacote ainda vale.
  }
  const names: Record<string, Record<string, string>> = {};
  for (const [pack, type] of PACKS_DE_NOMES) {
    try {
      const nomes = nomesDoBabele(await http.getJson(`${base}/compendium/${pack}.json`));
      names[type] = { ...names[type], ...nomes };
    } catch {
      // Pack que o repositório não tem (ou renomeou): segue sem os nomes dele.
    }
  }
  return { tag, traits, names, dictionary };
}

export async function writeCommunityPack(
  store: StorePort,
  language: string,
  pack: CommunityPack,
  at: string,
): Promise<CommunityMeta> {
  await store.put(keyCommunity(language, 'traits'), pack.traits);
  await store.put(keyCommunity(language, 'names'), pack.names);
  await store.put(keyCommunity(language, 'dictionary'), pack.dictionary);
  const meta: CommunityMeta = {
    tag: pack.tag,
    at,
    traits: Object.keys(pack.traits).length,
    names: Object.values(pack.names).reduce(
      (soma, porTipo) => soma + Object.keys(porTipo).length,
      0,
    ),
  };
  await store.put(keyCommunity(language, 'meta'), meta);
  return meta;
}

export async function readCommunityMeta(
  store: StorePort,
  language: string,
): Promise<CommunityMeta | null> {
  const value = await store.get(keyCommunity(language, 'meta'));
  if (!isRecord(value)) return null;
  const { tag, at, traits, names } = value;
  if (typeof tag !== 'string' || typeof at !== 'string') return null;
  return {
    tag,
    at,
    traits: typeof traits === 'number' ? traits : 0,
    names: typeof names === 'number' ? names : 0,
  };
}

/** O glossário de traços do pacote, na forma de `TraitGlossary`; vazio sem pacote. */
export async function readCommunityTraits(
  store: StorePort,
  language: string,
): Promise<TraitGlossary> {
  const value = await store.get(keyCommunity(language, 'traits'));
  if (!isRecord(value)) return {};
  const out: Record<string, { label: string; description: string }> = {};
  for (const [slug, entry] of Object.entries(value)) {
    if (!isRecord(entry)) continue;
    const { label, description } = entry;
    if (typeof label === 'string' && typeof description === 'string') {
      out[slug] = { label, description };
    }
  }
  return out;
}

/** Os nomes em português por tipo; vazio sem pacote. */
export async function readCommunityNames(
  store: StorePort,
  language: string,
): Promise<CommunityPack['names']> {
  const value = await store.get(keyCommunity(language, 'names'));
  if (!isRecord(value)) return {};
  const out: Record<string, Record<string, string>> = {};
  for (const [type, porNome] of Object.entries(value)) {
    if (!isRecord(porNome)) continue;
    const nomes: Record<string, string> = {};
    for (const [en, pt] of Object.entries(porNome)) if (typeof pt === 'string') nomes[en] = pt;
    out[type] = nomes;
  }
  return out;
}
