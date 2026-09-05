import { cx } from '@ui/cx';

import styles from './RarityMark.module.css';

interface RarityMarkProps {
  /** `I`, `R` ou `U`. */
  readonly letter: string;
  /** O nome por extenso, para quem passa o mouse. */
  readonly label: string;
}

/**
 * A etiqueta de raridade: um quadrado com o canto dobrado, e a letra dentro.
 *
 * Usa a MESMA utilitária de borda chanfrada dos botões (`chamfer-edge`), e não um SVG
 * próprio. Ela tinha um contorno desenhado à mão aqui dentro, e de longe a diagonal
 * parecia mais fina que o resto — a compensação de espessura agora mora num lugar só, com
 * todos os outros cantos cortados do projeto.
 */
export function RarityMark({ letter, label }: RarityMarkProps) {
  return (
    <span
      className={cx(styles['marca'], 'chamfer-sm', 'chamfer-edge')}
      title={label}
      aria-label={label}
      role="img"
    >
      <span className={styles['letra']} aria-hidden="true">
        {letter}
      </span>
    </span>
  );
}
