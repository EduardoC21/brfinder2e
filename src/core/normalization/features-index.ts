/**
 * A TABELA DE HABILIDADES DE CLASSE por traço — a quarta tabela de consulta do motor.
 *
 * Existe porque o atributo-chave da classe não está todo na classe. O pack diz `dex` para
 * o ladino e NADA para o psíquico; o que falta está nas habilidades de subclasse, em
 * `system.subfeatures.keyOptions` — o Ruffian dá `str`, o Scoundrel dá `cha`, a Gathered
 * Lore dá `int`. São 9 habilidades no `pf2e-8.5.0`, todas com um traço de classe só
 * (ladino 5, psíquico 4). A receita de classe pergunta "quais habilidades do meu traço
 * abrem outro atributo-chave?" e a resposta vem daqui.
 *
 * Indexada por TODO traço, não só o de classe: é barato, e a próxima pergunta ("que
 * habilidades têm este traço?") já tem onde morar.
 */

import { isRecord } from '../json';

export interface ClassFeatureSummary {
  readonly uuid: string;
  readonly name: string;
  /** Os atributos-chave que a habilidade abre (`subfeatures.keyOptions`); vazio na maioria. */
  readonly keyOptions: readonly string[];
}

export type ClassFeaturesByTrait = ReadonlyMap<string, readonly ClassFeatureSummary[]>;

/** Os documentos do pack `classfeatures` → `{ rogue: [{Ruffian, keyOptions: ['str']}, …] }`. */
export function indexClassFeatures(documents: readonly unknown[]): ClassFeaturesByTrait {
  const index = new Map<string, ClassFeatureSummary[]>();
  for (const document of documents) {
    if (!isRecord(document) || typeof document['name'] !== 'string') continue;
    if (typeof document['_id'] !== 'string') continue;
    const system = document['system'];
    if (!isRecord(system)) continue;
    const traits = isRecord(system['traits']) ? system['traits']['value'] : undefined;
    if (!Array.isArray(traits)) continue;
    const subfeatures = isRecord(system['subfeatures']) ? system['subfeatures'] : {};
    const keyOptions = Array.isArray(subfeatures['keyOptions'])
      ? subfeatures['keyOptions'].filter((item): item is string => typeof item === 'string')
      : [];
    const summary: ClassFeatureSummary = {
      uuid: `Compendium.pf2e.classfeatures.Item.${document['_id']}`,
      name: document['name'],
      keyOptions,
    };
    for (const trait of traits) {
      if (typeof trait !== 'string') continue;
      const lista = index.get(trait);
      if (lista === undefined) index.set(trait, [summary]);
      else lista.push(summary);
    }
  }
  return index;
}
