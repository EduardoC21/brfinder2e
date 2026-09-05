import type { FilterSpec, FilterState } from '@core/browse/index';
import { strings } from '@i18n/index';
import { ScrollRail } from '@ui/components/ScrollRail';
import { cx } from '@ui/cx';

import { topicLabel, valueLabel } from './filterLabels';
import styles from './FilterBar.module.css';

interface FilterBarProps {
  readonly specs: readonly FilterSpec[];
  readonly state: FilterState;
  /** O tópico cujo painel está aberto na lateral, ou `null`. */
  readonly openTopic: string | null;
  readonly onOpenTopic: (id: string | null) => void;
  readonly columnsOpen: boolean;
  readonly onOpenColumns: () => void;
  readonly onChange: (state: FilterState) => void;
}

const t = strings.browse;

/**
 * A barra de filtros: só os TÍTULOS dos tópicos, e os filtros já aplicados.
 *
 * As opções não moram aqui — clicar num título abre o painel daquele tópico na barra
 * lateral. O motivo é espaço: são doze tipos de entidade pela frente, e magias sozinhas
 * trazem tradição, escola, nível, alvo, duração e salvamento. Empilhados na barra, os
 * filtros comeriam a lista; a lateral está ociosa justamente enquanto se monta filtro.
 *
 * O que fica aqui é o que precisa estar SEMPRE visível: quais filtros estão valendo. Um
 * filtro esquecido e invisível é a explicação mais comum para "sumiu tudo da lista".
 */
export function FilterBar({
  specs,
  state,
  openTopic,
  onOpenTopic,
  columnsOpen,
  onOpenColumns,
  onChange,
}: FilterBarProps) {
  const aplicados = specs.flatMap((spec) =>
    (state[spec.id]?.values ?? []).map((value) => ({ spec, value })),
  );

  const desmarcar = (spec: FilterSpec, value: string): void => {
    const atual = state[spec.id]?.values ?? [];
    onChange({
      ...state,
      [spec.id]: { ...state[spec.id], values: atual.filter((entry) => entry !== value) },
    });
  };

  if (specs.length === 0) return null;

  return (
    <div className={styles['bar']}>
      <ScrollRail className={styles['topics']} label={t.filters}>
        <span className={styles['legend']}>{t.filters}</span>
        {specs.map((spec) => {
          const marcados = state[spec.id]?.values.length ?? 0;
          return (
            <button
              key={spec.id}
              type="button"
              className={cx(
                styles['topic'],
                'chamfer-sm',
                openTopic === spec.id && styles['topicOpen'],
                marcados > 0 && styles['topicActive'],
              )}
              aria-expanded={openTopic === spec.id}
              onClick={() => {
                // Clicar no que já está aberto fecha, e é o que devolve a lateral à entrada.
                onOpenTopic(openTopic === spec.id ? null : spec.id);
              }}
            >
              {topicLabel(spec)}
              {marcados > 0 && <span className={styles['badge']}>{marcados}</span>}
            </button>
          );
        })}

        {/*
          As colunas ficam na MESMA fileira dos filtros porque são o mesmo gesto: escolher
          o que a lista mostra. O separador antes dela diz que é outra família de escolha.
        */}
        <span className={styles['divider']} aria-hidden="true" />
        <button
          type="button"
          className={cx(styles['topic'], 'chamfer-sm', columnsOpen && styles['topicOpen'])}
          aria-expanded={columnsOpen}
          onClick={onOpenColumns}
        >
          {t.columns}
        </button>
      </ScrollRail>

      {aplicados.length > 0 && (
        <ScrollRail className={styles['applied']} label={t.activeFilters}>
          {/*
            "Limpar tudo" PRIMEIRO, e não no fim.
            No fim ele ia junto com a fileira quando havia muitos filtros — a pessoa que
            mais precisa dele é justamente quem tem filtros demais, e era ela quem não o
            alcançava sem rolar.
          */}
          <button
            type="button"
            className={cx(styles['clearAll'], 'chamfer-sm')}
            onClick={() => {
              onChange({});
            }}
          >
            {t.clearFilters}
          </button>

          {aplicados.map(({ spec, value }) => (
            <button
              key={`${spec.id}:${value}`}
              type="button"
              className={cx(styles['chip'], 'chamfer-sm')}
              title={t.removeFilter}
              onClick={() => {
                desmarcar(spec, value);
              }}
            >
              <span className={styles['chipTopic']}>{topicLabel(spec)}</span>
              {valueLabel(spec, value)}
              <span className={styles['chipX']}>×</span>
            </button>
          ))}
        </ScrollRail>
      )}
    </div>
  );
}
