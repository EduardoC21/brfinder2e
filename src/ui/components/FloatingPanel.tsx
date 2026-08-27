import { useCallback, useEffect, useRef, useState } from 'react';

import { strings } from '@i18n/index';
import { cx } from '@ui/cx';

import styles from './FloatingPanel.module.css';

interface FloatingPanelProps {
  readonly title: string;
  readonly onClose: () => void;
  readonly children: React.ReactNode;
  /** Posição inicial, em pixels a partir do canto superior esquerdo da janela. */
  readonly initial?: { readonly x: number; readonly y: number };
}

const t = strings.browse.detail;

/**
 * Painel flutuante: arrastável pela barra de título, minimizável para só o título.
 *
 * Arrastar é feito com eventos de PONTEIRO, não de mouse: `pointerdown` cobre mouse,
 * caneta e toque com um código só, e `setPointerCapture` garante que o arrasto continue
 * mesmo quando o cursor sai do elemento — sem isso, mover rápido "solta" o painel.
 *
 * A posição vive num `useState` e é aplicada por `transform`, não por `left`/`top`:
 * `transform` não força recálculo de layout a cada quadro, e o arrasto de um painel com
 * texto longo dentro fica visivelmente mais leve.
 */
export function FloatingPanel({ title, onClose, children, initial }: FloatingPanelProps) {
  const [pos, setPos] = useState(initial ?? { x: 120, y: 90 });
  const [minimized, setMinimized] = useState(false);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    // Só o botão principal, e não quando o alvo é um dos botões da barra.
    if (event.button !== 0 || event.target instanceof HTMLButtonElement) return;
    drag.current = { dx: event.clientX - pos.x, dy: event.clientY - pos.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    const held = drag.current;
    if (!held) return;

    /*
     * Prende dentro da janela, deixando sempre uma faixa visível. Sem isso dá para
     * arrastar o painel para fora e nunca mais alcançá-lo — e como a posição é do
     * componente, nem recarregar traria de volta.
     */
    const largura = panel.current?.offsetWidth ?? 320;
    const x = Math.min(Math.max(event.clientX - held.dx, 8 - largura + 80), window.innerWidth - 80);
    const y = Math.min(Math.max(event.clientY - held.dy, 0), window.innerHeight - 32);
    setPos({ x, y });
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>): void => {
    drag.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const close = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [close]);

  return (
    <div
      ref={panel}
      className={cx(styles['panel'], 'chamfer-lg', minimized && styles['minimized'])}
      style={{ transform: `translate(${String(pos.x)}px, ${String(pos.y)}px)` }}
      role="dialog"
      aria-label={title}
    >
      <div
        className={styles['bar']}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={() => {
          setMinimized((value) => !value);
        }}
      >
        <span className={styles['title']}>{title}</span>

        <button
          type="button"
          className={styles['action']}
          aria-label={minimized ? t.restore : t.minimize}
          title={minimized ? t.restore : t.minimize}
          onClick={() => {
            setMinimized((value) => !value);
          }}
        >
          {minimized ? '▢' : '—'}
        </button>

        <button
          type="button"
          className={styles['action']}
          aria-label={t.close}
          title={t.close}
          onClick={close}
        >
          ×
        </button>
      </div>

      {!minimized && <div className={styles['body']}>{children}</div>}
    </div>
  );
}
