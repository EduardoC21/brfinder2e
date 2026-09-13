import { useMemo, useState } from 'react';

import {
  foldTerm,
  railEntryKey,
  type RailEntry,
  type RailGroup,
  type SourceSpec,
} from '@core/browse/index';
import { strings } from '@i18n/index';
import { cx } from '@ui/cx';
import { CollapseToggle } from '@ui/components/CollapseToggle';
import { SearchInput } from '@ui/components/SearchInput';

import { valueLabel } from './filterLabels';
import styles from './SourceRail.module.css';

interface SourceRailProps {
  readonly groups: readonly RailGroup[];
  readonly sources: readonly SourceSpec[];
  /** A chave da entrada aberta — `feats`, `feats:Class`. Ver `railEntryKey`. */
  readonly currentKey: string;
  /** Quantas entradas a entrada atual tem. As outras não sabemos sem ler o armazenamento. */
  readonly currentCount: number;
  /** As pastas recolhidas, por id. */
  readonly closedGroups: readonly string[];
  readonly onToggleGroup: (id: string) => void;
  readonly onSelect: (entry: RailEntry) => void;
  readonly collapsed: boolean;
  readonly onToggle: () => void;
}

const t = strings.browse;

/**
 * O trilho de fontes, SETORIZADO (Etapa 27, pelo autor): pastas que recolhem, e dentro
 * delas as fontes — ou, nas fontes grandes, "Todos" mais uma entrada por Tipo.
 *
 * A busca do trilho procura nas entradas, não nas pastas: digitar "arma" acha
 * "Equipamentos › Arma" mesmo com a pasta recolhida — com termo, as pastas abrem todas e
 * só as entradas que batem ficam. Uma pasta sem entrada que bata some.
 *
 * A área rola por dentro: são seis pastas e quarenta entradas, e empilhadas empurrariam
 * a lista de resultados para baixo.
 */
export function SourceRail({
  groups,
  sources,
  currentKey,
  currentCount,
  closedGroups,
  onToggleGroup,
  collapsed,
  onToggle,
  onSelect,
}: SourceRailProps) {
  const [term, setTerm] = useState('');

  const fonte = (id: string): SourceSpec | undefined => sources.find((source) => source.id === id);

  /** O rótulo de uma entrada: a fonte (no plural do trilho), "Todos", ou o valor do Tipo. */
  const rotulo = (entry: RailEntry): string => {
    if (entry.kind === 'source') {
      if (entry.all === true) return t.rail.all;
      return t.rail.sources[entry.source] ?? strings.sources[entry.source] ?? entry.source;
    }
    /* O Tipo em português no trilho, quando há; senão o rótulo do filtro. */
    const traduzido = t.rail.types[entry.source]?.[entry.value];
    if (traduzido !== undefined) return traduzido;
    const source = fonte(entry.source);
    const spec = source?.filters.find((filter) => filter.id === source.typeFilter);
    return spec === undefined ? entry.value : valueLabel(spec, entry.value);
  };

  const visiveis = useMemo(() => {
    const needle = foldTerm(term.trim());
    return groups
      .map((group) => ({
        group,
        entries:
          needle === ''
            ? group.entries
            : group.entries.filter((entry) => foldTerm(rotulo(entry)).includes(needle)),
      }))
      .filter(({ entries }) => entries.length > 0);
    // `rotulo` lê só `sources` e i18n; os dois são estáveis no ciclo de vida do trilho.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, sources, term]);

  const buscando = term.trim() !== '';

  const botao = (entry: RailEntry) => {
    const key = railEntryKey(entry);
    const source = fonte(entry.source);
    const isCurrent = key === currentKey;
    const isReady = source !== undefined && source.entityType !== null;
    return (
      <button
        key={key}
        type="button"
        className={cx(styles['source'], entry.kind === 'type' && styles['tipo'], 'chamfer-sm')}
        aria-current={isCurrent}
        disabled={!isReady}
        title={isReady ? undefined : t.notReady}
        onClick={() => {
          onSelect(entry);
        }}
      >
        {rotulo(entry)}
        {isCurrent && currentCount > 0 && <span className={styles['count']}>{currentCount}</span>}
      </button>
    );
  };

  /*
   * Recolhido, o trilho vira uma tira com o botão e nada mais.
   *
   * Devolver `null` seria mais curto e tiraria o caminho de volta: sem a tira, não há onde
   * clicar para reabrir, e a única saída seria alargar a janela.
   *
   * O `return` fica DEPOIS de todos os hooks: saindo antes do `useMemo`, a ordem de
   * chamada mudaria entre um render e outro, que é o que os hooks não permitem.
   */
  if (collapsed) {
    return (
      <div className={styles['tira']}>
        <CollapseToggle side="left" collapsed label={t.expandRail} onToggle={onToggle} />
      </div>
    );
  }

  return (
    <nav className={styles['rail']} aria-label={t.sourcesLabel}>
      <div className={styles['tituloLinha']}>
        <h2 className={styles['title']}>{t.sourcesLabel}</h2>
        <CollapseToggle side="left" collapsed={false} label={t.collapseRail} onToggle={onToggle} />
      </div>

      <SearchInput
        value={term}
        onChange={setTerm}
        placeholder={t.findSource}
        label={t.findSource}
      />

      <div className={styles['list']}>
        {visiveis.length === 0 && <p className={styles['empty']}>{t.noResults}</p>}

        {visiveis.map(({ group, entries }) => {
          /* Com termo, toda pasta abre: recolhida, ela esconderia o que a busca achou. */
          const fechada = !buscando && closedGroups.includes(group.id);
          return (
            <section key={group.id} className={styles['pasta']}>
              <button
                type="button"
                className={styles['pastaTitulo']}
                aria-expanded={!fechada}
                onClick={() => {
                  onToggleGroup(group.id);
                }}
              >
                <span className={styles['pastaSeta']} aria-hidden="true">
                  {fechada ? '▸' : '▾'}
                </span>
                {t.rail.groups[group.id] ?? group.id}
              </button>
              {!fechada && entries.map(botao)}
            </section>
          );
        })}
      </div>
    </nav>
  );
}
