import { describe, expect, it } from 'vitest';

import { isClean } from '../report';
import { run } from '../run';
import { backgroundRecipe } from './background';
import { todos } from './background.fixtures';

const result = run(backgroundRecipe, [{ pack: 'backgrounds', documents: todos }]);

const base = (nome: string) => {
  const achado = result.entities.find((entity) => entity.base.name === nome);
  if (!achado) throw new Error(`amostra ${nome} não normalizou`);
  return achado.base;
};

describe('receita de background', () => {
  it('normaliza as cinco amostras sem falha, com relatório limpo', () => {
    expect(result.failures).toEqual([]);
    expect(result.entities).toHaveLength(5);
    expect(result.report.unmapped, JSON.stringify(result.report.unmapped)).toEqual([]);
    expect(isClean(result.report)).toBe(true);
  });
});

describe('a mecânica, que cabe em quatro coisas', () => {
  it('projeta o antecedente inteiro', () => {
    expect(base('Acrobat')).toEqual({
      name: 'Acrobat',
      slug: 'acrobat',
      rarity: 'common',
      traits: [],
      skills: ['acrobatics'],
      lore: ['Circus Lore'],
      boosts: ['dex', 'str'],
      feats: [
        {
          uuid: 'Compendium.pf2e.feats-srd.Item.CnqMJR8e9jqJR7MM',
          name: 'Steady Balance',
        },
      ],
      source: { license: 'ORC', remaster: true, title: 'Pathfinder Player Core' },
    });
  });

  /* 80 dos 520 não treinam perícia, 93 não dão Saber e 116 não concedem talento. */
  it('o vazio é resposta, e não buraco', () => {
    const a = base('Amnesiac');
    expect(a.skills).toEqual([]);
    expect(a.lore).toEqual([]);
    expect(a.feats).toEqual([]);
  });

  /*
   * ⚠️ O AUMENTO LIVRE vira lista VAZIA, e não os seis atributos.
   *
   * "Escolha um aumento livre" é ausência de recorte; devolver `[cha, con, dex, int, str,
   * wis]` desenharia isso como se fosse uma escolha entre seis, que é outra coisa. São 9
   * dos 520 assim.
   */
  it('o aumento livre é a lista vazia', () => {
    expect(base('Amnesiac').boosts).toEqual([]);
  });

  /* 9 dos 520 fixam UM atributo em vez de oferecer escolha entre dois. */
  it('o aumento pode ser de um atributo só', () => {
    expect(base('Crown of Chaos').boosts).toEqual(['cha']);
  });

  /* 2 dos 520 concedem dois talentos — é por eles que `feats` é lista. */
  it('dois talentos concedidos entram os dois', () => {
    expect(base('Hermean Heritor').feats.map((feat) => feat.name)).toEqual([
      'Multilingual',
      'Assurance',
    ]);
  });

  /* 8 dos 520 têm traço, e todos são `persona-*` do Battlecry!. */
  it('o traço raro é lido, mesmo sendo de 8 em 520', () => {
    expect(base('Wandering Libertine').traits).toEqual(['persona-flirt']);
    expect(base('Acrobat').traits).toEqual([]);
  });
});

/*
 * A ponte para Talentos: o antecedente guarda o PONTEIRO, e o conteúdo continua morando no
 * talento. Mesma decisão de perícia → ação, na Etapa 13.
 */
describe('o talento concedido é referência, e não cópia', () => {
  it('guarda o UUID do pack de talentos', () => {
    const feat = base('Acrobat').feats[0];
    expect(feat?.uuid.startsWith('Compendium.pf2e.feats-srd.')).toBe(true);
    // Nada além do par: `level` vale 1 em todos e `img` é ícone que o zip não traz.
    expect(Object.keys(feat ?? {}).sort()).toEqual(['name', 'uuid']);
  });
});
