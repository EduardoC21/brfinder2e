/**
 * TESTE DE CONTRATO da receita de `class` — as 29 classes reais, com o jornal.
 *
 * Fora do `npm test`: baixa 34 MiB. Roda com `npm run test:contract`.
 */

import { beforeAll, describe, expect, it } from 'vitest';

import { KNOWN_GOOD_TAG, loadInventory, readTextEntry } from '@core/source/index';
import { createFetchHttp } from '@platform/http-fetch';
import { indexClassFeatures } from '../features-index';
import { indexJournalPages } from '../journals';
import { isClean } from '../report';
import { run, type RunResult } from '../run';
import { classRecipe, type ClassBase, type ClassDesc } from './class';
import { CLASS_SLUGS } from './feature';

const http = createFetchHttp({ headers: { Accept: 'application/vnd.github+json' } });
let result: RunResult<ClassBase, ClassDesc>;

beforeAll(async () => {
  const loaded = await loadInventory(http, { tag: KNOWN_GOOD_TAG });
  const ler = (nome: string): unknown[] => {
    const pack = loaded.inventory.packs.find((entry) => entry.name === nome);
    if (!pack) throw new Error(`o pack ${nome} sumiu do manifesto`);
    return JSON.parse(readTextEntry(loaded.zip, pack.file)) as unknown[];
  };
  result = run(classRecipe, [{ pack: 'classes', documents: ler('classes') }], {
    journals: indexJournalPages(ler('journals')),
    features: indexClassFeatures(ler('classfeatures')),
  });
}, 180_000);

const contar = (chave: (b: ClassBase) => string | number) => {
  const por = new Map<string, number>();
  for (const e of result.entities) {
    const k = String(chave(e.base));
    por.set(k, (por.get(k) ?? 0) + 1);
  }
  return Object.fromEntries(por) as Record<string, number>;
};

describe('as 29 classes reais', () => {
  it('normalizam todas, sem falha e com relatório limpo', () => {
    expect(result.failures).toEqual([]);
    expect(result.entities).toHaveLength(29);
    expect(result.report.unmapped, JSON.stringify(result.report.unmapped, null, 1)).toEqual([]);
    expect(isClean(result.report)).toBe(true);
  });

  /* A lista fechada de slugs da receita de habilidade bate com o pack. */
  it('os 29 slugs são exatamente CLASS_SLUGS', () => {
    expect(new Set(result.entities.map((e) => e.base.slug))).toEqual(CLASS_SLUGS);
  });

  it('a ficha inicial, como medido', () => {
    expect(contar((b) => b.hp)).toEqual({ 6: 4, 8: 16, 10: 7, 12: 2 });
    expect(contar((b) => b.perception)).toEqual({ 1: 19, 2: 10 });
    expect(contar((b) => b.spellcasting)).toEqual({ 0: 16, 1: 13 });
    expect(result.entities.filter((b) => b.base.keyAbility.length === 2)).toHaveLength(6);
    /* O psíquico é a única com a lista vazia: o atributo vem da mente consciente. */
    expect(
      result.entities.filter((b) => b.base.keyAbility.length === 0).map((b) => b.base.slug),
    ).toEqual(['psychic']);
    expect(result.entities.filter((b) => b.base.attacks.other.name !== '')).toHaveLength(3);
  });

  /*
   * A escolha de 1º nível treina uma perícia em 10 — 9 batem com o bloco "Skills" da
   * página ("trained in one skill determined by your druidic order"…); o Ranger entra
   * pelo Vindicator, a única aresta que treina (Religion), que o bloco não cita.
   */
  it('a perícia pela subclasse, como medido', () => {
    const com = result.entities.filter((b) => b.base.subclassSkill).map((b) => b.base.slug);
    expect(com.sort()).toEqual([
      'druid',
      'gunslinger',
      'investigator',
      'oracle',
      'ranger',
      'rogue',
      'sorcerer',
      'summoner',
      'swashbuckler',
      'witch',
    ]);
  });

  /* Só ladino e psíquico têm subclasse que abre o atributo-chave: 9 habilidades. */
  it('o atributo-chave que a subclasse abre vem das habilidades', () => {
    const com = result.entities.filter((b) => b.base.keyAbilityOptions.length > 0);
    expect(com.map((b) => b.base.slug).sort()).toEqual(['psychic', 'rogue']);
    const ladino = com.find((b) => b.base.slug === 'rogue')?.base.keyAbilityOptions ?? [];
    expect(ladino.map((o) => o.ability)).toEqual(['str', 'int', 'wis', 'cha']);
    expect(ladino[0]?.features.map((f) => f.name).sort()).toEqual(['Avenger', 'Ruffian']);
    const psiquico = com.find((b) => b.base.slug === 'psychic')?.base.keyAbilityOptions ?? [];
    expect(psiquico.map((o) => o.ability)).toEqual(['int', 'cha']);
    expect(psiquico.flatMap((o) => o.features)).toHaveLength(4);
  });

  /* 556 habilidades apontadas, 15 a 26 por classe, todas em classfeatures. */
  it('as habilidades por nível vêm de system.items', () => {
    const todas = result.entities.flatMap((e) => e.base.features);
    expect(todas).toHaveLength(556);
    expect(todas.every((f) => f.uuid.startsWith('Compendium.pf2e.classfeatures.'))).toBe(true);
    for (const e of result.entities) {
      expect(e.base.features.length).toBeGreaterThanOrEqual(15);
      expect(e.base.features.length).toBeLessThanOrEqual(26);
    }
  });

  /* 29 tabelas de progressão com 20 níveis; 12 de magias (os 13 conjuradores menos o Champion). */
  it('as tabelas da página: progressão nas 29, magias em 12', () => {
    for (const e of result.entities) {
      expect((e.desc.progression.match(/<tr/g) ?? []).length, e.base.name).toBe(21);
    }
    const comMagias = result.entities.filter((e) => e.desc.spellSlots !== '');
    expect(comMagias).toHaveLength(12);
    expect(comMagias.every((e) => e.base.spellcasting === 1)).toBe(true);
    expect(
      result.entities
        .filter((e) => e.base.spellcasting === 1 && e.desc.spellSlots === '')
        .map((e) => e.base.slug),
    ).toEqual(['champion']);
  });

  it('a página do jornal está nas 29 e é maior que o resumo', () => {
    for (const e of result.entities) {
      expect(e.desc.page.length, e.base.name).toBeGreaterThan(e.desc.main.length);
      expect(e.desc.page).toContain('Class Features');
    }
  });
});
