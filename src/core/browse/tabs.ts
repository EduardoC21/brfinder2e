/**
 * A aba de LISTA da tela completa: outra fonte, com o filtro travado na entrada aberta.
 * Ver `ListTabSpec`. Aqui e não na tela porque é a mesma pergunta das contagens: quantas
 * heranças o Dwarf tem — e a resposta tem de ser a mesma na aba e no número dela.
 */

import { fieldList, fieldValue, type BrowseEntity } from './query';
import type { ListTabSpec, LockSpec } from './spec';

/** As bases que a trava `none-of` consulta: as entradas de cada fonte, pelo `id`. */
export type SourceLookup = (sourceId: string) => readonly BrowseEntity[] | undefined;

/** Os valores do campo `from` da entrada aberta: um, ou a lista inteira quando é lista. */
function valoresDe(carrier: BrowseEntity, from: string): readonly string[] {
  const lista = fieldList(carrier, from);
  if (lista.length > 0) return lista;
  const um = fieldValue(carrier, from);
  return um === '' ? [] : [um];
}

function passa(
  rule: LockSpec,
  entity: BrowseEntity,
  carrier: BrowseEntity,
  lookup: SourceLookup,
): boolean {
  switch (rule.match) {
    case 'equals': {
      const alvos = valoresDe(carrier, rule.from);
      return alvos.length > 0 && alvos.includes(fieldValue(entity, rule.field));
    }
    case 'contains': {
      const alvos = valoresDe(carrier, rule.from);
      const tem = fieldList(entity, rule.field);
      return alvos.some((alvo) => tem.includes(alvo));
    }
    case 'is':
      return fieldValue(entity, rule.field) === rule.value;
    case 'none-of': {
      const fonte = lookup(rule.source);
      if (fonte === undefined) return false;
      const proibidos = new Set(fonte.map((outra) => fieldValue(outra, rule.key)));
      return !fieldList(entity, rule.field).some((valor) => proibidos.has(valor));
    }
  }
}

/** As entradas de `entities` que passam pela trava de `tab` para a entrada `carrier`. */
export function lockedEntities(
  tab: ListTabSpec,
  carrier: BrowseEntity,
  entities: readonly BrowseEntity[],
  lookup: SourceLookup = () => undefined,
): BrowseEntity[] {
  return entities.filter((entity) =>
    tab.lock.every((rule) => passa(rule, entity, carrier, lookup)),
  );
}
