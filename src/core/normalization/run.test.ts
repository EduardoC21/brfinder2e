import { describe, expect, it } from 'vitest';

import { bool, html, nullable, shape, text, textList } from './decoders';
import { from, fromLang } from './field';
import { recipe } from './recipe';
import { formatReport, isClean } from './report';
import { run } from './run';

/**
 * Documentos sintéticos. A Etapa 2 entrega o MECANISMO, sem nenhum tipo de entidade —
 * o mapeamento de verdade é a Etapa 3, com o autor olhando o JSON real.
 */
function doc(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    _id: 'AAA',
    name: 'Frightened',
    type: 'widget',
    _stats: { compendiumSource: 'Compendium.x.y.Item.AAA', coreVersion: '14.361' },
    system: {
      slug: 'frightened',
      group: null,
      description: { value: '<p>texto</p>' },
      traits: { value: [] },
      publication: { license: 'ORC', title: 'Player Core', remaster: true },
      interno: 1,
    },
    ...overrides,
  };
}

const minimal = recipe({
  type: 'widget',
  packs: ['widgets'],
  base: {
    name: from('name', text),
    slug: from('system.slug', text),
    group: from('system.group', nullable(text)).optional(),
    traits: from('system.traits.value', textList).withDefault([]),
    source: from('system.publication', shape({ license: text, title: text })),
  },
  desc: {
    main: from('system.description.value', html),
  },
});

describe('run', () => {
  it('separa base de desc e carrega a identidade sozinho', () => {
    const result = run(minimal, [doc()]);
    const entity = result.entities[0];

    expect(entity?.identity).toEqual({
      id: 'AAA',
      uuid: 'Compendium.x.y.Item.AAA',
      type: 'widget',
    });
    expect(entity?.base).toEqual({
      name: 'Frightened',
      slug: 'frightened',
      group: null,
      traits: [],
      source: { license: 'ORC', title: 'Player Core' },
    });
    expect(entity?.desc).toEqual({ main: '<p>texto</p>' });
  });

  it('descarta documento de outro tipo', () => {
    const result = run(minimal, [doc(), doc({ type: 'outro' })]);
    expect(result.total).toBe(1);
  });

  it('campo ausente sem optional nem withDefault falha, nomeando documento e caminho', () => {
    const semSlug = doc({ system: { ...(doc()['system'] as object), slug: undefined } });
    delete (semSlug['system'] as Record<string, unknown>)['slug'];

    const result = run(minimal, [semSlug]);
    expect(result.entities).toHaveLength(0);
    expect(result.failures[0]).toMatchObject({
      id: 'AAA',
      name: 'Frightened',
      path: 'system.slug',
    });
  });

  it('uma falha não derruba as outras entidades', () => {
    const quebrado = doc({ _id: 'BBB', name: 'Quebrado' });
    (quebrado['system'] as Record<string, unknown>)['slug'] = 42;

    const result = run(minimal, [doc(), quebrado]);
    expect(result.entities).toHaveLength(1);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]?.message).toMatch(/esperado texto/);
  });

  it('withDefault entra quando o campo não existe', () => {
    const semTraits = doc();
    delete (semTraits['system'] as Record<string, unknown>)['traits'];
    expect(run(minimal, [semTraits]).entities[0]?.base.traits).toEqual([]);
  });
});

