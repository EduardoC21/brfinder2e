import { describe, expect, it } from 'vitest';

import { parseDescription } from './document';
import { pruneForReading } from './prune';

const texto = (nodes: readonly unknown[]): string =>
  nodes
    .map((n) => {
      const node = n as { kind: string; token?: { raw: string }; children?: unknown[] };
      if (node.kind === 'token') return node.token?.raw ?? '';
      return texto(node.children ?? []);
    })
    .join('');

describe('pruneForReading', () => {
  it('tira o parágrafo que é só o link para o efeito', () => {
    const nodes = pruneForReading(
      parseDescription(
        '<p>You bless an ally.</p><p>@UUID[Compendium.pf2e.spell-effects.Item.abcdefghijklmnop]{Spell Effect: Aid}</p>',
      ),
    );
    expect(nodes).toHaveLength(1);
    expect(texto(nodes)).toBe('You bless an ally.');
  });

  it('deixa o link de efeito que está no meio da frase', () => {
    const html =
      '<p>The creature is distracted. @UUID[Compendium.pf2e.spell-effects.Item.abcdefghijklmnop]{Effect: Schadenfreude}</p>';
    expect(texto(pruneForReading(parseDescription(html)))).toContain('Effect: Schadenfreude');
  });

  it('não mexe em link que não é de efeito', () => {
    const html = '<p>@UUID[Compendium.pf2e.conditionitems.Item.abcdefghijklmnop]{Dazzled}</p>';
    expect(pruneForReading(parseDescription(html))).toHaveLength(1);
  });

  it('renomeia o cabeçalho de tabela escrito para a ficha, e só ele', () => {
    const html =
      '<table><thead><tr><th>Your Level</th><th>Class Features</th><th>Levels of Light</th></tr></thead>' +
      '<tbody><tr><td>Your Level</td><td>1</td><td>x</td></tr></tbody></table>';
    const nodes = pruneForReading(parseDescription(html));
    expect(texto(nodes)).toBe('LevelFeaturesLevels of LightYour Level1x');
  });

  it('renomeia o cabeçalho também dentro do <p> que 9 tabelas escrevem', () => {
    const html = '<table><tr><th><p>Your Level</p></th><th><p>Class Features</p></th></tr></table>';
    expect(texto(pruneForReading(parseDescription(html)))).toBe('LevelFeatures');
  });

  it('tira o rodapé que é só o link para a página do jornal, com ou sem <em>', () => {
    const link =
      '@UUID[Compendium.pf2e.journals.JournalEntry.kzxu2dI7tFxv6Ix6.JournalEntryPage.8ElntNAGahQka70r]{Druid}';
    expect(texto(pruneForReading(parseDescription(`<p>Text.</p>\n<p>${link}</p>`)))).toBe('Text.');
    expect(texto(pruneForReading(parseDescription(`<p>Text.</p><p><em>${link}</em></p>`)))).toBe(
      'Text.',
    );
  });

  it('deixa o link para o jornal que não é rodapé', () => {
    const link =
      '@UUID[Compendium.pf2e.journals.JournalEntry.kzxu2dI7tFxv6Ix6.JournalEntryPage.8ElntNAGahQka70r]{Druid}';
    // No meio do texto, e num parágrafo com mais coisa no fim: os dois ficam inteiros.
    expect(pruneForReading(parseDescription(`<p>${link}</p><p>Text.</p>`))).toHaveLength(2);
    expect(texto(pruneForReading(parseDescription(`<p>See ${link}.</p>`)))).toContain('See ');
  });

  it('poda dentro de célula e de lista também', () => {
    const html =
      '<ul><li><p>@UUID[Compendium.pf2e.feat-effects.Item.abcdefghijklmnop]{Effect: X}</p></li></ul>';
    expect(texto(pruneForReading(parseDescription(html)))).toBe('');
  });
});
