import styles from './RarityMark.module.css';

interface RarityMarkProps {
  /** `I`, `R` ou `Ú`. */
  readonly letter: string;
  /** O nome por extenso, para quem passa o mouse. */
  readonly label: string;
}

/**
 * A etiqueta de raridade: um quadrado com o canto dobrado, e a letra dentro.
 *
 * ⚠️ O contorno é SVG, e não `border` com `clip-path`.
 *
 * `clip-path` corta o elemento E A BORDA junto: a diagonal fica sem contorno, e o efeito
 * é de borda quebrada, não de papel dobrado. O traço do SVG segue a forma inteira,
 * diagonal incluída.
 *
 * E o miolo fica de verdade TRANSPARENTE — `fill: none` —, então o fundo da linha aparece
 * por baixo, inclusive quando ela está sob o cursor ou selecionada. Um miolo pintado
 * precisaria saber a cor da superfície atrás, que muda em três estados.
 */
export function RarityMark({ letter, label }: RarityMarkProps) {
  return (
    <span className={styles['marca']} title={label} aria-label={label} role="img">
      <svg className={styles['contorno']} viewBox="0 0 16 16" aria-hidden="true">
        {/* Começa no fim do corte, dá a volta, e o `Z` fecha desenhando a dobra. */}
        <path d="M5 0.5 H15.5 V15.5 H0.5 V5 Z" />
      </svg>
      <span className={styles['letra']} aria-hidden="true">
        {letter}
      </span>
    </span>
  );
}
