import { useMemo, useState } from 'react';

import { foldTerm, type SourceSpec } from '@core/browse/index';
import { strings } from '@i18n/index';
import { cx } from '@ui/cx';
import { SearchInput } from '@ui/components/SearchInput';

import styles from './SourceRail.module.css';

interface SourceRailProps {
  readonly sources: readonly SourceSpec[];
  readonly currentId: string;
  /** Quantas entradas a fonte atual tem. As outras não sabemos sem ler o armazenamento. */
  readonly currentCount: number;
  readonly onSelect: (id: string) => void;
}

const t = strings.browse;

const sourceLabel = (source: SourceSpec): string => strings.sources[source.id] ?? source.id;

/**
 * O trilho de fontes: busca própria, rolagem interna, e as que ainda não têm receita
 * separadas por uma divisória.
 *
 * São 12 fontes hoje e vão ser mais. Empilhar todas empurraria a lista de resultados para
 * baixo e deixaria dez linhas inertes ocupando a tela — por isso a área rola por dentro e
 * dá para digitar o nome em vez de procurar com o olho.
 *
 * A divisória vem antes de misturar pronta com não-pronta: uma lista onde as utilizáveis
 * estão espalhadas obriga a ler tudo para achar as duas que funcionam.
 */
export function SourceRail({ sources, currentId, currentCount, onSelect }: SourceRailProps) {
  const [term, setTerm] = useState('');

  const { ready, pending } = useMemo(() => {
    const needle = foldTerm(term.trim());
    const visible =
      needle === ''
        ? sources
        : sources.filter((source) => foldTerm(sourceLabel(source)).includes(needle));
    return {
      ready: visible.filter((source) => source.entityType !== null),
      pending: visible.filter((source) => source.entityType === null),
    };
  }, [sources, term]);

  const button = (source: SourceSpec) => {
    const isCurrent = source.id === currentId;
    const isReady = source.entityType !== null;
    return (
      <button
        key={source.id}
        type="button"
        className={cx(styles['source'], 'chamfer-sm')}
        aria-current={isCurrent}
        disabled={!isReady}
        title={isReady ? undefined : t.notReady}
        onClick={() => {
          onSelect(source.id);
        }}
      >
        {sourceLabel(source)}
        {isCurrent && currentCount > 0 && <span className={styles['count']}>{currentCount}</span>}
      </button>
    );
  };

  return (
    <nav className={styles['rail']} aria-label={t.sourcesLabel}>
      <h2 className={styles['title']}>{t.sourcesLabel}</h2>

      {sources.length >= 8 && (
        <SearchInput
          value={term}
          onChange={setTerm}
          placeholder={t.findSource}
          label={t.findSource}
        />
      )}

      <div className={styles['list']}>
        {ready.length === 0 && pending.length === 0 && (
          <p className={styles['empty']}>{t.noResults}</p>
        )}

        {ready.map(button)}

        {pending.length > 0 && <p className={styles['divider']}>{t.notReady}</p>}
        {pending.map(button)}
      </div>
    </nav>
  );
}
