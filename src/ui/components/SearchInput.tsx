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
  readonly className?: string | undefined;
  /**
   * `lg` para a busca principal da lista; ausente, o tamanho compacto dos filtros.
   *
   * ⚠️ Existe porque `className` vai para o INVÓLUCRO, não para o campo. A tela principal
   * passava o estilo dela por `className` e o resultado eram DUAS bordas e dois fundos
   * aninhados, com o × posicionado sobre a borda de fora. Tamanho é assunto do
   * componente; `className` fica só para posicionar o invólucro no layout de quem usa.
   */
  readonly size?: 'lg';
  /**
   * Fiação de caixa de combinação, para o campo que comanda uma lista pelo teclado.
   *
   * Existe porque o campo principal da busca era um `<input>` cru, escrito à parte só por
   * causa destes três atributos — e foi essa cópia que trouxe o × duplicado de volta.
   * Ausente, o campo continua sendo um campo de busca comum.
   */
  readonly controls?: {
    readonly listId: string;
    readonly activeId: string | undefined;
  };
}

/**
 * Campo de filtragem, reutilizado em três lugares: o trilho de fontes, cada grupo de
 * filtro com muitas opções, e a paleta de comandos quando ela existir.
 *
 * `type="search"` e não `type="text"`: o navegador dá semântica de busca e o leitor de
 * tela anuncia como tal. O × nativo é escondido no CSS (`::-webkit-search-cancel-button`)
 * e substituído pelo nosso, porque o nativo não acompanha o sistema de cores.
 *
 * ⚠️ TODO campo de busca do app passa por aqui. Escrever `<input type="search">` numa tela
 * é como o × duplicado apareceu: o CSS que esconde o nativo mora neste módulo, e um
 * `<input>` solto não o enxerga.
 */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { value, onChange, placeholder, label, onKeyDown, className, controls, size },
  ref,
) {
  return (
    <div className={cx(styles['wrap'], className)}>
      <input
        ref={ref}
        type="search"
        className={cx(styles['input'], size === 'lg' && styles['lg'], 'chamfer-sm')}
        value={value}
        placeholder={placeholder}
        aria-label={label}
        autoComplete="off"
        {...(controls === undefined
          ? {}
          : {
              role: 'combobox',
              'aria-expanded': true,
              'aria-controls': controls.listId,
              ...(controls.activeId === undefined
                ? {}
                : { 'aria-activedescendant': controls.activeId }),
            })}
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
