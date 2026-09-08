import { describe, expect, it } from 'vitest';

import { parseSkillTable, skillSlug } from './skills';

/** Duas linhas com a ESTRUTURA real da página `Skill Actions` do `pf2e-8.5.0`. */
const TABELA = `<table><tbody>
<tr><th>Skill</th><th>Key Attribute</th><th>Untrained Actions</th><th>Trained Actions</th></tr>
<tr><td>Acrobatics</td><td>Dexterity</td><td><p>@UUID[Compendium.pf2e.actionspf2e.Item.M76ycLAqHoAgbcej]{Balance} <span class="action-glyph">A</span></p><p>@UUID[Compendium.pf2e.actionspf2e.Item.21WIfSu7Xd7uKqV8]{Tumble Through} <span class="action-glyph">A</span></p></td><td><p>@UUID[Compendium.pf2e.actionspf2e.Item.kMcV8e5EZUxa6evt]{Squeeze} <sup>E</sup></p></td></tr>
<tr><td>Diplomacy</td><td>Charisma</td><td><p>@UUID[Compendium.pf2e.actionspf2e.Item.uMFA8kVgv5FMSFmU]{Gather Information} <sup>E</sup></p></td><td></td></tr>
</tbody></table>`;

describe('parseSkillTable', () => {
  it('lê uma linha por perícia, com atributo e as duas listas', () => {
    const linhas = parseSkillTable(TABELA);
    expect(linhas).toHaveLength(2);
    expect(linhas[0]).toEqual({
      name: 'Acrobatics',
      attribute: 'Dexterity',
      untrained: [
        { uuid: 'Compendium.pf2e.actionspf2e.Item.M76ycLAqHoAgbcej', name: 'Balance' },
        { uuid: 'Compendium.pf2e.actionspf2e.Item.21WIfSu7Xd7uKqV8', name: 'Tumble Through' },
      ],
      trained: [{ uuid: 'Compendium.pf2e.actionspf2e.Item.kMcV8e5EZUxa6evt', name: 'Squeeze' }],
    });
  });

  /*
   * O cabeçalho é descartado pela FORMA (não tem quatro `<td>`), e não pelo índice: o
   * Foundry trocar `<th>` por `<td>` entre versões é o tipo de coisa que acontece sem aviso.
   */
  it('descarta o cabeçalho sem contar linhas', () => {
    expect(parseSkillTable(TABELA).map((linha) => linha.name)).toEqual(['Acrobatics', 'Diplomacy']);
  });

  it('coluna vazia vira lista vazia, e não some', () => {
    expect(parseSkillTable(TABELA)[1]?.trained).toEqual([]);
  });

  /*
   * As letras ao lado da ação (`A`, `E`, `D`, `G`) são a abreviação impressa do custo e
   * dos traços. São ignoradas: temos as duas coisas em forma estruturada na própria ação,
   * e ler a abreviação seria preferir o resumo à fonte.
   */
  it('ignora o glifo e a letra de proficiência', () => {
    const nomes = parseSkillTable(TABELA)[0]?.untrained.map((acao) => acao.name);
    expect(nomes).toEqual(['Balance', 'Tumble Through']);
  });

  it('tabela sem linha nenhuma devolve vazio, e não quebra', () => {
    expect(parseSkillTable('<p>nada aqui</p>')).toEqual([]);
  });
});

describe('skillSlug', () => {
  it('vira a identidade da perícia, que não tem `_id` de Foundry', () => {
    expect(skillSlug('Acrobatics')).toBe('acrobatics');
    expect(skillSlug('Lore')).toBe('lore');
  });
});
