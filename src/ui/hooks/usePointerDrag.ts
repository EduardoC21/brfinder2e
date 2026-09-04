import { useRef } from 'react';

/**
 * Um gesto de arrasto, com captura de ponteiro.
 *
 * Existem três arrastos na tela e eles são o MESMO gesto com contas diferentes: mover o
 * pop-out, redimensionar o pop-out pelo canto, e puxar a borda da lateral. Escrever a
 * mecânica três vezes é como o × duplicado apareceu — três cópias, e a correção só chegou
 * a uma delas.
 *
 * Eventos de PONTEIRO e não de mouse: `pointerdown` cobre mouse, caneta e toque com um
 * código só. E `setPointerCapture` é o que faz o arrasto continuar quando o cursor sai do
 * elemento — sem ele, mover rápido "solta" o painel no meio do caminho.
 *
 * O callback recebe o DESLOCAMENTO desde o início do gesto, não a posição do cursor.
 * Assim quem usa não precisa saber onde o gesto começou: guarda o valor de partida em
 * `onStart` e soma. É o que permite o mesmo hook servir posição (x, y) e tamanho.
 *
 * `onEnd` existe para separar o valor EM CURSO do valor ASSENTADO. Quem grava preferência
 * não quer gravar cada pixel: além do disco, uma escrita por quadro atualiza o contexto e
 * redesenha todo consumidor dele — inclusive a lista de 766 linhas. Durante o gesto o
 * valor fica local; no fim, ele assenta.
 */
export interface PointerDragHandlers {
  readonly onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  readonly onPointerMove: (event: React.PointerEvent<HTMLElement>) => void;
  readonly onPointerUp: (event: React.PointerEvent<HTMLElement>) => void;
  readonly onPointerCancel: (event: React.PointerEvent<HTMLElement>) => void;
}

export function usePointerDrag<T>(
  /** Chamado ao começar; o valor devolvido volta em cada movimento. */
  onStart: () => T,
  onMove: (start: T, dx: number, dy: number) => void,
  /** Chamado ao soltar, e só se houve movimento. */
  onEnd?: () => void,
): PointerDragHandlers {
  const gesto = useRef<{ x: number; y: number; start: T; mexeu: boolean } | null>(null);

  return {
    onPointerDown: (event) => {
      // Só o botão principal, e nunca quando o alvo é um botão de verdade.
      if (event.button !== 0 || event.target instanceof HTMLButtonElement) return;
      event.preventDefault();
      gesto.current = { x: event.clientX, y: event.clientY, start: onStart(), mexeu: false };
      event.currentTarget.setPointerCapture(event.pointerId);
    },

    onPointerMove: (event) => {
      const atual = gesto.current;
      if (atual === null) return;
      atual.mexeu = true;
      onMove(atual.start, event.clientX - atual.x, event.clientY - atual.y);
    },

    onPointerUp: (event) => {
      encerrar(event);
    },

    onPointerCancel: (event) => {
      encerrar(event);
    },
  };

  /**
   * ⚠️ `onEnd` ANTES de soltar a captura, e a soltura protegida.
   *
   * `releasePointerCapture` LANÇA quando o elemento não tem a captura — e ele pode não
   * ter: o sistema cancela o ponteiro, o elemento sai da árvore, um gesto de toque é
   * interrompido. Com a ordem invertida, essa exceção pulava o `onEnd` e o arrasto inteiro
   * era descartado em silêncio: a largura escolhida não chegava a virar preferência.
   *
   * Foi assim que descobri: arrastei a lateral para 540, recarreguei, e ela voltou em 720.
   */
  function encerrar(event: React.PointerEvent<HTMLElement>): void {
    const mexeu = gesto.current?.mexeu ?? false;
    gesto.current = null;
    if (mexeu) onEnd?.();
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Já não havia captura. O gesto terminou de qualquer forma.
    }
  }
}
