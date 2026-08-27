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
/** Caminho -> motivo. O motivo é obrigatório: nunca em silêncio (briefing 5.1). */
export type ReasonMap = Readonly<Record<string, string>>;

export interface RecipeInput {
  /** Valor de `type` no documento do Foundry. Documento de outro tipo é descartado. */
  readonly type: string;
  /** Nomes de pack (`name` do manifesto) que alimentam esta receita. */
  readonly packs: readonly string[];
  readonly base: FieldMap;
  readonly desc?: FieldMap;
  readonly ignore?: ReasonMap;
  readonly defer?: ReasonMap;
}

export interface Recipe {
  readonly type: string;
  readonly packs: readonly string[];
  readonly base: FieldMap;
  readonly desc: FieldMap;
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

export function recipe(input: RecipeInput): Recipe {
  const built: Recipe = {
    type: input.type,
    packs: input.packs,
    base: input.base,
    desc: input.desc ?? {},
    ignore: input.ignore ?? {},
    defer: input.defer ?? {},
  };

  if (built.packs.length === 0) {
    throw new RecipeError(`Receita "${built.type}" não declara nenhum pack.`);
  }
  if (Object.keys(built.base).length === 0) {
    throw new RecipeError(`Receita "${built.type}" não projeta nenhum campo em base.`);
  }

  assertNoDuplicatePaths(built);
  assertReasonsAreWritten(built);
  return built;
}

/** Um caminho declarado em dois lugares é ambiguidade, não conveniência. */
function assertNoDuplicatePaths(built: Recipe): void {
  const seen = new Map<string, string>();

  const claim = (path: string, block: string): void => {
    const previous = seen.get(path);
    if (previous !== undefined) {
      throw new RecipeError(
        `Receita "${built.type}": o caminho "${path}" aparece em ${previous} e em ${block}. Escolha um.`,
      );
    }
    seen.set(path, block);
  };

  for (const [name, field] of Object.entries(built.base)) {
    if (field.source === 'document') claim(field.path, `base.${name}`);
  }
  for (const [name, field] of Object.entries(built.desc)) {
    if (field.source === 'document') claim(field.path, `desc.${name}`);
  }
  for (const path of Object.keys(built.ignore)) claim(path, 'ignore');
  for (const path of Object.keys(built.defer)) claim(path, 'defer');
}

function assertReasonsAreWritten(built: Recipe): void {
  for (const [block, map] of [
    ['ignore', built.ignore],
    ['defer', built.defer],
  ] as const) {
    for (const [path, reason] of Object.entries(map)) {
      if (reason.trim().length === 0) {
        throw new RecipeError(
          `Receita "${built.type}": ${block}["${path}"] está sem motivo. O motivo vai para o relatório.`,
        );
      }
    }
  }
}
