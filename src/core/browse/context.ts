/**
 * O CONTEXTO de uma abertura: quem concedeu a entrada, e o que disse sobre ela.
 *
 * Quando o Change Shape abre A PARTIR do Anadi, ele abre com o texto do Anadi. O dado
 * está na base de quem concede (`alterations`, ver `normalization/alterations.ts`); aqui
 * é só a busca: dado quem abre e o que abre, existe alteração para este alvo?
 *
 * Genérico de propósito: qualquer entrada com `alterations` na base — ancestralidade e
 * talento hoje; herança, classe e arquétipo depois — passa por aqui sem a tela saber
 * quem é.
 */

import { isRecord } from '../json';
import type { DescriptionAlteration } from '../normalization/alterations';
import { fieldValue, type BrowseEntity } from './query';

export interface DescriptionContext {
  /** O nome de quem concedeu — "Anadi" —, para a tela dizer de quem é o texto. */
  readonly from: string;
  readonly alteration: DescriptionAlteration;
}

function isAlteration(value: unknown): value is DescriptionAlteration {
  return (
    isRecord(value) &&
    typeof value['targetType'] === 'string' &&
    typeof value['targetSlug'] === 'string' &&
    (value['mode'] === 'add' || value['mode'] === 'override') &&
    Array.isArray(value['blocks'])
  );
}

/** A alteração que `carrier` declara para `target`, ou `null` quando não há. */
export function contextFor(
  carrier: BrowseEntity,
  targetType: string,
  target: BrowseEntity,
): DescriptionContext | null {
  const base = carrier.base;
  if (!isRecord(base) || !Array.isArray(base['alterations'])) return null;
  const slug = fieldValue(target, 'slug');
  if (slug === '') return null;
  const alteration = base['alterations'].find(
    (item): item is DescriptionAlteration =>
      isAlteration(item) && item.targetType === targetType && item.targetSlug === slug,
  );
  return alteration === undefined ? null : { from: fieldValue(carrier, 'name'), alteration };
}
