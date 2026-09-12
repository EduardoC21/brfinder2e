/**
 * Receita de `heritage` — as HERANÇAS PRÓPRIAS de cada ancestralidade: as 311 do pack
 * `heritages` que apontam para uma ancestralidade. As outras 17, as VERSÁTEIS, não
 * apontam para nenhuma e entram como Tipo na fonte de ancestralidade — ver `ancestry.ts`
 * e a decisão do autor na Etapa 23: herança não é fonte no trilho; é a aba Heranças de
 * uma ancestralidade, e a versátil é algo que se escolhe no lugar de uma.
 *
 * O mesmo pack lido por duas receitas, cada uma ficando com metade, pelo mesmo
 * predicado (`system.ancestry` nulo ou não): nenhum documento vira duas entidades.
 *
 * Medido no `pf2e-8.5.0`, nas 311:
 *
 *   ancestralidade   `system.ancestry = {name, slug, uuid}`, 50 distintas, todas no pack
 *                    de ancestralidades (Leshy 12, Kobold 10, Sprite 10, Dwarf 9…)
 *   raridade         comum 296, incomum 14, rara 1
 *   traços           nenhum em 262; o da ancestralidade em 48; dois em 1
 *   descrição        78 a 1.373 caracteres, mediana 384 — e NENHUMA página de jornal
 *   alterações       3 no pack inteiro, 1 estática (Beastkin, que é versátil)
 *
 * A pasta do pack é a ancestralidade dona — o mesmo que `system.ancestry.name` diz — e
 * fica em `ignore`. Decidida contra o JSON real do `pf2e-8.5.0`, em 11/09/2026.
 */

import { isRecord } from '../../json';
import { descriptionAlterations, type DescriptionAlteration } from '../alterations';
import { bool, html, shape, text, textList } from '../decoders';
import { from, fromDocument } from '../field';
import { recipe } from '../recipe';

/** A ancestralidade dona, como o pack a escreve: nome, slug e o UUID que a ponte abre. */
export interface HeritageAncestry {
  readonly name: string;
  readonly slug: string;
  readonly uuid: string;
}

export interface HeritageBase {
  readonly name: string;
  readonly slug: string;
  readonly rarity: string;
  readonly traits: readonly string[];
  readonly ancestry: HeritageAncestry;
  /** O que esta herança diz sobre o que concede. Ver `alterations.ts`. */
  readonly alterations: readonly DescriptionAlteration[];
  readonly source: {
    readonly license: string;
    readonly title: string;
    readonly remaster: boolean;
  };
}

export interface HeritageDesc {
  readonly main: string;
}

/** Herança PRÓPRIA: tem ancestralidade. A versátil (`ancestry` nulo) é da outra receita. */
export function isOwnHeritage(document: unknown): boolean {
  return (
    isRecord(document) && isRecord(document['system']) && isRecord(document['system']['ancestry'])
  );
}

export const heritageRecipe = recipe<HeritageBase, HeritageDesc>({
  type: 'heritage',
  packs: [{ name: 'heritages' }],
  expand: (document) => (isOwnHeritage(document) ? [document] : []),

  base: {
    name: from('name', text),
    slug: from('system.slug', text),
    rarity: from('system.traits.rarity', text).withDefault('common'),
    traits: from('system.traits.value', textList),
    ancestry: from('system.ancestry', shape({ name: text, slug: text, uuid: text })),
    alterations: fromDocument(descriptionAlterations),
    source: from('system.publication', shape({ license: text, title: text, remaster: bool })),
  },

  desc: {
    main: from('system.description.value', html),
  },

  ignore: {
    folder: 'a pasta é a ancestralidade dona, que `system.ancestry.name` já diz',
    img: 'ícone; o zip não traz imagem',
    effects: 'active effects do VTT; vazio nas 328',
    'system._migration': 'controle interno de migração do Foundry',
    '_stats.coreVersion': 'versão do Foundry que gerou; já sabemos pela tag do release',
    '_stats.systemId': 'sempre "pf2e"; já sabemos pelo canal',
    '_stats.systemVersion': 'já sabemos pela tag do release',
  },

  defer: {
    'system.rules':
      'rule elements (287 das 328 têm) — mecânica pura de VTT: o bônus, o sentido, a ' +
      'resistência. A descrição já conta em texto; as alterações de descrição já saem em ' +
      '`alterations`. Continua em raw/.',
  },
});
