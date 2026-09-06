import { describe, expect, it } from 'vitest';

import { isClean } from '../report';
import { run } from '../run';
import { spellRecipe } from './spell';
import {
  bonewallBulwark,
  folderRoots,
  invokeTrueName,
  quench,
  theWorldsAStage,
  todas,
} from './spell.fixtures';

const result = run(spellRecipe, [{ pack: 'spells-srd', documents: todas, folders: folderRoots }]);

const base = (nome: string) => {
  const achado = result.entities.find((entity) => entity.base.name === nome);
  if (!achado) throw new Error(`amostra ${nome} não normalizou`);
  return achado.base;
};

describe('receita de spell', () => {
  it('normaliza as cinco amostras sem falha, com relatório limpo', () => {
    expect(result.failures).toEqual([]);
    expect(result.entities).toHaveLength(5);
    expect(result.report.unmapped, JSON.stringify(result.report.unmapped)).toEqual([]);
    expect(isClean(result.report)).toBe(true);
  });
});

describe('Quench — duas ações, área e salvamento básico', () => {
  it('projeta base', () => {
    expect(base('Quench')).toEqual({
      name: 'Quench',
      slug: 'quench',
      rank: 2,
      cast: { from: { kind: 'action', count: 2, time: null }, to: null, raw: '2' },
      sector: 'Spells',
      traits: ['concentrate', 'manipulate', 'water'],
      rarity: 'common',
      traditions: ['primal'],
      range: '120 feet',
      target: '',
      area: { type: 'burst', value: 20, details: null },
      duration: '',
      sustained: true,
      save: { statistic: 'fortitude', basic: true },
      passiveDefense: '',
      materialCost: '',
      requirements: '',
      counteraction: true,
      ritual: null,
      source: { license: 'OGL', remaster: false, title: "Pathfinder Advanced Player's Guide" },
    });
  });

  it('guarda a descrição com a referência cruzada intacta', () => {
    const entidade = result.entities.find((e) => e.base.name === 'Quench');
    expect(entidade?.desc.main).toContain('@UUID[');
  });
});

/*
 * O custo é o campo sem paralelo nas outras receitas. A faixa mora aqui porque é o formato
 * que só magia tem — ação e talento nunca dizem "de uma a três".
 */
describe('o custo de conjurar', () => {
  it('faixa vira dois extremos, e não um número só', () => {
    expect(base('Blessing of Defiance').cast).toEqual({
      from: { kind: 'action', count: 1, time: null },
      to: { kind: 'action', count: 3, time: null },
      raw: '1 to 3',
    });
  });

  it('duração é custo tanto quanto contagem de ações', () => {
    expect(base("The World's a Stage").cast.from).toEqual({
      kind: 'time',
      count: null,
      time: { count: 1, unit: 'day' },
    });
  });
});

describe('salvamento e defesa passiva se excluem', () => {
  it('a passiva vem com o salvamento nulo', () => {
    expect(bonewallBulwark.system.defense.save).toBeNull();
    expect(base('Bonewall Bulwark').save).toBeNull();
    expect(base('Bonewall Bulwark').passiveDefense).toBe('ac');
  });

  it('quem tem salvamento não tem passiva', () => {
    expect(base('Quench').save).toEqual({ statistic: 'fortitude', basic: true });
    expect(base('Quench').passiveDefense).toBe('');
  });

  it('sem defesa nenhuma, os dois ficam vazios', () => {
    expect(invokeTrueName.system.defense).toBeNull();
    expect(base('Invoke True Name').save).toBeNull();
    expect(base('Invoke True Name').passiveDefense).toBe('');
  });
});

describe("The World's a Stage — o ritual", () => {
  /*
   * ZERO conjuradores secundários é valor real, em 33 rituais. NULO é outra coisa, e são 4.
   * Colapsar os dois em 0 apagaria a diferença.
   */
  it('casters nulo continua nulo, e não vira zero', () => {
    expect(theWorldsAStage.system.ritual.secondary.casters).toBeNull();
    expect(base("The World's a Stage").ritual).toEqual({
      primaryCheck: 'Occultism (expert)',
      secondaryCasters: null,
      secondaryChecks: 'Crafting, Performance',
    });
  });

  it('tradição vazia não é falha: ritual não pertence a uma tradição', () => {
    expect(base("The World's a Stage").traditions).toEqual([]);
  });

  it('o material gasto chega como prosa', () => {
    expect(base("The World's a Stage").materialCost).toContain('costumes');
  });

  it('o setor separa ritual de magia comum', () => {
    expect(base("The World's a Stage").sector).toBe('Rituals');
    expect(base('Quench').sector).toBe('Spells');
  });
});

describe('Invoke True Name — truque', () => {
  /* Traço e posto são eixos diferentes: há truque de posto alto entre as cantigas. */
  it('o truque é o TRAÇO, e o posto é outra coisa', () => {
    expect(base('Invoke True Name').traits).toContain('cantrip');
    expect(base('Invoke True Name').rank).toBe(1);
  });

  it('área ausente vem como nulo, e não como objeto vazio', () => {
    expect(quench.system.area).not.toBeNull();
    expect(base('Invoke True Name').area).toBeNull();
  });

  it('a raridade `rare` chega inteira', () => {
    expect(base('Invoke True Name').rarity).toBe('rare');
    expect(base('Invoke True Name').traditions).toHaveLength(4);
  });
});

describe('o que ficou de fora, e por quê', () => {
  /*
   * O `Heightened` é o único campo que segue o padrão do talento: o TEXTO cobre mais que o
   * dado — 1.134 descrições contra 610 campos estruturados.
   */
  it('a escala por posto fica adiada porque o texto cobre mais', () => {
    expect(Object.keys(spellRecipe.defer)).toContain('system.heightening');
    expect(spellRecipe.defer['system.heightening']).toContain('1.134');
  });

  it('dano, variantes e texto de mestre também ficam adiados ou ignorados', () => {
    expect(Object.keys(spellRecipe.defer)).toContain('system.damage');
    expect(Object.keys(spellRecipe.defer)).toContain('system.overlays');
    expect(Object.keys(spellRecipe.defer)).toContain('system.description.gm');
  });

  it('o cache de interface vazado está ignorado, com o motivo escrito', () => {
    expect(spellRecipe.ignore['system.traits.selected']).toContain('vazou');
  });
});

describe('o escopo', () => {
  it('declara um pack só — o tipo do Foundry corresponde a uma coisa só', () => {
    expect(spellRecipe.packs.map((p) => p.name)).toEqual(['spells-srd']);
  });
});
