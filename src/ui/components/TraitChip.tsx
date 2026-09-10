import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import type { TraitEntry } from '@core/glossary/index';
import { parseDescription } from '@core/markup/index';
import { useTrait } from '@ui/glossary/useTrait';

import { RichText } from './RichText';
import styles from './TraitChip.module.css';

/**
 * Um chip de traço que EXPLICA o que é ao passar o mouse.
 *
 * O chip em si é do chamador — a lista e o detalhe têm chips com CSS diferente, e este
 * componente não impõe um terceiro. Ele recebe a classe, desenha o `<span>` e acrescenta
 * a caixinha. Sem descrição no glossário, é um `<span>` comum: nada muda para os 1,1% de
 * traços que a tabela do Foundry não explica.
 *
 * ⚠️ O ATRASO de 350 ms é a decisão que importa. Sem ele, varrer a lista com o mouse faz
 * uma caixinha piscar a cada linha — 6.284 talentos com três traços cada são 18 mil
 * gatilhos numa rolada. Com ele, a caixinha só aparece para quem PAROU em cima, que é
 * quem quer ler.
 */
export function TraitChip({
  slug,
  className,
  children,
  focusable = false,
}: {
  readonly slug: string;
  readonly className: string;
  readonly children: React.ReactNode;
  /**
   * Entra na ordem do Tab, para quem não usa mouse chegar na caixinha.
   *
   * Só no DETALHE. Na lista, três paradas de foco por linha vezes sessenta linhas
   * inutilizariam o Tab — e a linha já é navegável pelo teclado, e o detalhe dela mostra
   * os mesmos traços.
   */
  readonly focusable?: boolean;
}) {
  const entry = useTrait(slug);
  const [aberta, setAberta] = useState(false);
  const ancora = useRef<HTMLSpanElement>(null);
  const timer = useRef<number | null>(null);
  const id = useId();

  const cancelar = (): void => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };
  const fechar = (): void => {
    cancelar();
    setAberta(false);
  };
  /* Foco abre NA HORA: quem chegou pelo Tab já parou ali de propósito. */
  const abrirAgora = (): void => {
    cancelar();
    setAberta(true);
  };
  const abrirDepois = (): void => {
    cancelar();
    timer.current = window.setTimeout(() => {
      timer.current = null;
      setAberta(true);
    }, ATRASO_MS);
  };

  // Desmontar com o timer armado chamaria `setState` num componente morto.
  useEffect(() => cancelar, []);

  if (entry === null) return <span className={className}>{children}</span>;

  return (
    <>
      <span
        ref={ancora}
        className={className}
        onMouseEnter={abrirDepois}
        onMouseLeave={fechar}
        onFocus={abrirAgora}
        onBlur={fechar}
        {...(focusable ? { tabIndex: 0 } : {})}
        {...(aberta ? { 'aria-describedby': id } : {})}
      >
        {children}
      </span>
      {aberta && <Caixinha id={id} anchor={ancora} entry={entry} onClose={fechar} />}
    </>
  );
}

const ATRASO_MS = 350;

/** Folga entre o chip e a caixinha, e entre a caixinha e a borda da janela. */
const FOLGA = 6;

/**
 * A caixinha, num PORTAL para o `<body>`.
 *
 * Portal e não filho do chip: o chip mora dentro de uma lista com `overflow`, de um
 * painel que rola, e — nos flutuantes — de um elemento com `transform`, que faz
 * `position: fixed` passar a ser relativo a ele. Qualquer um dos três cortaria ou
 * deslocaria a caixinha. No `<body>` ela não tem ancestral que a atrapalhe.
 *
 * Posição medida DEPOIS de desenhar (`useLayoutEffect`): a altura depende do texto, e o
 * texto vai de 30 a 1.894 caracteres. Abaixo do chip por padrão; acima quando não cabe.
 */
function Caixinha({
  id,
  anchor,
  entry,
  onClose,
}: {
  readonly id: string;
  /** A ref, e não o elemento: ler `.current` só dentro do efeito, nunca no render. */
  readonly anchor: React.RefObject<HTMLElement | null>;
  readonly entry: TraitEntry;
  readonly onClose: () => void;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const [posicao, setPosicao] = useState<{ top: number; left: number } | null>(null);
  const nodes = useMemo(() => parseDescription(entry.description), [entry.description]);

  useLayoutEffect(() => {
    const no = caixa.current;
    const alvo = anchor.current;
    if (no === null || alvo === null) return;
    const chip = alvo.getBoundingClientRect();
    const tamanho = no.getBoundingClientRect();

    const cabeEmbaixo = chip.bottom + FOLGA + tamanho.height <= window.innerHeight - FOLGA;
    const top = cabeEmbaixo ? chip.bottom + FOLGA : chip.top - FOLGA - tamanho.height;
    // Alinhada pela esquerda do chip, e empurrada de volta se estourar a janela.
    const left = Math.max(FOLGA, Math.min(chip.left, window.innerWidth - FOLGA - tamanho.width));
    setPosicao({ top: Math.max(FOLGA, top), left });
  }, [anchor]);

  /* Escape fecha, venha o foco de onde vier. */
  useEffect(() => {
    const aoTeclar = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', aoTeclar);
    return () => {
      window.removeEventListener('keydown', aoTeclar);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={caixa}
      id={id}
      role="tooltip"
      className={styles['caixa']}
      /* Invisível até ter posição: senão ela pisca no canto antes de pular para o lugar. */
      style={
        posicao === null
          ? { top: 0, left: 0, visibility: 'hidden' }
          : { top: posicao.top, left: posicao.left }
      }
    >
      <strong className={styles['titulo']}>{entry.label}</strong>
      <div className={styles['texto']}>
        <RichText nodes={nodes} />
      </div>
    </div>,
    document.body,
  );
}
