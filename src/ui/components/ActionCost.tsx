import { strings } from '@i18n/index';
import { cx } from '@ui/cx';

import styles from './ActionCost.module.css';

interface ActionCostProps {
  /** `action`, `reaction`, `free` ou `passive`. */
  readonly kind: string;
  /** 1, 2 ou 3 quando `kind` é `action`; nulo nos demais. */
  readonly count: number | null;
}

const t = strings.browse.cost;

/**
 * O custo em ações, do artboard 1a.
 *
 * Reutilizado em dois lugares que parecem diferentes e não são: o cabeçalho do detalhe, e
 * o símbolo que o Foundry embute no meio da prosa (`<span class="action-glyph">1</span>`,
 * 63 vezes só nas descrições que temos). Ter um componente só garante que os dois
 * desenhem igual.
 */
export function ActionCost({ kind, count }: ActionCostProps) {
  if (kind === 'action' && count !== null && count >= 1 && count <= 3) {
    return (
      <span className={styles['cost']} aria-label={t.actions(count)} title={t.actions(count)}>
        {Array.from({ length: count }, (_, index) => (
          <span key={index} className={styles['pip']} aria-hidden="true" />
        ))}
      </span>
    );
  }

  if (kind === 'free') {
    return (
      <span className={styles['cost']} aria-label={t.free} title={t.free}>
        <span className={cx(styles['pip'], styles['free'])} aria-hidden="true" />
      </span>
    );
  }

  /*
   * Reação é SÍMBOLO, não palavra: ↩ (U+21A9), como no livro e no AoN. A palavra fica no
   * `aria-label` e no `title`, que é onde ela serve — leitor de tela e quem passa o mouse.
   * Escrever "reação" na linha do custo desalinhava a coluna, porque uma palavra ao lado
   * de losangos não tem largura comparável.
   */
  if (kind === 'reaction') {
    return (
      <span className={styles['glyph']} aria-label={t.reaction} title={t.reaction}>
        ↩
      </span>
    );
  }
  if (kind === 'passive') return <span className={styles['label']}>{t.passive}</span>;
  return null;
}
