import { forwardRef, type ReactNode } from 'react';

import { cx } from '@ui/cx';

import styles from './IconButton.module.css';

interface IconButtonProps {
  /** Rótulo acessível. O botão só mostra um ícone, então o nome vive aqui. */
  readonly label: string;
  readonly expanded?: boolean;
  readonly onClick: () => void;
  readonly children: ReactNode;
}

/**
 * `forwardRef` porque quem abre um painel precisa do nó do botão para devolver o foco
 * quando ele fechar — sem isso o Escape deixa o teclado sem lugar nenhum.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, expanded, onClick, children },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={cx(styles['button'], 'chamfer-md')}
      aria-label={label}
      title={label}
      {...(expanded === undefined ? {} : { 'aria-expanded': expanded })}
      onClick={onClick}
    >
      {children}
    </button>
  );
});
