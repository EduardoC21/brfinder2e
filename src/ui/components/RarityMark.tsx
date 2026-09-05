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
 * ⚠️ SVG PRÓPRIO, e não a utilitária de chanfro do projeto — é a única exceção, e tem
 * motivo: aqui o contorno É o desenho, e a caixa tem tamanho FIXO. As técnicas que servem
 * um botão de largura variável (`clip-path`, `border-image`) ou não desenham a diagonal ou
 * pintam para dentro do conteúdo, o que num quadrado de 16px cobre a letra.
 *
 * Duas demãos, e a segunda é o ponto: a DIAGONAL é traçada à parte, mais grossa que as
 * retas. Uma reta de 1px encaixa na grade de pixels e sai cheia; uma diagonal de 1px é
 * espalhada por ~1,41px de antialiasing e LÊ como mais clara. Sem compensar, o corte
 * parece um risco fino no meio de uma borda sólida quando visto de longe.
 *
 * O miolo fica de verdade transparente (`fill: none`), então o fundo da linha aparece por
 * baixo — inclusive sob o cursor e selecionada, três estados que um miolo pintado
 * precisaria conhecer.
 */
export function RarityMark({ letter, label }: RarityMarkProps) {
  return (
    <span className={styles['marca']} title={label} aria-label={label} role="img">
      <svg className={styles['contorno']} viewBox="0 0 16 16" aria-hidden="true">
        <path className={styles['retas']} d="M5 0.5 H15.5 V15.5 H0.5 V5" />
        <path className={styles['dobra']} d="M0.5 5 L5 0.5" />
      </svg>
      <span className={styles['letra']} aria-hidden="true">
        {letter}
      </span>
    </span>
  );
}
