import { useState } from 'react';

import type { BrowseEntity, FilterSpec, FilterState } from '@core/browse/index';
import { optionsFor } from '@core/browse/index';
import { strings } from '@i18n/index';

import styles from './FilterBar.module.css';

interface FilterBarProps {
  readonly specs: readonly FilterSpec[];
  /** As entidades ANTES do filtro — é delas que saem as opções e as contagens. */
  readonly entities: readonly BrowseEntity[];
  readonly state: FilterState;
  readonly onChange: (state: FilterState) => void;
  readonly summary: string;
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

export function FilterBar({ specs, entities, state, onChange, summary }: FilterBarProps) {
  const [open, setOpen] = useState(false);

  const active = specs.flatMap((spec) =>
    (state[spec.field] ?? []).map((value) => ({ spec, value })),
  );

  const toggle = (field: string, value: string): void => {
    const current = state[field] ?? [];
    const next = current.includes(value)
      ? current.filter((entry) => entry !== value)
      : [...current, value];
    onChange({ ...state, [field]: next });
  };

  if (specs.length === 0) return null;

  return (
    <>
      <div className={styles['bar']}>
        <button
          type="button"
          className={styles['toggle']}
          aria-expanded={open}
          onClick={() => {
            setOpen((value) => !value);
          }}
        >
          {t.filters} {open ? '▴' : '▾'}
        </button>

        {active.map(({ spec, value }) => (
          <button
            key={`${spec.field}:${value}`}
            type="button"
            className={styles['activeChip']}
            title={fieldLabel(spec.field)}
            onClick={() => {
              toggle(spec.field, value);
            }}
          >
            {valueLabel(spec, value)} ×
          </button>
        ))}

        {active.length > 0 && (
          <button
            type="button"
            className={styles['clear']}
            onClick={() => {
              onChange({});
            }}
          >
            {t.clearFilters}
          </button>
        )}

        <span className={styles['optionCount']}>{summary}</span>
      </div>

      {open && (
        <div className={styles['drawer']}>
          {specs.map((spec) => (
            <fieldset key={spec.field} style={{ border: 0, margin: 0, padding: 0 }}>
              <legend className={styles['groupTitle']}>{fieldLabel(spec.field)}</legend>
              {optionsFor(entities, spec.field).map((option) => (
                <label key={option.value} className={styles['option']}>
                  <input
                    type="checkbox"
                    checked={(state[spec.field] ?? []).includes(option.value)}
                    onChange={() => {
                      toggle(spec.field, option.value);
                    }}
                  />
                  {valueLabel(spec, option.value)}
                  <span className={styles['optionCount']}>{option.count}</span>
                </label>
              ))}
            </fieldset>
          ))}
        </div>
      )}
    </>
  );
}
