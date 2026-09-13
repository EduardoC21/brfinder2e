import { describe, expect, it } from 'vitest';

import { RAIL, firstRailEntry, railEntryKey, typeFilterOf } from './rail';
import { FEATURE_KINDS, SOURCES } from './spec';

describe('o trilho setorizado', () => {
  it('toda entrada aponta para uma fonte da spec, e nenhuma escondida', () => {
    for (const group of RAIL) {
      for (const entry of group.entries) {
        const source = SOURCES.find((spec) => spec.id === entry.source);
        expect(source, `${group.id}: ${entry.source}`).toBeDefined();
        expect(source?.hidden, entry.source).not.toBe(true);
      }
    }
  });

  it('toda fonte do trilho aparece uma vez só como fonte inteira', () => {
    const inteiras = RAIL.flatMap((group) =>
      group.entries.flatMap((entry) => (entry.kind === 'source' ? [entry.source] : [])),
    );
    const esperadas = SOURCES.filter((source) => source.hidden !== true).map((s) => s.id);
    expect([...inteiras].sort()).toEqual([...esperadas].sort());
  });

  it('a entrada de Tipo só existe em fonte com filtro de Tipo, sem valor repetido', () => {
    for (const group of RAIL) {
      const vistos = new Set<string>();
      for (const entry of group.entries) {
        if (entry.kind !== 'type') continue;
        const source = SOURCES.find((spec) => spec.id === entry.source);
        expect(source && typeFilterOf(source), entry.source).toBeDefined();
        const key = railEntryKey(entry);
        expect(vistos.has(key), key).toBe(false);
        vistos.add(key);
      }
    }
  });

  it('os Tipos de habilidade são os da lista fechada', () => {
    const habilidades = RAIL.find((group) => group.id === 'features');
    const valores = habilidades?.entries.flatMap((e) => (e.kind === 'type' ? [e.value] : []));
    expect(valores).toEqual(FEATURE_KINDS);
  });

  it('abre em Ancestralidades, a primeira do trilho com receita', () => {
    expect(firstRailEntry()).toEqual({ kind: 'source', source: 'ancestries' });
  });
});
