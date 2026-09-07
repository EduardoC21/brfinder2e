/**
 * A DISTÂNCIA escrita em prosa, virada número.
 *
 * O campo `range` da magia é texto livre, e é o único jeito de perguntar "quais alcançam
 * pelo menos 30 pés" — que é a pergunta que se faz de verdade. Medido nas 1.994 do
 * `pf2e-8.5.0`, são 57 formatos distintos, e a leitura cobre 1.329:
 *
 *   `30 feet` 468, `60 feet` 191, `120 feet` 185 …   número + unidade
 *   `touch` 263                                       toque, que é ZERO
 *   `30` 2, `100` 2, `120` 1, `60` 1                  número seco, em pés
 *   `1-mile-radius circle centered on you` 2          o número vem no meio da frase
 *   `emanation up to 40-feet` 1                       idem, e com hífen antes da unidade
 *
 * Os 636 sem alcance nenhum e os 29 que não trazem número (`varies`, `planetary`,
 * `see text`, `half your Speed`, …) devolvem `null`: não têm distância, e chutar uma faria
 * o filtro mentir. Quem devolve `null` fica de fora quando há um limite marcado — que é o
 * certo, porque não dá para afirmar que `planetary` passa de 30 pés.
 *
 * TUDO em PÉS, milha convertida na entrada. Uma unidade só é o que permite comparar
 * `1 mile` com `500 feet` sem a tela ter de escolher qual mostrar.
 */

/** Uma milha em pés. É a conversão do próprio jogo. */
const PES_POR_MILHA = 5280;

/**
 * O número pode vir com vírgula de milhar (`1,000 feet`) e colado por hífen na unidade
 * (`30-foot emanation`). Procurado em QUALQUER posição da frase, e não só no começo, por
 * causa de `emanation up to 40-feet`.
 */
const MEDIDA = /(\d[\d,]*)\s*-?\s*(feet|foot|ft|miles|mile)\b/i;

/** Só dígitos: `30`. A fonte omite a unidade em 6 magias, e ali a unidade é pé. */
const NUMERO_SECO = /^\d+$/;

/** A distância em PÉS, ou `null` quando o texto não traz nenhuma. */
export function distanceFeet(text: string): number | null {
  const limpo = text.trim();
  if (limpo === '') return null;

  // Toque é distância zero, e não ausência: `touch` são 263 magias, e elas participam de
  // "até 5 pés" com todo direito. Maiúscula existe em uma delas.
  if (limpo.toLowerCase() === 'touch') return 0;

  const medida = MEDIDA.exec(limpo);
  if (medida !== null) {
    const quanto = Number((medida[1] ?? '').replaceAll(',', ''));
    if (!Number.isFinite(quanto)) return null;
    const unidade = (medida[2] ?? '').toLowerCase();
    return unidade.startsWith('mile') ? quanto * PES_POR_MILHA : quanto;
  }

  if (NUMERO_SECO.test(limpo)) return Number(limpo);
  return null;
}
