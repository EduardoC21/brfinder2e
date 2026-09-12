/**
 * Receita de `archetype` — os 249 arquétipos do jornal `Archetypes`, por `expand`, como
 * regra e domínio. Ver `archetypes.ts` para o que a página tem e como o livro os divide.
 *
 * A terceira das fontes grandes, e a que menos precisou de campo: o jornal já traz a
 * categoria (a seção), a dedicação, os talentos em ordem de nível e o livro. O que a
 * receita faz é ler a página e gravar duas descrições: `main`, a prosa de abertura, para a
 * lateral; `page`, a página inteira — com os talentos colados pelo `@Embed` —, para a
 * tela completa.
 *
 * Decidida contra o JSON real do `pf2e-8.5.0`, em 12/09/2026.
 */

import { isRecord } from '../../json';
import { archetypePages, type ArchetypeFeat } from '../archetypes';
import { html, int, listOf, nullable, shape, text } from '../decoders';
import { plainSnippet } from '../feats-index';
import { from, fromDocument, type LookupTables } from '../field';
import { recipe } from '../recipe';

export interface ArchetypeBase {
  readonly name: string;
  readonly slug: string;
  /** `general`, `multiclass`, `class`, `mythic`, `undead`, `artifact` — a seção do jornal. */
  readonly kind: string;
  readonly rarity: string;
  /** O talento de dedicação, com nível; nulo nos destinos míticos e nos artefatos. */
  readonly dedication: ArchetypeFeat | null;
  /** Os pré-requisitos da dedicação, como o livro escreve. Vazio em 52. */
  readonly prerequisites: string;
  /** Todos os talentos da página, na ordem — a dedicação inclusive. */
  readonly feats: readonly ArchetypeFeat[];
  /** Os talentos de OUTRA classe que o arquétipo deixa pegar — "Additional Feats". */
  readonly additionalFeats: readonly ArchetypeFeat[];
  /** Só os UUIDs dos próprios, para a aba Talentos marcar a origem. */
  readonly featUuids: readonly string[];
  /** Só os UUIDs dos adicionais, idem. */
  readonly additionalFeatUuids: readonly string[];
  /** Próprios e adicionais juntos: é onde a aba Talentos trava. */
  readonly allFeatUuids: readonly string[];
  /** A classe do arquétipo multiclasse, por slug; nulo nos outros. */
  readonly class: string | null;
  readonly source: {
    readonly title: string;
  };
}

export interface ArchetypeDesc {
  /** A prosa de abertura. */
  readonly main: string;
  /** A página inteira, com os talentos por `@Embed`. */
  readonly page: string;
}

/** Um jornal vira N documentos de arquétipo, um por página fora de `Index` e `Rules`. */
function expandirArquetipos(document: unknown): readonly unknown[] {
  if (!isRecord(document) || document['name'] !== 'Archetypes') return [];
  const jornal = typeof document['_id'] === 'string' ? document['_id'] : '';
  const paginas = document['pages'];
  if (!Array.isArray(paginas)) return [];

  const planas = (paginas as unknown[]).flatMap((pagina) => {
    if (!isRecord(pagina)) return [];
    const titulo = pagina['title'];
    const texto = pagina['text'];
    return [
      {
        id: typeof pagina['_id'] === 'string' ? pagina['_id'] : '',
        name: typeof pagina['name'] === 'string' ? pagina['name'] : '',
        level: isRecord(titulo) && typeof titulo['level'] === 'number' ? titulo['level'] : 2,
        sort: typeof pagina['sort'] === 'number' ? pagina['sort'] : 0,
        content: isRecord(texto) && typeof texto['content'] === 'string' ? texto['content'] : '',
      },
    ];
  });

  return archetypePages(jornal, planas).map((arquetipo) => ({
    _id: arquetipo.slug,
    type: 'archetype',
    name: arquetipo.name,
    kind: arquetipo.kind,
    rarity: arquetipo.rarity,
    /* O que a PÁGINA cita; a dedicação e as listas finais são derivadas (ver abaixo). */
    citedDedication: arquetipo.dedication,
    citedFeats: arquetipo.feats,
    prerequisites: arquetipo.prerequisites,
    additionalFeats: arquetipo.additionalFeats,
    class: arquetipo.kind === 'multiclass' ? arquetipo.slug : null,
    source: { title: arquetipo.sourceTitle },
    description: arquetipo.intro,
    page: arquetipo.content,
    _stats: { compendiumSource: arquetipo.uuid },
  }));
}

