import type { ColumnSpec, SpecialColumns } from '@core/browse/index';
import { moveColumn } from '@core/prefs/index';
import { strings } from '@i18n/index';
import { cx } from '@ui/cx';

import { columnLabel, specialColumnLabel } from './filterLabels';
import styles from './FilterTopicPanel.module.css';
import proprio from './ColumnPicker.module.css';

const t = strings.browse;

/**
 * Quantas colunas cabem ao lado do nome, além das especiais.
 *
 * A linha tem altura FIXA (34px) e não quebra — é o que faz o olho varrer a lista. Sem
 * teto, marcar sete colunas espremeria o nome até sobrar a primeira letra.
 *
 * Caiu de quatro para DUAS porque nível, raridade e traços passaram a ocupar o meio da
 * linha. Elas não contam neste teto: não disputam o espaço da direita.
 */
const MAXIMO = 2;

/** As especiais, na ordem em que aparecem na linha. */
const ESPECIAIS = ['level', 'rarity', 'traits'] as const;

interface ColumnPickerProps {
  /** Todas as colunas que a fonte oferece, na ordem canônica. */
  readonly available: readonly ColumnSpec[];
  /** Ids visíveis, na ordem em que aparecem. */
  readonly selected: readonly string[];
  /** Verdadeiro quando o que está na tela é o padrão da fonte, e não escolha do usuário. */
  readonly noPadrao: boolean;
  /** Quais especiais esta fonte tem dado para oferecer. */
  readonly special: SpecialColumns;
  /** Ids das especiais que o usuário desligou. */
  readonly hiddenSpecials: readonly string[];
  readonly onToggleSpecial: (id: string) => void;
  readonly onChange: (columns: readonly string[]) => void;
  readonly onReset: () => void;
  readonly onClose: () => void;
}

/**
 * O seletor de colunas, desenhado na mesma camada dos tópicos de filtro.
 *
 * Reaproveita o CSS do painel de filtro de propósito: são o mesmo objeto de tela — um
 * painel de escolhas sobre a coluna de detalhe — e desenhá-los diferente faria parecer
 * que fazem coisas diferentes.
 *
 * A ordem é editada com setas, não arrastando. Arrastar exigiria um segundo mecanismo de
 * ponteiro só para isto, e setas funcionam com teclado sem trabalho extra — a lista tem
 * no máximo quatro itens, então ninguém vai clicar muito.
 */
export function ColumnPicker({
  available,
  selected,
  noPadrao,
  special,
  hiddenSpecials,
  onToggleSpecial,
  onChange,
  onReset,
  onClose,
}: ColumnPickerProps) {
  const cheio = selected.length >= MAXIMO;

  const alternar = (id: string): void => {
    if (selected.includes(id)) {
      onChange(selected.filter((entry) => entry !== id));
      return;
    }
    if (cheio) return;
    onChange([...selected, id]);
  };

  return (
    <section className={styles['panel']} aria-label={t.columns}>
      <header className={styles['head']}>
        {/* Mesmo desenho do painel de filtro: o "voltar ao padrão" na linha do título,
            desabilitado quando não há o que desfazer. */}
        <div className={styles['titleRow']}>
          <h2 className={styles['title']}>{t.columns}</h2>
          <button
            type="button"
            className={cx(styles['close'], 'chamfer-sm')}
            aria-label={t.columnsReset}
            title={t.columnsReset}
            disabled={noPadrao}
            onClick={onReset}
          >
            ⟲
          </button>
          <button
            type="button"
            className={cx(styles['close'], 'chamfer-sm')}
            aria-label={t.detail.close}
            title={t.detail.close}
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <p className={proprio['hint']}>{t.columnsHint(MAXIMO)}</p>
      </header>

      <div className={styles['options']}>
        {/*
          As especiais primeiro, e num grupo próprio.

          Elas pertencem ao nome — nível antes, raridade colada, traços logo depois — e por
          isso não disputam o espaço da direita nem contam no teto. Vêm ligadas onde a
          fonte tem o dado, e podem ser desligadas.
        */}
        {ESPECIAIS.some((id) => special[id] !== null) && (
          <p className={proprio['group']}>{t.columnsAlways}</p>
        )}
        {ESPECIAIS.filter((id) => special[id] !== null).map((id) => {
          const ligada = !hiddenSpecials.includes(id);
          return (
            <button
              key={id}
              type="button"
              role="checkbox"
              aria-checked={ligada}
              className={cx(styles['option'], ligada && styles['optionOn'])}
              onClick={() => {
                onToggleSpecial(id);
              }}
            >
              <span className={styles['mark']} aria-hidden="true">
                {ligada ? '✓' : ''}
              </span>
              <span className={styles['label']}>{specialColumnLabel(id)}</span>
            </button>
          );
        })}

        {/*
          Os escolhidos primeiro, na ordem em que aparecem na lista, com as setas.
          Separar as duas listas é o que torna a ORDEM visível: misturados, não haveria
          onde ler qual coluna vem antes de qual.
        */}
        {selected.length > 0 && <p className={proprio['group']}>{t.columnsShown}</p>}
        {selected.map((id, index) => {
          const spec = available.find((column) => column.id === id);
          if (spec === undefined) return null;
          return (
            <div key={id} className={proprio['ordered']}>
              <button
                type="button"
                role="checkbox"
                aria-checked
                className={cx(styles['option'], styles['optionOn'], proprio['grow'])}
                onClick={() => {
                  alternar(id);
                }}
              >
                <span className={styles['mark']} aria-hidden="true">
                  ✓
                </span>
                <span className={styles['label']}>{columnLabel(spec)}</span>
              </button>

              <button
                type="button"
                className={proprio['move']}
                aria-label={t.columnUp}
                title={t.columnUp}
                disabled={index === 0}
                onClick={() => {
                  onChange(moveColumn(selected, id, -1));
                }}
              >
                ↑
              </button>
              <button
                type="button"
                className={proprio['move']}
                aria-label={t.columnDown}
                title={t.columnDown}
                disabled={index === selected.length - 1}
                onClick={() => {
                  onChange(moveColumn(selected, id, 1));
                }}
              >
                ↓
              </button>
            </div>
          );
        })}

        {available.some((column) => !selected.includes(column.id)) && (
          <p className={proprio['group']}>{t.columnsHidden}</p>
        )}
        {available
          .filter((column) => !selected.includes(column.id))
          .map((column) => (
            <button
              key={column.id}
              type="button"
              role="checkbox"
              aria-checked={false}
              className={styles['option']}
              disabled={cheio}
              onClick={() => {
                alternar(column.id);
              }}
            >
              <span className={styles['mark']} aria-hidden="true" />
              <span className={styles['label']}>{columnLabel(column)}</span>
            </button>
          ))}
      </div>
    </section>
  );
}
