import { describe, expect, it } from 'vitest';

import { isClean } from '../report';
import { run } from '../run';
import { ruleRecipe } from './rule';

/** Dois jornais com a FORMA real, e um terceiro que a receita tem de ignorar inteiro. */
const pagina = (id: string, name: string, level: number, sort: number, content: string) => ({
  _id: id,
  name,
  sort,
  title: { level, show: true },
  text: { content, format: 1 },
  type: 'text',
});

const gmScreen = {
  _id: 'S55aqwWIzpQRFhcq',
  name: 'GM Screen',
  pages: [
    pagina('pg', 'Playing the Game', 1, -850_000, '<p>Sources: Player Core</p>'),
    pagina('bas', 'Basic Actions', 2, -800_000, '<p>Stride…</p>'),
    pagina('rg', 'Running the Game', 1, 2_050_000, '<p>Sources: GM Core</p>'),
    pagina('dcs', 'Simple DCs', 2, 2_100_000, '<table><tr><td>10</td></tr></table>'),
  ],
};

const remaster = {
  _id: '6L2eweJuM8W7OCf2',
  name: 'Remaster Changes',
  pages: [
    pagina(
      'rc',
      'Remaster Changes',
      1,
      100_000,
      '<p>' + 'The Remaster renamed… '.repeat(10) + '</p>',
    ),
    pagina('fe', 'Feats', 2, 200_000, '<p>Renamed feats…</p>'),
  ],
};

const heroPoints = {
  _id: 'hpd',
  name: 'Hero Point Deck',
  pages: [pagina('c1', 'Ancestral Might', 2, 1, '<p>A card.</p>')],
};

const result = run(ruleRecipe, [{ pack: 'journals', documents: [gmScreen, remaster, heroPoints] }]);
const nomes = result.entities.map((e) => e.base.name);

describe('receita de rule', () => {
  it('lê os dois jornais, ignora o baralho, e o relatório fica limpo', () => {
    expect(result.failures).toEqual([]);
    expect(nomes.sort()).toEqual(['Basic Actions', 'Feats', 'Remaster Changes', 'Simple DCs']);
    expect(isClean(result.report)).toBe(true);
  });

  it('a seção é o Tipo, e vem da estrutura do jornal', () => {
    const secao = (n: string) => result.entities.find((e) => e.base.name === n)?.base.section;
    expect(secao('Basic Actions')).toBe('Playing the Game');
    expect(secao('Simple DCs')).toBe('Running the Game');
    expect(secao('Feats')).toBe('Remaster Changes');
    /* A página de abertura do Remaster Changes tem texto de verdade: entra, na própria seção. */
    expect(secao('Remaster Changes')).toBe('Remaster Changes');
  });

  it('o UUID é o canônico da página, e a descrição é a página', () => {
    const dcs = result.entities.find((e) => e.base.name === 'Simple DCs');
    expect(dcs?.identity.uuid).toBe(
      'Compendium.pf2e.journals.JournalEntry.S55aqwWIzpQRFhcq.JournalEntryPage.dcs',
    );
    expect(dcs?.desc.main).toBe('<table><tr><td>10</td></tr></table>');
  });
});