/** O que o expansor deixou no documento, lido de volta com a forma certa. */
function lidos(document: unknown): {
  name: string;
  dedication: ArchetypeFeat | null;
  feats: readonly ArchetypeFeat[];
  additional: readonly ArchetypeFeat[];
  page: string;
} {
  const d = isRecord(document) ? document : {};
  const feat = (item: unknown): ArchetypeFeat | null =>
    isRecord(item) && typeof item['uuid'] === 'string' && typeof item['name'] === 'string'
      ? {
          uuid: item['uuid'],
          name: item['name'],
          level: typeof item['level'] === 'number' ? item['level'] : null,
        }
      : null;
  const lista = (value: unknown): ArchetypeFeat[] =>
    Array.isArray(value) ? (value as unknown[]).flatMap((item) => feat(item) ?? []) : [];
  return {
    name: typeof d['name'] === 'string' ? d['name'] : '',
    dedication: feat(d['citedDedication']),
    feats: lista(d['citedFeats']),
    additional: lista(d['additionalFeats']),
    page: typeof d['page'] === 'string' ? d['page'] : '',
  };
}

/**
 * A DEDICAÇÃO, com a dupla verificação pedida pelo autor: a que a página cita; se não
 * cita nenhuma, "<Nome> Dedication" na tabela de talentos — aceita SÓ se o começo da
 * descrição do talento está no texto da página (é o texto "quebrado" que a página
 * embute sem o título). É o Guardian: a página não o cita, a tabela o tem, e o texto
 * bate. Sem tabela, ou sem o texto, continua nula — melhor faltar que chutar.
 */
function toDedication(document: unknown, tables: LookupTables): ArchetypeFeat | null {
  const { name, dedication, page } = lidos(document);
  if (dedication !== null) return dedication;
  const candidata = tables.feats?.get(`${name} Dedication`);
  if (candidata === undefined || candidata.snippet === '') return null;
  const pagina = plainSnippet(page, Number.MAX_SAFE_INTEGER);
  if (!pagina.includes(candidata.snippet)) return null;
  return { uuid: candidata.uuid, name: `${name} Dedication`, level: candidata.level };
}

/** Os talentos da página — com a dedicação recuperada na frente, quando a página não a cita. */
function toFeats(document: unknown, tables: LookupTables): readonly ArchetypeFeat[] {
  const { dedication, feats } = lidos(document);
  const recuperada = dedication === null ? toDedication(document, tables) : null;
  return recuperada === null ? feats : [recuperada, ...feats];
}

function toFeatUuids(document: unknown, tables: LookupTables): readonly string[] {
  return toFeats(document, tables).map((feat) => feat.uuid);
}

function toAllFeatUuids(document: unknown, tables: LookupTables): readonly string[] {
  return [...toFeats(document, tables), ...lidos(document).additional].map((feat) => feat.uuid);
}

const feat = shape({ uuid: text, name: text, level: nullable(int) });

export const archetypeRecipe = recipe<ArchetypeBase, ArchetypeDesc>({
  type: 'archetype',
  packs: [{ name: 'journals' }],
  expand: expandirArquetipos,

  base: {
    name: from('name', text),
    slug: from('_id', text),
    kind: from('kind', text),
    rarity: from('rarity', text),
    dedication: fromDocument(toDedication),
    prerequisites: from('prerequisites', text),
    feats: fromDocument(toFeats),
    additionalFeats: from('additionalFeats', listOf(feat)),
    featUuids: fromDocument(toFeatUuids),
    additionalFeatUuids: fromDocument((document) =>
      lidos(document).additional.map((item) => item.uuid),
    ),
    allFeatUuids: fromDocument(toAllFeatUuids),
    class: from('class', nullable(text)),
    source: from('source', shape({ title: text })),
  },

  desc: {
    main: from('description', html),
    page: from('page', html),
  },

  ignore: {
    /* Os dois são lidos pelos derivados (`toDedication`, `toFeats`), que não marcam cobertura. */
    citedDedication:
      'a dedicação que a página cita; `dedication` (derivado) a confirma ou recupera',
    citedFeats:
      'os talentos que a página cita; `feats` (derivado) põe a dedicação recuperada na frente',
  },
});
