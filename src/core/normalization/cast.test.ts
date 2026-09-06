import { describe, expect, it } from 'vitest';

import { parseCastTime } from './cast';

/*
 * Os casos vêm dos 27 formatos medidos nas 1.994 magias do `pf2e-8.5.0`. O teste de
 * contrato confere que TODOS os 1.994 são reconhecidos; aqui ficam os representantes de
 * cada família e as duas armadilhas do dado.
 */

const acao = (count: number) => ({ kind: 'action', count, time: null });
const tempo = (count: number, unit: string) => ({
  kind: 'time',
  count: null,
  time: { count, unit },
});

describe('parseCastTime — contagem de ações', () => {
  it('lê 1, 2 e 3 como ações', () => {
    expect(parseCastTime('2').from).toEqual(acao(2));
    expect(parseCastTime('1').from).toEqual(acao(1));
    expect(parseCastTime('3').from).toEqual(acao(3));
  });

  it('reação e ação livre não têm contagem', () => {
    expect(parseCastTime('reaction').from).toEqual({ kind: 'reaction', count: null, time: null });
    expect(parseCastTime('free').from).toEqual({ kind: 'free', count: null, time: null });
  });

  /*
   * ⚠️ `Reaction` com R maiúsculo existe em UMA magia, contra 95 em minúscula. É defeito
   * da fonte, e sem a leitura insensível à caixa ela cairia em "desconhecido".
   */
  it('a reação com maiúscula do dado real é a mesma coisa', () => {
    expect(parseCastTime('Reaction').from.kind).toBe('reaction');
  });

  it('valor único não tem o outro extremo', () => {
    expect(parseCastTime('2').to).toBeNull();
  });
});

describe('parseCastTime — duração', () => {
  it('lê a unidade no singular e no plural', () => {
    expect(parseCastTime('1 minute').from).toEqual(tempo(1, 'minute'));
    expect(parseCastTime('10 minutes').from).toEqual(tempo(10, 'minute'));
    expect(parseCastTime('1 day').from).toEqual(tempo(1, 'day'));
    expect(parseCastTime('7 days').from).toEqual(tempo(7, 'day'));
    expect(parseCastTime('8 hours').from).toEqual(tempo(8, 'hour'));
    expect(parseCastTime('1 week').from).toEqual(tempo(1, 'week'));
  });
});

describe('parseCastTime — faixa', () => {
  it('`to` e `or` são o mesmo separador', () => {
    expect(parseCastTime('1 to 3')).toMatchObject({ from: acao(1), to: acao(3) });
    expect(parseCastTime('1 or 2')).toMatchObject({ from: acao(1), to: acao(2) });
    expect(parseCastTime('2 or 3')).toMatchObject({ from: acao(2), to: acao(3) });
  });

  /*
   * A faixa MISTA: "de 2 ações a 2 rodadas". É o motivo de os dois extremos serem do mesmo
   * tipo, em vez de a faixa ser um par de números.
   */
  it('a faixa pode ir de ações a duração', () => {
    expect(parseCastTime('2 to 2 rounds')).toMatchObject({
      from: acao(2),
      to: tempo(2, 'round'),
    });
  });
});

describe('parseCastTime — o que não se reconhece', () => {
  it('devolve desconhecido, com o texto intacto', () => {
    const lido = parseCastTime('meia lua crescente');
    expect(lido.from.kind).toBe('unknown');
    expect(lido.raw).toBe('meia lua crescente');
  });

  /*
   * Metade entendida seria pior que nada: desenharia "◆ a ???" onde o texto cru ao menos
   * se lê inteiro.
   */
  it('faixa com um extremo estranho não vira meia faixa', () => {
    const lido = parseCastTime('1 to whenever');
    expect(lido.to).toBeNull();
    expect(lido.from.kind).toBe('unknown');
  });

  it('o texto original fica guardado mesmo quando a leitura dá certo', () => {
    expect(parseCastTime('10 minutes').raw).toBe('10 minutes');
  });
});
