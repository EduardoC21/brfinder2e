import { describe, expect, it } from 'vitest';

import { pageUuid, sectionPages } from './rules';

/*
 * A tela do mestre em miniatura, com a FORMA real: seções de nível 1 em ordem de `sort`,
 * páginas de nível 2 debaixo delas, um índice com referências relativas.
 */
const JORNAL = 'S55aqwWIzpQRFhcq';

const paginas = [
  {
    id: 'idx',
    name: 'GM Screen',
    level: 1,
    sort: -1_100_000,
    /* O índice real tem 2.471 caracteres de links; aqui, o bastante para passar do limiar. */
    content:
      '<table><tr><td>@UUID[.bas]{Basic Actions}</td><td>@UUID[.dcs]{Simple DCs}</td></tr>' +
      '<tr><td>@UUID[.fall]{Falling}</td><td>@UUID[.bas]{Basic Actions, again}</td></tr>' +
      '<tr><td>@UUID[.dcs]{Simple DCs, again}</td><td>@UUID[.fall]{Falling, again}</td></tr></table>',
  },
  { id: 'pg', name: 'Playing the Game', level: 1, sort: -850_000, content: '<p>Sources:</p>' },
  { id: 'bas', name: 'Basic Actions', level: 2, sort: -800_000, content: '<p>Stride, Strike…</p>' },
  { id: 'fall', name: 'Falling', level: 2, sort: -700_000, content: '<p>You take damage…</p>' },
  {
    id: 'rg',
    name: 'Running the Game',
    level: 1,
    sort: 2_050_000,
    content: '<p>Sources: GM Core</p>',
  },
  {
    id: 'dcs',
    name: 'Simple DCs',
    level: 2,
    sort: 2_100_000,
    content: '<table><tr><td>Untrained</td><td>10</td></tr></table>',
  },
];

const regras = sectionPages(JORNAL, paginas);
const por = (nome: string) => regras.find((r) => r.name === nome);

describe('sectionPages', () => {
  it('cada página pertence à seção de nível 1 que vem antes dela', () => {
    expect(por('Basic Actions')?.section).toBe('Playing the Game');
    expect(por('Falling')?.section).toBe('Playing the Game');
    expect(por('Simple DCs')?.section).toBe('Running the Game');
  });

  /* A divisória ("Sources: …", 30 a 54 caracteres) marca a seção e some. */
  it('a divisória não vira entrada', () => {
    expect(por('Playing the Game')).toBeUndefined();
    expect(por('Running the Game')).toBeUndefined();
  });

  /*
   * O índice só aponta para o que a seção já organiza, e a lista da tela já é esse
   * sumário. O que o define é a referência RELATIVA, não o nome.
   */
  it('o índice não vira entrada', () => {
    expect(por('GM Screen')).toBeUndefined();
  });

  /* Abertura de nível 1 com prosa e sem referência relativa É entrada, da própria seção. */
  it('a abertura com prosa vira entrada da própria seção', () => {
    const comAbertura = [
      ...paginas,
      {
        id: 'rc',
        name: 'Remaster Changes',
        level: 1,
        sort: 9_000_000,
        content:
          '<p>' + 'With the 5.9.0 release we moved to the remaster rules. '.repeat(3) + '</p>',
      },
    ];
    const abertura = sectionPages(JORNAL, comAbertura).find((r) => r.name === 'Remaster Changes');
    expect(abertura?.section).toBe('Remaster Changes');
  });

  it('a ordem é a de sort, não a do array', () => {
    const embaralhadas = [...paginas].reverse();
    expect(sectionPages(JORNAL, embaralhadas).map((r) => r.name)).toEqual(
      regras.map((r) => r.name),
    );
  });

  /*
   * ⚠️ A referência RELATIVA — `@UUID[.bas]` — vira a forma canônica em qualquer página
   * que a use. Hoje só os índices a têm, e eles ficam de fora; a regra fica para o dia em
   * que uma página de conteúdo apontar para outra assim.
   */
  it('reescreve as referências relativas para a forma canônica', () => {
    const comLink = [
      ...paginas,
      {
        id: 'x',
        name: 'Cover',
        level: 2,
        sort: -600_000,
        content: '<p>See @UUID[.fall]{Falling}.</p>',
      },
    ];
    const cover = sectionPages(JORNAL, comLink).find((r) => r.name === 'Cover')?.content ?? '';
    expect(cover).not.toContain('@UUID[.');
    expect(cover).toContain(`@UUID[${pageUuid(JORNAL, 'fall')}]`);
  });

  it('o UUID é o canônico da página', () => {
    expect(por('Falling')?.uuid).toBe(
      'Compendium.pf2e.journals.JournalEntry.S55aqwWIzpQRFhcq.JournalEntryPage.fall',
    );
    expect(por('Falling')?.slug).toBe('falling');
  });
});
