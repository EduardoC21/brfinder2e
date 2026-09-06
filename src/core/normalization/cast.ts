/**
 * O CUSTO DE CONJURAR uma magia, decodificado de `system.time.value`.
 *
 * Existe porque magia não usa o par `actionType`/`actions` das ações e dos talentos: ela
 * traz UMA STRING LIVRE, e essa string mistura três coisas diferentes. Medido nas 1.994 do
 * `pf2e-8.5.0`, são 27 formatos distintos:
 *
 *   contagem de ações   `1` 248, `2` 1095, `3` 213, `reaction` 95, `free` 10      1.662
 *   FAIXA de ações      `1 to 3` 30, `1 or 2` 6, `2 or 3` 6                          42
 *   DURAÇÃO             `1 minute` 64, `10 minutes` 47, `1 hour` 37, `1 day` 87,
 *                       `8 hours` 12, `4 hours` 11, `1 week` 5, `7 days` 5, …       283
 *   faixa MISTA         `2 to 2 rounds` 7                                            7
 *
 * Duas armadilhas do dado, e as duas estão cobertas por teste:
 *
 * - `Reaction` com R MAIÚSCULO existe em uma magia, contra 95 em minúscula. É defeito da
 *   fonte, e por isso a leitura é insensível à caixa.
 * - `2 to 2 rounds` é uma faixa que começa em AÇÕES e termina em DURAÇÃO — "de 2 ações a
 *   2 rodadas". É o motivo de os dois extremos serem do mesmo tipo `CastPoint` em vez de
 *   a faixa ser só um par de números.
 *
 * O que não for reconhecido volta como `kind: 'unknown'` com o texto original intacto, e a
 * tela mostra o cru. É a mesma escolha de `parseDurationCode`: um formato novo numa versão
 * futura aparece feio onde se vê, em vez de virar um valor plausível e errado.
 */

import type { DurationUnit } from '../browse/duration';

/** Um extremo do custo: ou uma contagem de ações, ou uma duração. */
export interface CastPoint {
  /** `action`, `reaction`, `free`, `time` ou `unknown`. */
  readonly kind: string;
  /** Quantas ações. 1, 2 ou 3 — nulo em tudo que não for `action`. */
  readonly count: number | null;
  /** A duração, quando `kind` é `time`. Nulo no resto. */
  readonly time: { readonly count: number; readonly unit: DurationUnit } | null;
}

export interface SpellCast {
  readonly from: CastPoint;
  /** O outro extremo, quando o custo é uma FAIXA. Nulo quando é um valor só. */
  readonly to: CastPoint | null;
  /** O texto como veio. Guardado sempre, e é o que a tela mostra quando não reconhecemos. */
  readonly raw: string;
}

const PONTO_DESCONHECIDO: CastPoint = { kind: 'unknown', count: null, time: null };

/** As unidades por extenso que a fonte usa, no singular e no plural. */
const UNIDADES: Readonly<Record<string, DurationUnit>> = {
  round: 'round',
  rounds: 'round',
  turn: 'turn',
  turns: 'turn',
  minute: 'minute',
  minutes: 'minute',
  hour: 'hour',
  hours: 'hour',
  day: 'day',
  days: 'day',
  week: 'week',
  weeks: 'week',
  month: 'month',
  months: 'month',
  year: 'year',
  years: 'year',
};

/** `2` → duas ações; `reaction`, `free`; `10 minutes` → duração. */
function ponto(texto: string): CastPoint {
  const limpo = texto.trim().toLowerCase();

  if (limpo === 'reaction') return { kind: 'reaction', count: null, time: null };
  if (limpo === 'free') return { kind: 'free', count: null, time: null };

  if (/^[1-3]$/.test(limpo)) {
    return { kind: 'action', count: Number(limpo), time: null };
  }

  const duracao = /^(\d+)\s+([a-z]+)$/.exec(limpo);
  if (duracao !== null) {
    const quantas = Number(duracao[1]);
    const unidade = UNIDADES[duracao[2] ?? ''];
    if (unidade !== undefined && Number.isFinite(quantas) && quantas > 0) {
      return { kind: 'time', count: null, time: { count: quantas, unit: unidade } };
    }
  }

  return PONTO_DESCONHECIDO;
}

/**
 * `1 to 3` e `1 or 2` são faixas; `2 to 2 rounds` também, e mista.
 *
 * `to` e `or` são o MESMO separador para efeito de leitura — a fonte usa os dois para dizer
 * "de tanto a tanto", e distingui-los daria dois desenhos para uma ideia só.
 */
const FAIXA = /^(.+?)\s+(?:to|or)\s+(.+)$/i;

export function parseCastTime(raw: string): SpellCast {
  const texto = raw.trim();

  const faixa = FAIXA.exec(texto);
  if (faixa !== null) {
    const inicio = ponto(faixa[1] ?? '');
    const fim = ponto(faixa[2] ?? '');
    /*
     * Só vale como faixa se OS DOIS extremos forem entendidos. Metade entendida seria pior
     * que nada: desenharia "◆ a ???" onde o texto cru ao menos se lê.
     */
    if (inicio.kind !== 'unknown' && fim.kind !== 'unknown') {
      return { from: inicio, to: fim, raw: texto };
    }
  }

  return { from: ponto(texto), to: null, raw: texto };
}
