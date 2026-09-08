/**
 * A declaração da receita — a especificação legível do briefing, seção 5.
 *
 * O objetivo é que você leia a receita e veja a regra, sem ler o normalizador. Por isso
 * os blocos têm o nome das pastas onde o resultado é gravado (seção 5.2):
 *
 *   raw/    o documento como veio. Não se declara: é sempre o documento inteiro.
 *   base/   leve, carrega no boot, alimenta a busca.
 *   desc/   pesado, carregado sob demanda.
 *
 * E há três disposições, não duas (seção 3.2: "projeta / ignora com motivo / adia"):
 *
 *   base e desc  projeta
 *   ignore       olhei e não serve — com o motivo escrito
 *   defer        olhei, serve, mas não agora — continua em raw/
 *
 * `ignore` e `defer` somem do relatório de não mapeados. A diferença entre eles é a
 * intenção registrada, e o motivo vai para o relatório em ambos os casos.
 */

import type { Field } from './field';

export type FieldMap = Readonly<Record<string, Field<unknown>>>;

/**
 * O mapa de campos que produz exatamente o tipo `T`.
 *
 * É o que faz a receita render um tipo de verdade em vez de `Record<string, unknown>`.
 * Você declara a interface de saída, e o compilador exige que cada campo da receita
 * produza o tipo declarado — `from('system.value.isValued', text)` para um campo
 * `boolean` vira erro de compilação, não surpresa em runtime.
 */
export type FieldMapFor<T> = { [K in keyof T]-?: Field<T[K]> };
/** Caminho -> motivo. O motivo é obrigatório: nunca em silêncio (briefing 5.1). */
export type ReasonMap = Readonly<Record<string, string>>;

/**
 * Um pack que alimenta a receita.
 *
 * Não é só um nome porque o pack CARREGA SIGNIFICADO que o documento não tem. Medido no
 * `pf2e-8.5.0`: as 1.414 ações estão em cinco packs, e nada dentro do documento separa
 * `Power Attack` (habilidade de monstro, no glossário de bestiário) de `Fling Magic`
 * (ação de PJ) — mesmos campos, mesmos traços, mesma forma. O pack é a única informação.
 *
 * `sector` é o carimbo para packs **sem arquivo de pastas**. Onde há pasta, a pasta vence:
 * ela é mais específica e se atualiza sozinha quando o Paizo cria uma categoria nova.
 *
 * Isto substitui um `withDefault('Adventure')` que funcionava por COINCIDÊNCIA — havia
 * dois packs, um com pastas e um sem. Um terceiro pack sem pastas também viraria
 * "Adventure", e estaria errado.
 */
export interface RecipePack {
  /** `name` do manifesto. */
  readonly name: string;
  /** Setor de todo documento deste pack que não estiver numa pasta. */
  readonly sector?: string;
}

export interface RecipeInput<TBase, TDesc> {
  /**
   * O tipo da ENTIDADE — a chave de `base/<type>` e a identidade da fonte na tela.
   *
   * Também é o `type` do documento do Foundry por padrão. Quando os dois divergem, ver
   * `accepts`.
   */
  readonly type: string;
  /**
   * Quais valores de `type` do Foundry alimentam esta receita. Ausente: só o `type` acima.
   *
   * ⚠️ Existe por causa de equipamento, e é a primeira vez que uma receita precisa disso.
   * As quatro receitas anteriores casavam uma para um: o pack `spells-srd` só tem
   * documentos `spell`. O pack `equipment` tem NOVE tipos — medido no `pf2e-8.5.0`:
   *
   *   equipment 2394 · consumable 1703 · weapon 1018 · ammo 216 · armor 211
   *   treasure 153 · shield 126 * backpack 46 · kit 2
   *
   * E eles são a MESMA coisa para quem consulta: um item, com nível, preço, volume e
   * traços. Nove receitas dariam nove fontes no trilho para uma pergunta só ("quanto custa
   * uma espada longa?"), e a busca de uma fonte deixaria de achar as outras oito.
   *
   * O que os separa vira DADO, no campo `kind` — que é o Tipo da tela.
   */
  readonly accepts?: readonly string[];
  /**
   * Um documento vira VÁRIAS entidades. Ausente: uma para uma, como sempre foi.
   *
   * ⚠️ Existe por causa de perícia, e é a segunda vez que o motor cede a uma forma nova do
   * dado — a primeira foi `accepts`, para equipamento. Perícia NÃO é documento no Foundry:
   * as 17 vivem numa TABELA dentro de uma página de jornal. Sem isto, seria preciso um
   * segundo motor para um caso só.
   *
   * O que sai daqui é tratado como documento comum dali em diante: passa pelo filtro de
   * `accepts`, pelo mapa de campos, pela identidade e pelo relatório de cobertura. Por isso
   * quem expande precisa devolver objetos com `_id` e `type` — é o contrato da identidade.
   */
  readonly expand?: ((document: unknown) => readonly unknown[]) | null | undefined;
  /** Os packs que alimentam esta receita. */
  readonly packs: readonly RecipePack[];
  readonly base: FieldMapFor<TBase>;
  readonly desc?: FieldMapFor<TDesc>;
  readonly ignore?: ReasonMap;
  readonly defer?: ReasonMap;
}

