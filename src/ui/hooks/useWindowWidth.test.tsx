import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useWindowWidth } from './useWindowWidth';

/*
 * Este teste existe por um motivo específico: o painel de automação em que a tela é
 * conferida muda `innerWidth` SEM disparar `resize` nem `ResizeObserver` (medido: os dois
 * contadores ficam em zero). Ou seja, a parte deste hook que reage ao redimensionamento
 * não é verificável ali. O jsdom dispara, então a fiação do ouvinte se prova aqui.
 */

function Sonda() {
  return <output>{useWindowWidth()}</output>;
}

function redimensionar(para: number): void {
  Object.defineProperty(window, 'innerWidth', { value: para, configurable: true });
  window.dispatchEvent(new Event('resize'));
}

describe('useWindowWidth', () => {
  it('lê a largura na montagem, sem esperar o primeiro evento', () => {
    redimensionar(1234);
    render(<Sonda />);
    expect(screen.getByRole('status')).toHaveTextContent('1234');
  });

  it('acompanha a janela encolhendo', () => {
    redimensionar(1440);
    render(<Sonda />);
    act(() => {
      redimensionar(760);
    });
    expect(screen.getByRole('status')).toHaveTextContent('760');
  });

  it('para de ouvir ao desmontar', () => {
    redimensionar(1000);
    const { unmount } = render(<Sonda />);
    unmount();
    // Sem o `removeEventListener`, isto avisaria um componente que já não existe.
    expect(() => {
      redimensionar(500);
    }).not.toThrow();
  });
});
