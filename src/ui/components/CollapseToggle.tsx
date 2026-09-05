import { cx } from '@ui/cx';

import styles from './CollapseToggle.module.css';

interface CollapseToggleProps {
  /** De que lado da tela o painel vive. Decide para onde a seta aponta. */
  readonly side: 'left' | 'right';
  readonly collapsed: boolean;
  readonly label: string;
  readonly onToggle: () => void;
}

/**
 * O botão de recolher e abrir um painel lateral.
 *
 * A seta aponta para o MOVIMENTO, e não para o estado: aberto à esquerda, ela aponta para
 * a esquerda porque é para lá que o painel vai. É a convenção que todo editor usa, e a
 * leitura contrária ("a seta mostra onde o painel está") só funciona até a pessoa clicar
 * uma vez e ver o oposto do que esperava.
 */
export function CollapseToggle({ side, collapsed, label, onToggle }: CollapseToggleProps) {
  const paraDentro = side === 'left' ? '‹' : '›';
  const paraFora = side === 'left' ? '›' : '‹';

  return (
    <button
      type="button"
      className={cx(
        styles['botao'],
        'chamfer-sm',
        'chamfer-edge',
        collapsed && styles['recolhido'],
      )}
      aria-label={label}
      aria-expanded={!collapsed}
      title={label}
      onClick={onToggle}
    >
      {collapsed ? paraFora : paraDentro}
    </button>
  );
}
