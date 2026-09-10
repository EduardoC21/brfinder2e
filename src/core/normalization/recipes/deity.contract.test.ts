/**
 * TESTE DE CONTRATO das receitas de `deity` e `domain` — as 480 e as 61 de verdade.
 *
 * Um arquivo para as duas porque o que importa é a JUNÇÃO: a divindade aponta para o
 * domínio por slug, e a página do domínio aponta de volta por UUID.
 *
 * Fora do `npm test`: baixa 34 MiB. Roda com `npm run test:contract`.
 */

import { beforeAll, describe, expect, it } from 'vitest';

import {
  DEFAULT_CHANNEL,
  KNOWN_GOOD_TAG,
  languageFiles,
  loadInventory,
  parseFolderRoots,
  readTextEntry,
} from '@core/source/index';
import { createFetchHttp } from '@platform/http-fetch';
import { mergeLanguageFiles } from '../language';
import { isClean } from '../report';
import { run, type RunResult } from '../run';
import { deityRecipe, type DeityBase, type DeityDesc } from './deity';
import { domainRecipe, type DomainBase, type DomainDesc } from './domain';

const http = createFetchHttp({ headers: { Accept: 'application/vnd.github+json' } });
let deities: RunResult<DeityBase, DeityDesc>;
let domains: RunResult<DomainBase, DomainDesc>;

beforeAll(async () => {
  const loaded = await loadInventory(http, { tag: KNOWN_GOOD_TAG });
  const language = mergeLanguageFiles(
    languageFiles(loaded.manifest, 'en').map(
      (entry) => JSON.parse(readTextEntry(loaded.zip, entry.path)) as unknown,
    ),
  );

  const pack = loaded.inventory.packs.find((entry) => entry.name === 'deities');
  const declaration = loaded.manifest.packs.find((entry) => entry.name === 'deities');
  if (!pack || !declaration) throw new Error('o pack deities sumiu do manifesto');
  const folders = parseFolderRoots(
    JSON.parse(readTextEntry(loaded.zip, DEFAULT_CHANNEL.packFoldersFile(declaration))),
  );
  deities = run(
    deityRecipe,
    [
      {
        pack: 'deities',
        documents: JSON.parse(readTextEntry(loaded.zip, pack.file)) as unknown[],
        folders,
      },
    ],
    { language },
  );

  const journals = loaded.inventory.packs.find((entry) => entry.name === 'journals');
  if (!journals) throw new Error('o pack journals sumiu do manifesto');
  domains = run(
    domainRecipe,
    [
      {
        pack: 'journals',
        documents: JSON.parse(readTextEntry(loaded.zip, journals.file)) as unknown[],
      },
    ],
    { language },
  );
}, 180_000);

describe('as 480 divindades reais', () => {
  const base = (): readonly DeityBase[] => deities.entities.map((entity) => entity.base);

  it('normalizam todas, sem falha e com relatório limpo', () => {
    expect(deities.failures).toEqual([]);
    expect(deities.entities).toHaveLength(480);
    expect(deities.report.unmapped, JSON.stringify(deities.report.unmapped, null, 1)).toEqual([]);
    expect(isClean(deities.report)).toBe(true);
  });

  it('o Tipo é a categoria: deus, panteão, pacto, filosofia', () => {
    const por = new Map<string, number>();
    for (const d of base()) por.set(d.kind, (por.get(d.kind) ?? 0) + 1);
    expect(Object.fromEntries(por)).toEqual({
      deity: 419,
      pantheon: 37,
      covenant: 17,
      philosophy: 7,
    });
  });

  /* A pasta ENTRA aqui, ao contrário de equipamento e antecedente: cobre 465 dos 480. */
  it('o grupo vem da pasta e cobre 465', () => {
    expect(base().filter((d) => d.group === '')).toHaveLength(15);
    expect(base().filter((d) => d.group === 'Core Gods')).toHaveLength(20);
  });

  it('o atributo divino é uma escolha entre dois em 471', () => {
    expect(base().filter((d) => d.divineAttribute.length === 2)).toHaveLength(471);
  });

  it('a santificação tem seis formas, e nula é a segunda mais comum', () => {
    const por = new Map<string, number>();
    for (const d of base()) por.set(d.sanctification, (por.get(d.sanctification) ?? 0) + 1);
    expect(Object.fromEntries(por)).toEqual({
      'can:holy': 155,
      '': 110,
      'must:unholy': 85,
      'can:unholy': 61,
      'can:holy+unholy': 45,
      'must:holy': 24,
    });
  });

  it('as magias de clérigo: três em 456, nove em 9, nenhuma em 10', () => {
    const por = new Map<number, number>();
    for (const d of base()) por.set(d.spells.length, (por.get(d.spells.length) ?? 0) + 1);
    expect(Object.fromEntries(por)).toEqual({ 3: 456, 0: 10, 9: 9, 4: 5 });
  });
});

describe('os 61 domínios reais', () => {
  it('normalizam todos, sem falha e com relatório limpo', () => {
    expect(domains.failures).toEqual([]);
    expect(domains.entities).toHaveLength(61);
    expect(isClean(domains.report)).toBe(true);
  });

  it('todos têm as duas magias', () => {
    expect(domains.entities.filter((e) => e.base.spell === null)).toEqual([]);
    expect(domains.entities.filter((e) => e.base.advancedSpell === null)).toEqual([]);
  });
});

/*
 * ⚠️ A JUNÇÃO nos dois sentidos. Se cair, o clique num domínio da divindade não abre nada,
 * ou o nome de uma divindade na página do domínio vira texto morto.
 */
describe('a ponte entre divindade e domínio', () => {
  it('61 dos 64 domínios citados pelas divindades têm página — faltam três, nomeados', () => {
    const citados = new Set(
      deities.entities.flatMap((e) => [...e.base.domains, ...e.base.alternateDomains]),
    );
    const paginas = new Set(domains.entities.map((e) => e.base.slug));
    expect(citados.size).toBe(64);
    const semPagina = [...citados].filter((slug) => !paginas.has(slug)).sort();
    expect(semPagina).toEqual(['delirium', 'void', 'wyrmkin']);
    // E toda página é citada por alguma divindade: nenhum domínio órfão.
    expect([...paginas].filter((slug) => !citados.has(slug))).toEqual([]);
  });

  it('toda divindade citada numa página de domínio existe no pack', () => {
    const uuids = new Set(deities.entities.map((e) => e.identity.uuid));
    const RE = /@UUID\[(Compendium\.pf2e\.deities\.Item\.[^\]]+)\]/g;
    let citadas = 0;
    const orfas: string[] = [];
    for (const e of domains.entities) {
      for (const m of e.desc.main.matchAll(RE)) {
        citadas++;
        if (!uuids.has(m[1] ?? '')) orfas.push(m[1] ?? '');
      }
    }
    expect(citadas).toBe(2473);
    expect(orfas).toEqual([]);
  });
});