export interface Recipe<TBase = unknown, TDesc = unknown> {
  readonly type: string;
  /** Sempre preenchido: vale `[type]` quando a receita não declara nada. */
  readonly accepts: readonly string[];
  readonly expand: ((document: unknown) => readonly unknown[]) | null;
  readonly packs: readonly RecipePack[];
  readonly base: FieldMapFor<TBase>;
  readonly desc: FieldMapFor<TDesc>;
  readonly ignore: ReasonMap;
  readonly defer: ReasonMap;
}

export class RecipeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RecipeError';
  }
}

/**
 * Identidade, carregada automaticamente em toda entidade.
 *
 * Repetir isto em 13 receitas seria ruído. `_stats.compendiumSource` é o UUID canônico já
 * pronto (briefing 7.3) — não montamos identificador na mão.
 *
 * O resto de `_stats` (`coreVersion`, `systemVersion`) NÃO entra aqui de propósito: são
 * campos reais que não usamos, então continuam aparecendo no relatório até você decidir.
 */
export const IDENTITY_PATHS: readonly string[] = ['_id', 'type', '_stats.compendiumSource'];

export function recipe<TBase, TDesc = Record<string, never>>(
  input: RecipeInput<TBase, TDesc>,
): Recipe<TBase, TDesc> {
  const built: Recipe<TBase, TDesc> = {
    type: input.type,
    accepts: input.accepts ?? [input.type],
    expand: input.expand ?? null,
    packs: input.packs,
    base: input.base,
    desc: input.desc ?? ({} as FieldMapFor<TDesc>),
    ignore: input.ignore ?? {},
    defer: input.defer ?? {},
  };

  if (built.packs.length === 0) {
    throw new RecipeError(`Receita "${built.type}" não declara nenhum pack.`);
  }
  if (Object.keys(built.base).length === 0) {
    throw new RecipeError(`Receita "${built.type}" não projeta nenhum campo em base.`);
  }

  // As validações abaixo só leem `path` e `source`, que existem em qualquer `Field`, então
  // recebem os blocos já alargados para `FieldMap` em vez do tipo paramétrico.
  const blocks: readonly (readonly [string, FieldMap])[] = [
    ['base', built.base],
    ['desc', built.desc],
  ];

  assertNoDuplicatePaths(built.type, blocks, built.ignore, built.defer);
  assertReasonsAreWritten(built.type, built.ignore, built.defer);
  return built;
}

/** Um caminho declarado em dois lugares é ambiguidade, não conveniência. */
function assertNoDuplicatePaths(
  type: string,
  blocks: readonly (readonly [string, FieldMap])[],
  ignore: ReasonMap,
  defer: ReasonMap,
): void {
  const seen = new Map<string, string>();

  const claim = (path: string, block: string): void => {
    const previous = seen.get(path);
    if (previous !== undefined) {
      throw new RecipeError(
        `Receita "${type}": o caminho "${path}" aparece em ${previous} e em ${block}. Escolha um.`,
      );
    }
    seen.set(path, block);
  };

  for (const [block, map] of blocks) {
    for (const [name, field] of Object.entries(map)) {
      if (field.source === 'document') claim(field.path, `${block}.${name}`);
    }
  }
  for (const path of Object.keys(ignore)) claim(path, 'ignore');
  for (const path of Object.keys(defer)) claim(path, 'defer');
}

function assertReasonsAreWritten(type: string, ignore: ReasonMap, defer: ReasonMap): void {
  for (const [block, map] of [
    ['ignore', ignore],
    ['defer', defer],
  ] as const) {
    for (const [path, reason] of Object.entries(map)) {
      if (reason.trim().length === 0) {
        throw new RecipeError(
          `Receita "${type}": ${block}["${path}"] está sem motivo. O motivo vai para o relatório.`,
        );
      }
    }
  }
}
