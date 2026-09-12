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
import { html, int, listOf, nullable, shape, text, textList } from '../decoders';
import { from } from '../field';
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
    dedication: arquetipo.dedication,
    prerequisites: arquetipo.prerequisites,
    feats: arquetipo.feats,
    additionalFeats: arquetipo.additionalFeats,
    featUuids: arquetipo.feats.map((feat) => feat.uuid),
    additionalFeatUuids: arquetipo.additionalFeats.map((feat) => feat.uuid),
    allFeatUuids: [...arquetipo.feats, ...arquetipo.additionalFeats].map((feat) => feat.uuid),
    class: arquetipo.kind === 'multiclass' ? arquetipo.slug : null,
    source: { title: arquetipo.sourceTitle },
    description: arquetipo.intro,
    page: arquetipo.content,
    _stats: { compendiumSource: arquetipo.uuid },
  }));
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
    dedication: from('dedication', nullable(feat)),
    prerequisites: from('prerequisites', text),
    feats: from('feats', listOf(feat)),
    additionalFeats: from('additionalFeats', listOf(feat)),
    featUuids: from('featUuids', textList),
    additionalFeatUuids: from('additionalFeatUuids', textList),
    allFeatUuids: from('allFeatUuids', textList),
    class: from('class', nullable(text)),
    source: from('source', shape({ title: text })),
  },

  desc: {
    main: from('description', html),
    page: from('page', html),
  },
});
