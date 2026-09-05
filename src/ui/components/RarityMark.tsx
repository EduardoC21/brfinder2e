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
 * Usa a mesma utilitária de chanfro que o resto do app. Já teve SVG próprio, porque o
 * `clip-path` deixava a diagonal sem contorno e aqui o contorno É o desenho — com
 * `corner-shape` isso deixou de ser verdade, e um caso especial a menos é uma forma a
 * menos de construir a mesma coisa.
 *
 * O miolo fica transparente, então o fundo da linha aparece por baixo — inclusive sob o
 * cursor e selecionada, três estados que um miolo pintado precisaria conhecer.
 */
export function RarityMark({ letter, label }: RarityMarkProps) {
  return (
    <span className={cx(styles['marca'], 'chamfer-sm')} title={label} aria-label={label} role="img">
      {letter}
    </span>
  );
}
