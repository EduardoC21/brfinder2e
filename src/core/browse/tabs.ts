/**
 * A aba de LISTA da tela completa: outra fonte, com o filtro travado na entrada aberta.
 * Ver `ListTabSpec`. Aqui e não na tela porque é a mesma pergunta das contagens: quantas
 * heranças o Dwarf tem — e a resposta tem de ser a mesma na aba e no número dela.
 */

import { fieldList, fieldValue, type BrowseEntity } from './query';
import type { ListTabSpec } from './spec';

/** As entradas de `entities` que passam pela trava de `tab` para a entrada `carrier`. */
export function lockedEntities(
  tab: ListTabSpec,
  carrier: BrowseEntity,
  entities: readonly BrowseEntity[],
): BrowseEntity[] {
  return entities.filter((entity) =>
    tab.lock.every((rule) => {
      const alvo = fieldValue(carrier, rule.from);
      if (alvo === '') return false;
      return rule.match === 'equals'
        ? fieldValue(entity, rule.field) === alvo
        : fieldList(entity, rule.field).includes(alvo);
    }),
  );
}
