/**
 * A TABELA DE HABILIDADES DE CLASSE por traço — a quarta tabela de consulta do motor.
 *
 * Existe porque a ficha inicial da classe não está toda na classe. O atributo-chave: o
 * pack diz `dex` para o ladino e NADA para o psíquico; o que falta está nas habilidades
 * de subclasse, em `system.subfeatures.keyOptions` — o Ruffian dá `str`, o Scoundrel dá
 * `cha`, a Gathered Lore dá `int`. São 9 habilidades no `pf2e-8.5.0`, todas com um traço
 * de classe só (ladino 5, psíquico 4). E a PERÍCIA que a subclasse treina (26g): o Ruffian
 * treina Intimidation, a Storm Order treina Acrobatics — isso está nas REGRAS da opção
 * (`ActiveEffectLike` sobre `system.skills.<perícia>.rank`), e a classe só quer saber SE a
 * escolha de 1º nível treina alguma, para escrever "outro" ao lado da perícia fixa.
 *
 * Indexada por TODO traço, não só o de classe: é barato, e a próxima pergunta ("que
 * habilidades têm este traço?") já tem onde morar. E por UUID, para a classe achar a
 * etiqueta de escolha das habilidades que ela aponta.
 */

import { isRecord } from '../json';

export interface ClassFeatureSummary {
  readonly uuid: string;
  readonly name: string;
  /** Os atributos-chave que a habilidade abre (`subfeatures.keyOptions`); vazio na maioria. */
  readonly keyOptions: readonly string[];
  /** As etiquetas (`traits.otherTags`): é por elas que uma opção pertence a uma escolha. */
  readonly tags: readonly string[];
  /** A etiqueta que o `ChoiceSet` desta habilidade filtra (`item:tag:X`), quando escolhe. */
  readonly choiceTag: string | null;
  /** As perícias que as regras treinam (`system.skills.<perícia>.rank`). */
  readonly skills: readonly string[];
}

export interface ClassFeaturesIndex {
  readonly byTrait: ReadonlyMap<string, readonly ClassFeatureSummary[]>;
  readonly byUuid: ReadonlyMap<string, ClassFeatureSummary>;
}

const ETIQUETA_DE_ESCOLHA = /^item:tag:(.+)$/;
const RANK_DE_PERICIA = /^system\.skills\.([a-z]+)\.rank$/;

/** A etiqueta do primeiro `ChoiceSet` com filtro `item:tag:X`, ou nulo. */
function etiquetaDeEscolha(rules: readonly unknown[]): string | null {
  for (const rule of rules) {
    if (!isRecord(rule) || rule['key'] !== 'ChoiceSet') continue;
    const choices = rule['choices'];
    if (!isRecord(choices) || !Array.isArray(choices['filter'])) continue;
    for (const item of choices['filter']) {
      const m = typeof item === 'string' ? ETIQUETA_DE_ESCOLHA.exec(item) : null;
      if (m?.[1] !== undefined) return m[1];
    }
  }
  return null;
}

/** As perícias cujo rank as regras mexem — `ActiveEffectLike` sobre `system.skills.X.rank`. */
function periciasTreinadas(rules: readonly unknown[]): readonly string[] {
  const out = new Set<string>();
  for (const rule of rules) {
    if (!isRecord(rule) || rule['key'] !== 'ActiveEffectLike') continue;
    const m = typeof rule['path'] === 'string' ? RANK_DE_PERICIA.exec(rule['path']) : null;
    if (m?.[1] !== undefined) out.add(m[1]);
  }
  return [...out];
}

const textos = (value: unknown): readonly string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

/** Os documentos do pack `classfeatures` → o índice por traço e por UUID. */
export function indexClassFeatures(documents: readonly unknown[]): ClassFeaturesIndex {
  const byTrait = new Map<string, ClassFeatureSummary[]>();
  const byUuid = new Map<string, ClassFeatureSummary>();
  for (const document of documents) {
    if (!isRecord(document) || typeof document['name'] !== 'string') continue;
    if (typeof document['_id'] !== 'string') continue;
    const system = document['system'];
    if (!isRecord(system)) continue;
    const traits = isRecord(system['traits']) ? system['traits'] : {};
    const subfeatures = isRecord(system['subfeatures']) ? system['subfeatures'] : {};
    const rules = Array.isArray(system['rules']) ? system['rules'] : [];
    const summary: ClassFeatureSummary = {
      uuid: `Compendium.pf2e.classfeatures.Item.${document['_id']}`,
      name: document['name'],
      keyOptions: textos(subfeatures['keyOptions']),
      tags: textos(traits['otherTags']),
      choiceTag: etiquetaDeEscolha(rules),
      skills: periciasTreinadas(rules),
    };
    byUuid.set(summary.uuid, summary);
    for (const trait of textos(traits['value'])) {
      const lista = byTrait.get(trait);
      if (lista === undefined) byTrait.set(trait, [summary]);
      else lista.push(summary);
    }
  }
  return { byTrait, byUuid };
}
