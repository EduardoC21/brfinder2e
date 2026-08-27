import { useEffect, type RefObject } from 'react';

/**
 * Fecha um painel com Escape ou com clique fora, e devolve o foco a quem o abriu.
 *
 * Por que não a API `popover` do HTML, que daria isto de graça: ela joga o elemento na
 * camada de topo, e posicioná-lo colado a um botão exige CSS Anchor Positioning, que só
 * o Chromium tem. Como o app roda em WebView2 (Chromium) mas o dev acontece em qualquer
 * navegador, prefiro trinta linhas previsíveis a um recurso que só funciona metade das
 * vezes.
 */
export function useDismissable(
  open: boolean,
  panel: RefObject<HTMLElement | null>,
  anchor: RefObject<HTMLElement | null>,
  onClose: () => void,
): void {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        anchor.current?.focus();
      }
    };

    const onPointerDown = (event: PointerEvent): void => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (panel.current?.contains(target) === true) return;
      if (anchor.current?.contains(target) === true) return; // o botão alterna sozinho
      onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open, panel, anchor, onClose]);
}
