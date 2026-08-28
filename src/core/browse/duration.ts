/**
 * O `per` da frequência.
 *
 * O campo mistura duas notações, e a segunda é a que aparecia crua na tela — True
 * Shapeshift mostrava `1 × PT1H`. Medido nas 766 ações (177 têm frequência):
 *
 *   day    95      round  17
 *   PT1H   32      PT1M    8
 *   PT10M  22      turn    2
 *
 * `PT1H` é ISO-8601 de duração: `P` de período, `T` separa a parte de tempo, e cada
 * número vem colado na letra da unidade. O Foundry grava assim porque é o formato que o
 * schema dele usa para duração; as palavras soltas (`day`, `round`, `turn`) são conceitos
 * de jogo, que ISO nenhum representa.
 *
 * Aqui o código vira estrutura. A PALAVRA em português é da camada `i18n/` — `core/` não
 * escreve texto de tela (ver a FRONTEIRA em eslint.config.js).
 */

export type DurationUnit =
  'round' | 'turn' | 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';

export interface Duration {
  readonly count: number;
  readonly unit: DurationUnit;
}

const PALAVRAS: Readonly<Record<string, DurationUnit>> = {
  round: 'round',
  turn: 'turn',
  second: 'second',
  minute: 'minute',
  hour: 'hour',
  day: 'day',
  week: 'week',
  month: 'month',
  year: 'year',
};

/** `P1Y2M3W4DT5H6M7S` — cada grupo é opcional, e no dado real só vem um deles. */
const ISO =
  /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/;

/** Uma unidade por grupo do ISO, na ordem em que a expressão os captura. */
const NA_ORDEM: readonly DurationUnit[] = [
  'year',
  'month',
  'week',
  'day',
  'hour',
  'minute',
  'second',
];

/**
 * `PT1H` → `{ count: 1, unit: 'hour' }`; `day` → `{ count: 1, unit: 'day' }`.
 *
 * Devolve `null` para o que não reconhecer, e a tela mostra o código cru. É de propósito:
 * uma notação nova numa versão futura do sistema aparece feia na tela, onde se vê, em vez
 * de virar texto plausível e errado.
 */
export function parseDurationCode(code: string): Duration | null {
  const limpo = code.trim();

  const palavra = PALAVRAS[limpo.toLowerCase()];
  if (palavra !== undefined) return { count: 1, unit: palavra };

  const iso = ISO.exec(limpo.toUpperCase());
  if (iso === null) return null;

  // Um grupo só é preenchido no dado real. Se vier mais de um, o maior manda — não há
  // como dizer "a cada 1 hora e 30 minutos" numa linha de tabela sem inventar formato.
  for (let posicao = 1; posicao < iso.length; posicao++) {
    const bruto = iso[posicao];
    if (bruto === undefined) continue;
    const count = Number(bruto);
    const unit = NA_ORDEM[posicao - 1];
    if (unit !== undefined && Number.isFinite(count) && count > 0) return { count, unit };
  }

  // `PT0S` e afins: sintaxe válida, duração nenhuma.
  return null;
}
