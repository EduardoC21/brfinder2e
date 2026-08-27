import { useMemo, useState } from 'react';

import type { BrowseEntity, FilterSpec, FilterState } from '@core/browse/index';
import { optionsFor } from '@core/browse/index';
import { strings } from '@i18n/index';
import { cx } from '@ui/cx';
import { OptionList, type Option } from '@ui/components/OptionList';
import { ScrollRail } from '@ui/components/ScrollRail';

import styles from './FilterBar.module.css';

interface FilterBarProps {
  readonly specs: readonly FilterSpec[];
  /** As entidades ANTES do filtro — é delas que saem as opções e as contagens. */
  readonly entities: readonly BrowseEntity[];
  readonly state: FilterState;
  readonly onChange: (state: FilterState) => void;
}

const t = strings.browse;

/** O rótulo de um campo. Texto de interface mora no i18n, nunca no descritor. */
function fieldLabel(field: string): string {
  return t.fieldLabel[field] ?? field;
}

/** O rótulo de um valor. Booleano e "sem valor" precisam de tradução; o resto é o dado. */
function valueLabel(spec: FilterSpec, value: string): string {
  if (value === '') return t.noValue;
  if (spec.kind === 'boolean') return value === 'true' ? t.yes : t.no;
  return value;
}

export function FilterBar({ specs, entities, state, onChange }: FilterBarProps) {
  const [open, setOpen] = useState(false);

  const groups = useMemo(
    () =>
      specs.map((spec) => ({
        spec,
        title: fieldLabel(spec.field),
        options: optionsFor(entities, spec.field).map((option): Option => ({
          value: option.value,
          label: valueLabel(spec, option.value),
          count: option.count,
        })),
      })),
    [specs, entities],
  );

  const active = specs.flatMap((spec) =>
    (state[spec.field] ?? []).map((value) => ({ spec, value })),
  );

  const toggle = (field: string, value: string): void => {
    const current = state[field] ?? [];
    onChange({
      ...state,
      [field]: current.includes(value)
        ? current.filter((entry) => entry !== value)
        : [...current, value],
    });
  };

  if (specs.length === 0) return null;

  return (
    <div className={styles['bar']}>
      <div className={styles['row']}>
        <button
          type="button"
          className={cx(styles['toggle'], 'chamfer-sm')}
          aria-expanded={open}
          onClick={() => {
            setOpen((value) => !value);
          }}
        >
          {t.filters} {open ? '▴' : '▾'}
          {active.length > 0 && <span className={styles['badge']}>{active.length}</span>}
        </button>

        {/*
         * Os marcados ficam SEMPRE visíveis, na linha de cima, e cada um se remove no
         * clique. Escondê-los dentro da gaveta faria o usuário abrir a gaveta só para
         * lembrar o que está filtrando — e a contagem "3 de 574" não diz o quê.
         *
         * O trilho rola na horizontal e nunca quebra para baixo: quebrar mudaria a altura
         * da barra a cada filtro, e a lista de resultados pularia de lugar.
         */}
        <ScrollRail label={t.activeFilters}>
          {active.map(({ spec, value }) => (
            <button
              key={`${spec.field}:${value}`}
              type="button"
              className={cx(styles['activeChip'], 'chamfer-sm')}
              title={`${fieldLabel(spec.field)}: ${valueLabel(spec, value)}`}
              onClick={() => {
                toggle(spec.field, value);
              }}
            >
              <span className={styles['chipField']}>{fieldLabel(spec.field)}</span>
              {valueLabel(spec, value)}
              <span aria-hidden="true">×</span>
            </button>
          ))}
        </ScrollRail>

        {active.length > 0 && (
          <button
            type="button"
            className={cx(styles['clearAll'], 'chamfer-sm')}
            onClick={() => {
              onChange({});
            }}
          >
            {t.clearFilters}
          </button>
        )}
      </div>

      {open && (
        <div className={cx(styles['drawer'], 'chamfer-md')}>
          {groups.map(({ spec, title, options }) => (
            <OptionList
              key={spec.field}
              title={title}
              options={options}
              selected={state[spec.field] ?? []}
              onToggle={(value) => {
                toggle(spec.field, value);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
