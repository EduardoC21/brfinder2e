/**
 * As duas TABELAS da página de classe do jornal `Classes`, tiradas do HTML para a lateral
 * da tela completa (26d, pelo autor): a de PROGRESSÃO ("Your Level | Class Features", 20
 * níveis) e a de MAGIAS POR DIA ("Your Level | Cantrips | 1st | 2nd…").
 *
 * Medido no `pf2e-8.5.0`: as 29 páginas têm a de progressão (21 linhas: cabeçalho + 20);
 * 12 têm a de magias — as 13 com `spellcasting: 1` menos o Champion, que só tem magias
 * de foco e não tem tabela. As outras tabelas das páginas (as
 * bombas do Alchemist, a armadura do Inventor, as junções do Kineticist) ficam na prosa.
 *
 * Reconhecidas pelo CABEÇALHO, e não pela posição: a de progressão é a que começa com
 * "Your Level" e "Class Features"; a de magias, com "Your Level" e "Cantrips". O HTML da
 * tabela sai INTEIRO (com os links `@UUID` das habilidades, que a lateral deixa
 * clicáveis) e vai para `desc/`, porque é texto da Paizo.
 */

const TABELA = /<table\b[\s\S]*?<\/table>/g;
const CABECALHO = /<th\b[^>]*>([\s\S]*?)<\/th>/g;
const ETIQUETA = /<[^>]*>/g;

export interface ClassTables {
  readonly progression: string;
  readonly spellSlots: string;
}

/** Os textos dos `<th>` de uma tabela, limpos. */
function cabecalhos(tabela: string): readonly string[] {
  return [...tabela.matchAll(CABECALHO)].map((m) =>
    (m[1] ?? '').replace(ETIQUETA, '').replace(/\s+/g, ' ').trim(),
  );
}

export function classTables(pageHtml: string): ClassTables {
  let progression = '';
  let spellSlots = '';
  for (const [tabela] of pageHtml.matchAll(TABELA)) {
    const [primeiro, segundo] = cabecalhos(tabela);
    if (primeiro !== 'Your Level') continue;
    if (segundo === 'Class Features' && progression === '') progression = tabela;
    else if (segundo === 'Cantrips' && spellSlots === '') spellSlots = tabela;
  }
  return { progression, spellSlots };
}
