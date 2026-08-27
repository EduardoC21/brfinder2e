import { forwardRef } from 'react';

import { cx } from '@ui/cx';

import styles from './SearchInput.module.css';

interface SearchInputProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder: string;
  /** Rótulo acessível. O campo não tem rótulo visível: o contexto já diz o que ele faz. */
  readonly label: string;
  readonly onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  readonly className?: string;
}

/**
 * Campo de filtragem, reutilizado em três lugares: o trilho de fontes, cada grupo de
 * filtro com muitas opções, e a paleta de comandos quando ela existir.
 *
 * `type="search"` e não `type="text"`: o navegador dá semântica de busca e o leitor de
 * tela anuncia como tal. O X nativo é escondido no CSS e substituído pelo nosso, porque
 * o nativo não acompanha o sistema de cores.
 */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { value, onChange, placeholder, label, onKeyDown, className },
  ref,
) {
  return (
    <div className={cx(styles['wrap'], className)}>
      <input
        ref={ref}
        type="search"
        className={cx(styles['input'], 'chamfer-sm')}
        value={value}
        placeholder={placeholder}
        aria-label={label}
        autoComplete="off"
        onChange={(event) => {
          onChange(event.target.value);
        }}
        {...(onKeyDown === undefined ? {} : { onKeyDown })}
      />
      {value !== '' && (
        <button
          type="button"
          className={styles['clear']}
          aria-label={`Limpar ${label.toLowerCase()}`}
          onMouseDown={(event) => {
            // Não roubar o foco do campo: quem limpou quer continuar digitando.
            event.preventDefault();
            onChange('');
          }}
        >
          ×
        </button>
      )}
    </div>
  );
});
