/**
 * A aba de LISTA da tela completa: outra fonte, com o filtro travado na entrada aberta.
 * Ver `ListTabSpec`. Aqui e não na tela porque é a mesma pergunta das contagens: quantas
 * heranças o Dwarf tem — e a resposta tem de ser a mesma na aba e no número dela.
 */

import { fieldList, fieldValue, type BrowseEntity } from './query';
import type { ChoicesTabSpec, ListTabSpec, LockSpec } from './spec';

/**
 * As abas de ESCOLHA de uma classe, expandidas: uma por habilidade da entrada aberta que
 * tem `choiceTag`, listando as habilidades cuja `tags` tem essa etiqueta. Devolve abas de
 * lista prontas — com a trava e o rótulo (o nome da habilidade), na ordem do nível da
 * habilidade — para a barra desenhar como qualquer outra.
 */
export function expandChoiceTabs(
  tab: ChoicesTabSpec,
  carrier: BrowseEntity,
  features: readonly BrowseEntity[],
): readonly {
  readonly tab: ListTabSpec;
  readonly label: string;
  readonly entities: BrowseEntity[];
}[] {
  const uuids = new Set(valoresDoCampo(carrier, tab.from));
  const escolhas = features
    .filter((feature) => uuids.has(feature.uuid) && fieldValue(feature, 'choiceTag') !== '')
    .sort((a, b) => Number(fieldValue(a, 'level')) - Number(fieldValue(b, 'level')));
  const vistas = new Set<string>();
  const out: { tab: ListTabSpec; label: string; entities: BrowseEntity[] }[] = [];
  for (const escolha of escolhas) {
    const etiqueta = fieldValue(escolha, 'choiceTag');
    if (vistas.has(etiqueta)) continue;
    vistas.add(etiqueta);
    const entities = features.filter((feature) => fieldList(feature, 'tags').includes(etiqueta));
    if (entities.length === 0) continue;
    out.push({
      tab: {
        kind: 'list',
        id: `${tab.id}:${etiqueta}`,
        source: tab.source,
        lock: [{ field: 'tags', value: etiqueta, match: 'contains-value' }],
      },
      label: fieldValue(escolha, 'name'),
      entities,
    });
  }
  return out;
}

/** As bases que a trava `none-of` consulta: as entradas de cada fonte, pelo `id`. */
export type SourceLookup = (sourceId: string) => readonly BrowseEntity[] | undefined;

/** Os valores de UM campo da entrada aberta: um, ou a lista inteira quando é lista. */
function valoresDoCampo(carrier: BrowseEntity, from: string): readonly string[] {
  const lista = fieldList(carrier, from);
  if (lista.length > 0) return lista;
  const um = fieldValue(carrier, from);
  return um === '' ? [] : [um];
}

/** Os valores de onde travar: o primeiro campo da lista que tem valor. */
function valoresDe(carrier: BrowseEntity, from: string | readonly string[]): readonly string[] {
  const campos = typeof from === 'string' ? [from] : from;
  for (const campo of campos) {
    const valores = valoresDoCampo(carrier, campo);
    if (valores.length > 0) return valores;
  }
  return [];
}

/** O valor do campo na entrada listada — e `uuid` é o da ENTRADA, que não mora na base. */
function valorDaEntrada(entity: BrowseEntity, field: string): string {
  return field === 'uuid' ? entity.uuid : fieldValue(entity, field);
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
      return alvos.length > 0 && alvos.includes(valorDaEntrada(entity, rule.field));
    }
    case 'contains': {
      const alvos = valoresDe(carrier, rule.from);
      const tem = fieldList(entity, rule.field);
      return alvos.some((alvo) => tem.includes(alvo));
    }
    case 'is':
      return valorDaEntrada(entity, rule.field) === rule.value;
    case 'contains-value':
      return fieldList(entity, rule.field).includes(rule.value);
    case 'none-of': {
      const fonte = lookup(rule.source);
      if (fonte === undefined) return false;
      const proibidos = new Set(fonte.map((outra) => fieldValue(outra, rule.key)));
      return !fieldList(entity, rule.field).some((valor) => proibidos.has(valor));
    }
  }
}

/**
 * As entradas de `entities` que passam pela trava de `tab` para a entrada `carrier` — e,
 * quando a aba ANOTA, cada uma volta com o campo de origem escrito na base (uma cópia:
 * a entrada da fonte não muda). É o `uuid` da entrada que decide o grupo.
 */
export function lockedEntities(
  tab: ListTabSpec,
  carrier: BrowseEntity,
  entities: readonly BrowseEntity[],
  lookup: SourceLookup = () => undefined,
): BrowseEntity[] {
  const travadas = entities.filter((entity) =>
    tab.lock.every((rule) => passa(rule, entity, carrier, lookup)),
  );
  const anota = tab.annotate;
  if (anota === undefined) return travadas;
  const campo = anota.field;
  const grupos = (anota.groups ?? []).map((group) => ({
    value: group.value,
    uuids: new Set(valoresDoCampo(carrier, group.from)),
  }));
  const niveis = niveisNoContexto(carrier, anota.levels ?? []);
  return travadas.map((entity) => {
    const grupo = grupos.find((g) => g.uuids.has(entity.uuid));
    const nivel = niveis.get(entity.uuid);
    if (grupo === undefined && nivel === undefined) return entity;
    const base = typeof entity.base === 'object' && entity.base !== null ? entity.base : {};
    return {
      ...entity,
      base: {
        ...base,
        ...(grupo === undefined || campo === undefined ? {} : { [campo]: grupo.value }),
        ...(nivel === undefined ? {} : { level: nivel }),
      },
    };
  });
}

/** `uuid → level` das listas `{uuid, level}` da entrada aberta; sem nível, não entra. */
function niveisNoContexto(carrier: BrowseEntity, fields: readonly string[]): Map<string, number> {
  const out = new Map<string, number>();
  const base = carrier.base;
  if (typeof base !== 'object' || base === null) return out;
  for (const field of fields) {
    const lista = (base as Record<string, unknown>)[field];
    if (!Array.isArray(lista)) continue;
    for (const item of lista as unknown[]) {
      if (typeof item !== 'object' || item === null) continue;
      const { uuid, level } = item as { uuid?: unknown; level?: unknown };
      if (typeof uuid === 'string' && typeof level === 'number') out.set(uuid, level);
    }
  }
  return out;
}
