/**
 * Receita de `condition` — 43 entradas no pack `conditionitems`.
 *
 * Primeira receita do projeto, e de propósito a menor (briefing 3.3): se o mecanismo
 * estiver errado, você descobre com 43 registros e não com 17 mil.
 *
 * Decidido campo a campo com o autor em 27/08/2026, olhando o JSON real do `pf2e-8.4.1`.
 * Amostras usadas: `Blinded`, `Off-Guard` e `Cursebound` — escolhidas porque juntas cobrem
 * as três assinaturas de presença de campo que existem nos 43.
 */

import { bool, html, int, nullable, shape, text, textList } from '../decoders';
import { from, fromLang } from '../field';
import { recipe } from '../recipe';

/** O que carrega no boot e alimenta a busca. */
export interface ConditionBase {
  /** Sempre em inglês, como veio do pack (briefing 8.1). */
  readonly name: string;
  readonly slug: string;
  /**
   * `senses`, `attitudes`, `abilities`, `detection`, `death` — ou `null` em 20 das 43.
   * O schema declara `nullable: true`, então o nulo é intencional e não dado faltando.
   */
  readonly group: string | null;
  /** `true` em 12 das 43: a condição tem um número junto (Frightened 2). */
  readonly valued: boolean;
  /**
   * O valor com que a condição começa. O schema do sistema declara a união
   * `{ isValued: true; value: number } | { isValued: false; value: null }`, e os dados
   * confirmam: `1` nas 12 valoradas, `null` nas outras 31.
   */
  readonly initialValue: number | null;
  /** Slugs de condições que esta anula. Preenchido em 8 das 43 (Blinded anula Dazzled). */
  readonly overrides: readonly string[];
  readonly source: {
    readonly license: string;
    readonly title: string;
    /** Briefing 8: importa tudo e filtra na interface, com "só Remaster" ligado. */
    readonly remaster: boolean;
  };
  /**
   * A frase de uma linha, para a linha de resultado da busca.
   *
   * Vem da tabela de idioma, não do pack — ver `fromLang` e OPEN-DECISIONS item 3.
   * Opcional porque `Cursebound` não tem: ele é condição de mecânica de classe (maldição
   * de oráculo), não do capítulo geral de condições de onde saem os `summary`.
   */
  readonly summary?: string;
}

/** O texto pesado, carregado sob demanda. */
export interface ConditionDesc {
  /**
   * HTML cru do Foundry, **nunca modificado**. Contém marcação `@UUID[...]`, que é a
   * referência cruzada da tela de detalhe (briefing 7.6). A versão do arquivo de idioma
   * é achatada — perde os links — então não serve.
   */
  readonly main: string;
}

export const conditionRecipe = recipe<ConditionBase, ConditionDesc>({
  type: 'condition',
  packs: ['conditionitems'],

  base: {
    name: from('name', text),
    slug: from('system.slug', text),
    group: from('system.group', nullable(text)),
    valued: from('system.value.isValued', bool),
    initialValue: from('system.value.value', nullable(int)),
    overrides: from('system.overrides', textList),
    source: from('system.publication', shape({ license: text, title: text, remaster: bool })),
    summary: fromLang('PF2E.condition.{system.slug}.summary', text).optional(),
  },

  desc: {
    main: from('system.description.value', html),
  },

  ignore: {
    img: 'o json-assets.zip não traz imagem nenhuma; não existe arquivo para exibir',
    effects: 'active effects do VTT; vazio nos 43',
    'system.traits.value': 'vazio nos 43 — condição não tem traço',
    'system._migration': 'controle interno de migração do Foundry',
    'system.references':
      'vazio nos 43. Não é o grafo de condições: o Foundry preenche em runtime, não vem no compêndio',
    'system.duration': 'duração é mecânica de combate; este app não é VTT',
    '_stats.coreVersion': 'versão do Foundry que gerou; já sabemos pela tag do release',
    '_stats.systemId': 'sempre "pf2e"; já sabemos pelo canal',
    '_stats.systemVersion': 'já sabemos pela tag do release',

    // Estes quatro NÃO estão no schema atual (conferido em condition/data.ts e
    // abstract-effect/data.ts do v14-dev). São sobra de versão anterior que ficou
    // gravada no compêndio, e por isso aparecem em 16, 16 e 7 dos 43 em vez de em todos.
    'system.active': 'fora do schema atual do sistema 8; sobra de versão anterior (16 dos 43)',
    'system.removable': 'fora do schema atual do sistema 8; sobra de versão anterior (16 dos 43)',
    'system.value.immutable':
      'fora do schema atual do sistema 8; sobra de versão anterior (7 dos 43)',
  },

  defer: {
    'system.rules':
      'rule elements — 26 das 66 rotas do tipo moram aqui. Mecânica pura de VTT, inútil ' +
      'para consulta e essencial se a ficha aplicar regras. Continua em raw/.',
  },
});
