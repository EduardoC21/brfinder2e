import { useCallback, useEffect, useRef, useState } from 'react';

import { withLayout } from '@core/prefs/index';
import { strings } from '@i18n/index';
import { cx } from '@ui/cx';
import { usePointerDrag } from '@ui/hooks/usePointerDrag';
import { usePreferences } from '@ui/prefs/usePreferences';

import styles from './FloatingPanel.module.css';

interface FloatingPanelProps {
  readonly title: string;
  readonly onClose: () => void;
  /** Traz este painel para a frente. Chamado a cada toque nele. */
  readonly onFocus: () => void;
  readonly z: number;
  readonly children: React.ReactNode;
  /** Posição inicial, em pixels a partir do canto superior esquerdo da janela. */
  readonly initial: { readonly x: number; readonly y: number };
}

const t = strings.browse.detail;

/** Abaixo disto o painel deixa de caber um nome e dois botões. */
const MIN_LARGURA = 260;
const MIN_ALTURA = 140;
const LARGURA_PADRAO = 460;
const ALTURA_PADRAO = 520;

/**
 * Painel flutuante: arrastável, redimensionável e minimizável.
 *
 * A posição e o tamanho vivem em `useState` e são aplicados por `transform` e por
 * `width`/`height`. `transform` para mover, porque não força recálculo de layout a cada
 * quadro do arrasto — `left`/`top` forçam, e o painel tem texto longo dentro.
 *
 * `top: 0; left: 0` fixos com todo o deslocamento no `transform` mantêm UMA origem. Somar
 * as duas coisas faz a conta do arrasto virar dois sistemas de coordenadas, e o painel
 * "pula" no primeiro movimento depois de um redimensionamento.
 */
export function FloatingPanel({
  title,
  onClose,
  onFocus,
  z,
  children,
  initial,
}: FloatingPanelProps) {
  const [pos, setPos] = useState(initial);

  /*
   * O TAMANHO é preferência; a POSIÇÃO não.
   *
   * Tamanho é uma escolha sobre o painel — quem alargou quer que o próximo já abra
   * assim. Posição é onde este painel está agora: guardá-la faria dois pop-outs abertos
   * juntos disputarem a mesma coordenada e nascerem um em cima do outro, desfazendo a
   * cascata.
   */
  const { prefs, update } = usePreferences();
  const salvo = {
    w: prefs.layout.popoutWidth ?? LARGURA_PADRAO,
    h: prefs.layout.popoutHeight ?? ALTURA_PADRAO,
  };

  /* Mesma separação da lateral: em curso é local, assentado é preferência. */
  const [rascunho, setRascunho] = useState<{ w: number; h: number } | null>(null);
  const tamanho = rascunho ?? salvo;
  const [minimized, setMinimized] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  const arrasto = usePointerDrag(
    () => pos,
    (inicio, dx, dy) => {
      /*
       * Prende dentro da janela, deixando sempre uma faixa visível. Sem isso dá para
       * arrastar o painel para fora e nunca mais alcançá-lo — e como a posição é do
       * componente, nem recarregar traria de volta.
       */
      const largura = panel.current?.offsetWidth ?? tamanho.w;
      const x = Math.min(Math.max(inicio.x + dx, 8 - largura + 80), window.innerWidth - 80);
      const y = Math.min(Math.max(inicio.y + dy, 0), window.innerHeight - 32);
      setPos({ x, y });
    },
  );

  const redimensiona = usePointerDrag(
    () => tamanho,
    (inicio, dx, dy) => {
      setRascunho({
        w: Math.max(MIN_LARGURA, inicio.w + dx),
        h: Math.max(MIN_ALTURA, inicio.h + dy),
      });
    },
    () => {
      if (rascunho !== null) {
        update((atual) => withLayout(atual, { popoutWidth: rascunho.w, popoutHeight: rascunho.h }));
        setRascunho(null);
      }
    },
  );

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

  /*
   * Minimizado, o painel encolhe até o tamanho do nome — `width: max-content`, e não uma
   * largura calculada em JS: medir texto exigiria ler o layout depois de desenhar, o
   * navegador já sabe fazer isso, e o resultado acompanha a fonte sozinho.
   *
   * A largura escolhida no arrasto fica GUARDADA no estado e volta ao restaurar, o que
   * não aconteceria se o minimizar a sobrescrevesse.
   */
  const medidas = minimized
    ? { width: 'max-content' }
    : { width: `${String(tamanho.w)}px`, height: `${String(tamanho.h)}px` };

  return (
    <div
      ref={panel}
      className={cx(styles['panel'], 'chamfer-lg', minimized && styles['minimized'])}
      style={{
        transform: `translate(${String(pos.x)}px, ${String(pos.y)}px)`,
        zIndex: z,
        ...medidas,
      }}
      role="dialog"
      aria-label={title}
      onPointerDownCapture={onFocus}
    >
      <div
        className={styles['bar']}
        {...arrasto}
        onDoubleClick={() => {
          setMinimized((valor) => !valor);
        }}
      >
        <span className={styles['title']}>{title}</span>

        <button
          type="button"
          className={styles['action']}
          aria-label={minimized ? t.restore : t.minimize}
          title={minimized ? t.restore : t.minimize}
          onClick={() => {
            setMinimized((valor) => !valor);
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

      {!minimized && (
        <>
          <div className={styles['body']}>{children}</div>
          {/*
            O canto de redimensionar. `role="separator"` e não um botão: ele não executa
            ação, ajusta uma medida — é a mesma semântica do divisor da lateral.
          */}
          <div
            className={styles['grip']}
            role="separator"
            aria-label={t.resize}
            title={t.resize}
            {...redimensiona}
          />
        </>
      )}
    </div>
  );
}