describe('relatório de não mapeados', () => {
  it('lista o que a receita não leu, com frequência e exemplo', () => {
    const { report } = run(minimal, [doc(), doc({ _id: 'BBB' })]);
    const paths = report.unmapped.map((item) => item.path);

    expect(paths).toContain('system.interno');
    expect(paths).toContain('_stats.coreVersion');
    // shape leu license e title, mas NÃO remaster: ele tem que aparecer.
    expect(paths).toContain('system.publication.remaster');

    const interno = report.unmapped.find((item) => item.path === 'system.interno');
    expect(interno).toMatchObject({ count: 2, example: 1 });
  });

  it('não lista o que a receita leu, nem a identidade automática', () => {
    const paths = run(minimal, [doc()]).report.unmapped.map((item) => item.path);
    expect(paths).not.toContain('name');
    expect(paths).not.toContain('system.publication.license');
    expect(paths).not.toContain('_id');
    expect(paths).not.toContain('_stats.compendiumSource');
  });

  it('ignore e defer tiram do relatório e registram o motivo', () => {
    const comMotivos = recipe({
      ...minimal,
      ignore: { 'system.interno': 'controle interno do Foundry' },
      defer: { '_stats.coreVersion': 'versão do core; decidir na fase da ficha' },
    });

    const { report } = run(comMotivos, [doc()]);
    const paths = report.unmapped.map((item) => item.path);

    expect(paths).not.toContain('system.interno');
    expect(paths).not.toContain('_stats.coreVersion');
    expect(report.ignored).toEqual([
      { path: 'system.interno', reason: 'controle interno do Foundry' },
    ]);
    expect(report.deferred).toHaveLength(1);
  });

  it('isClean só é verdade quando não sobrou nada por decidir', () => {
    expect(isClean(run(minimal, [doc()]).report)).toBe(false);

    const completa = recipe({
      ...minimal,
      ignore: {
        'system.interno': 'x',
        'system.publication.remaster': 'x',
        '_stats.coreVersion': 'x',
      },
    });
    expect(isClean(run(completa, [doc()]).report)).toBe(true);
  });

  it('formatReport produz texto legível', () => {
    const texto = formatReport(run(minimal, [doc()]).report);
    expect(texto).toContain('NÃO MAPEADOS');
    expect(texto).toContain('system.interno');
    expect(texto).toContain('IGNORADOS');
    expect(texto).toContain('ADIADOS');
  });
});

describe('fromLang', () => {
  const comIdioma = recipe({
    type: 'widget',
    packs: ['widgets'],
    base: {
      name: from('name', text),
      summary: fromLang('PF2E.condition.{system.slug}.summary', text).optional(),
    },
  });

  const table = new Map([['PF2E.condition.frightened.summary', 'Fear makes you less capable.']]);

  it('resolve o modelo com um caminho do documento', () => {
    const result = run(comIdioma, [doc()], { language: table });
    expect(result.entities[0]?.base.summary).toBe('Fear makes you less capable.');
  });

  it('chave ausente na tabela cai no optional em vez de falhar', () => {
    const outro = doc();
    (outro['system'] as Record<string, unknown>)['slug'] = 'inexistente';
    const result = run(comIdioma, [outro], { language: table });
    expect(result.failures).toHaveLength(0);
    expect(result.entities[0]?.base).not.toHaveProperty('summary');
  });

  it('sem tabela de idioma, o campo simplesmente não aparece', () => {
    expect(run(comIdioma, [doc()]).entities[0]?.base).not.toHaveProperty('summary');
  });
});

describe('validação da receita', () => {
  it('recusa caminho declarado em dois blocos', () => {
    expect(() =>
      recipe({
        type: 'w',
        packs: ['p'],
        base: { a: from('system.x', text) },
        ignore: { 'system.x': 'motivo' },
      }),
    ).toThrow(/aparece em base\.a e em ignore/);
  });

  it('recusa motivo em branco — nunca em silêncio', () => {
    expect(() =>
      recipe({ type: 'w', packs: ['p'], base: { a: from('n', text) }, ignore: { x: '  ' } }),
    ).toThrow(/está sem motivo/);
  });

  it('recusa receita sem pack ou sem campo em base', () => {
    expect(() => recipe({ type: 'w', packs: [], base: { a: from('n', text) } })).toThrow(
      /não declara nenhum pack/,
    );
    expect(() => recipe({ type: 'w', packs: ['p'], base: {} })).toThrow(/não projeta nenhum campo/);
  });
});

describe('map', () => {
  it('aplica a transformação depois de decodificar', () => {
    const r = recipe({
      type: 'widget',
      packs: ['w'],
      base: { valued: from('system.slug', text).map((slug) => slug.toUpperCase()) },
    });
    expect(run(r, [doc()]).entities[0]?.base.valued).toBe('FRIGHTENED');
  });

  it('convive com bool sem transformar o tipo por engano', () => {
    const documento = doc();
    (documento['system'] as Record<string, unknown>)['flag'] = true;
    const r = recipe({
      type: 'widget',
      packs: ['w'],
      base: { flag: from('system.flag', bool).map((value) => (value ? 1 : 0)) },
    });
    expect(run(r, [documento]).entities[0]?.base.flag).toBe(1);
  });
});
