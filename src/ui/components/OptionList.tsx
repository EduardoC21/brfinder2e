import { useMemo, useState } from 'react';

import { foldTerm } from '@core/browse/index';
import { strings } from '@i18n/index';
import { SearchInput } from '@ui/components/SearchInput';

import styles from './OptionList.module.css';

export interface Option {
  readonly value: string;
  readonly label: string;
  readonly count: number;
}

interface OptionListProps {
  readonly title: string;
  readonly options: readonly Option[];
  readonly selected: readonly string[];
  readonly onToggle: (value: string) => void;
  /**
   * A partir de quantas opções aparece a busca dentro do grupo. Abaixo disso o campo é
   * ruído: dá para ler a lista toda de um golpe de vista.
   */
  readonly searchFrom?: number;
}

const t = strings.browse;

/**
 * Um grupo de filtro: título, contagem do que está marcado, busca própria e rolagem.
 *
 * Reutilizado por todo filtro de opções, e desenhado para o pior caso conhecido — os
 * traços da Etapa 10, que passam de 200 valores. Por isso a altura tem teto e a busca
 * aparece sozinha quando a lista cresce.
 *
 * A busca usa a MESMA normalização de acento do índice de resultados (`foldTerm`), para
 * "ilusao" achar "Ilusão" aqui também. Duas normalizações diferentes na mesma tela seriam
 * uma inconsistência que ninguém consegue explicar.
 */
export function OptionList({
  title,
  options,
  selected,
  onToggle,
  searchFrom = 12,
}: OptionListProps) {
  const [term, setTerm] = useState('');
  const showSearch = options.length >= searchFrom;

  const visible = useMemo(() => {
    const needle = foldTerm(term.trim());
    if (needle === '') return options;
    // O que está marcado nunca some da lista: some-lo esconderia como desmarcar.
    return options.filter(
      (option) => selected.includes(option.value) || foldTerm(option.label).includes(needle),
    );
  }, [options, term, selected]);

  return (
    <div className={styles['group']}>
      <h4 className={styles['title']}>
        {title}
        {selected.length > 0 && <span className={styles['selected']}>{selected.length}</span>}
      </h4>

      {showSearch && (
        <SearchInput
          value={term}
          onChange={setTerm}
          placeholder={t.filterOptions}
          label={`${t.filterOptions} — ${title}`}
        />
      )}

      <div className={styles['list']}>
        {visible.length === 0 ? (
          <p className={styles['empty']}>{t.noResults}</p>
        ) : (
          visible.map((option) => (
            <label key={option.value} className={styles['option']}>
              <input
                type="checkbox"
                checked={selected.includes(option.value)}
                onChange={() => {
                  onToggle(option.value);
                }}
              />
              <span className={styles['label']}>{option.label}</span>
              <span className={styles['count']}>{option.count}</span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}
