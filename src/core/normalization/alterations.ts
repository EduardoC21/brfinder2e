/**
 * A DESCRIÇÃO NO CONTEXTO: o que uma entrada diz sobre OUTRA quando a concede.
 *
 * O Change Shape é uma ação só (`actionspf2e`), com um texto genérico. Mas o Anadi, o
 * Kitsune, o Tanuki e o Yaoguai o concedem cada um com o SEU texto — no Foundry, quem
 * abre o Change Shape pela ficha de um anadi lê a versão anadi. O autor viu isso e pediu
 * o mesmo aqui, de um jeito que sirva a ancestralidade, herança, classe e arquétipo.
 *
 * O mecanismo do Foundry é o rule element `ItemAlteration` com `property: "description"`:
 *
 *   { key: "ItemAlteration", itemType: "action", predicate: ["item:slug:change-shape"],
 *     mode: "override", property: "description",
 *     value: [{ text: "PF2E.SpecificRule.ChangeShape.Anadi" }] }
 *
 * `mode` é `override` (o texto substitui) ou `add` (o texto vem depois); `value` é uma
 * lista de blocos, cada um com `text` (uma chave de idioma, ou texto literal), `title`
 * opcional e `divider` opcional. O alvo é o `item:slug:…` do predicado.
 *
 * Medido no `pf2e-8.5.0`, nas fontes que temos ou vamos ter: 503 alterações de descrição
 * (feats 282, class-features 202, equipment 6, actions 6, ancestries 4, heritages 3).
 * Só **91 são ESTÁTICAS** — o predicado é exatamente um `item:slug:X` (feats 56,
 * class-features 30, ancestries 4, heritages 1), com alvos ação 46, talento 35, magia 7,
 * arma 3. As outras 412 dependem do ESTADO da ficha (`spellshape:*`, `class:witch`,
 * `item:tag:amped`, `{item|flags…}`), que uma consulta não tem — ficam de fora, e é de
 * propósito. Das chaves de idioma, 615 de 636 resolvem; as 21 que não têm `{actor|…}`.
 *
 * O que sai daqui é DADO da entrada que concede (`alterations` na base dela). Quem aplica
 * é a tela, na hora de abrir o alvo A PARTIR dela — ver `core/browse/context.ts`.
 */

import { isRecord } from '../json';
import type { LookupTables } from './field';

export interface AlterationBlock {
  readonly title?: string;
  /** HTML com marcação do Foundry, como uma descrição. */
  readonly text: string;
  readonly divider?: boolean;
}

export interface DescriptionAlteration {
  /** O tipo de ENTIDADE do alvo (`action`, `feat`…), já traduzido do `itemType` do Foundry. */
  readonly targetType: string;
  readonly targetSlug: string;
  readonly mode: 'add' | 'override';
  readonly blocks: readonly AlterationBlock[];
}

/** `itemType` do Foundry → tipo de entidade daqui. O que não está aqui não vira alteração. */
const TIPO: Readonly<Record<string, string>> = {
  action: 'action',
  feat: 'feat',
  spell: 'spell',
  condition: 'condition',
  weapon: 'equipment',
  armor: 'equipment',
  consumable: 'equipment',
  equipment: 'equipment',
};

const SLUG = /^item:slug:([a-z0-9-]+)$/;

/** O único `item:slug:X` de um predicado só de slug — ou `null` se o predicado depende de estado. */
function alvoEstatico(predicate: unknown): string | null {
  if (!Array.isArray(predicate) || predicate.length !== 1) return null;
  const termo: unknown = (predicate as unknown[])[0];
  if (typeof termo !== 'string') return null;
  return SLUG.exec(termo)?.[1] ?? null;
}

/**
 * O texto de um bloco: chave de idioma resolvida, `{item|description}` (a própria
 * descrição de quem concede), ou o literal. Chave que não resolve devolve `null` e o
 * bloco é descartado — melhor faltar um bloco que mostrar `PF2E.SpecificRule.…`.
 */
function texto(
  cru: unknown,
  document: Record<string, unknown>,
  tables: LookupTables,
): string | null {
  if (typeof cru !== 'string' || cru === '') return null;
  if (cru === '{item|description}') {
    const system = document['system'];
    const description = isRecord(system) ? system['description'] : undefined;
    const value = isRecord(description) ? description['value'] : undefined;
    return typeof value === 'string' ? value : null;
  }
  if (cru.startsWith('PF2E.')) return tables.language?.get(cru) ?? null;
  return cru;
}

export function descriptionAlterations(
  document: unknown,
  tables: LookupTables,
): readonly DescriptionAlteration[] {
  if (!isRecord(document) || !isRecord(document['system'])) return [];
  const rules = document['system']['rules'];
  if (!Array.isArray(rules)) return [];

  const out: DescriptionAlteration[] = [];
  for (const rule of rules) {
    if (!isRecord(rule) || rule['key'] !== 'ItemAlteration' || rule['property'] !== 'description')
      continue;
    const targetType = typeof rule['itemType'] === 'string' ? TIPO[rule['itemType']] : undefined;
    const targetSlug = alvoEstatico(rule['predicate']);
    const mode = rule['mode'];
    if (targetType === undefined || targetSlug === null) continue;
    if (mode !== 'add' && mode !== 'override') continue;
    if (!Array.isArray(rule['value'])) continue;

    const blocks: AlterationBlock[] = [];
    for (const item of rule['value'] as unknown[]) {
      if (!isRecord(item)) continue;
      const corpo = texto(item['text'], document, tables);
      if (corpo === null) continue;
      const title = texto(item['title'], document, tables);
      blocks.push({
        text: corpo,
        ...(title === null ? {} : { title }),
        ...(item['divider'] === true ? { divider: true } : {}),
      });
    }
    if (blocks.length > 0) out.push({ targetType, targetSlug, mode, blocks });
  }
  return out;
}
