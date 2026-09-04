import { useMemo, useState } from 'react';

import {
  combineOf,
  foldTerm,
  optionsFor,
  type BrowseEntity,
  type Combine,
  type FilterSpec,
  type FilterState,
} from '@core/browse/index';
import { strings } from '@i18n/index';
import { ActionCost } from '@ui/components/ActionCost';
import { SearchInput } from '@ui/components/SearchInput';
import { cx } from '@ui/cx';

import { topicLabel, valueLabel } from './filterLabels';
import styles from './FilterTopicPanel.module.css';

const t = strings.browse;

interface FilterTopicPanelProps {
  readonly spec: FilterSpec;
  /** As entidades ANTES do filtro — é delas que saem as opções e as contagens. */
  readonly entities: readonly BrowseEntity[];
  readonly state: FilterState;
  readonly onChange: (state: FilterState) => void;
  readonly onClose: () => void;
}

/** Acima disto, a lista ganha um campo para procurar dentro dela. */
const LIMITE_PARA_BUSCA = 12;

/** Uma referência estável para "nada marcado". Ver o comentário em `marcados`. */
const VAZIO: readonly string[] = [];

/**
 * As opções de UM tópico, desenhadas na barra lateral.
 *
 * Um tópico por vez, e trocar de tópico não limpa o que já foi marcado — o estado vive no
 * `SourcePane`, acima deste componente, então este pode montar e desmontar à vontade.
 *
 * O par E/OU só aparece onde faz diferença: num campo de valor único, "E" daria sempre
 * lista vazia, e um controle que só produz resultado vazio é uma armadilha.
 */
export function FilterTopicPanel({
  spec,
  entities,
  state,
  onChange,
  onClose,
}: FilterTopicPanelProps) {
  const [busca, setBusca] = useState('');

  const opcoes = useMemo(() => optionsFor(entities, spec), [entities, spec]);
  /*
   * Memoizado porque entra nas dependências do `useMemo` abaixo: `?? []` cria um array
   * novo a cada render quando o tópico não tem nada marcado, e isso refaria a filtragem
   * das opções em todo render, inclusive nos de digitação.
   */
  const marcados = useMemo(() => state[spec.id]?.values ?? VAZIO, [state, spec.id]);
  const combine = combineOf(spec, state);

  /*
   * O marcado NUNCA é filtrado pela busca. Digitar um termo que não casa com ele o
   * esconderia junto com o resto, e a pessoa perderia de vista o que ela mesma escolheu —
   * sem poder desmarcar.
   */
  const visiveis = useMemo(() => {
    const termo = foldTerm(busca);
    if (termo === '') return opcoes;
    return opcoes.filter(
      (opcao) =>
        marcados.includes(opcao.value) || foldTerm(valueLabel(spec, opcao.value)).includes(termo),
    );
  }, [opcoes, busca, marcados, spec]);

  const alternar = (value: string): void => {
    const proximos = marcados.includes(value)
      ? marcados.filter((entry) => entry !== value)
      : [...marcados, value];
    onChange({ ...state, [spec.id]: { ...state[spec.id], values: proximos } });
  };

  const trocarCombine = (proximo: Combine): void => {
    onChange({ ...state, [spec.id]: { values: marcados, combine: proximo } });
  };

  return (
    <section className={styles['panel']} aria-label={topicLabel(spec)}>
      <header className={styles['head']}>
        <div className={styles['titleRow']}>
          <h2 className={styles['title']}>{topicLabel(spec)}</h2>
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

        {spec.kind === 'list' && (
          <div className={styles['combine']} role="radiogroup" aria-label={t.combineLabel}>
            {(['any', 'all'] as const).map((modo) => (
              <button
                key={modo}
                type="button"
                role="radio"
                aria-checked={combine === modo}
                className={cx(styles['combineOption'], combine === modo && styles['combineOn'])}
                onClick={() => {
                  trocarCombine(modo);
                }}
              >
                {modo === 'any' ? t.combineAny : t.combineAll}
              </button>
            ))}
          </div>
        )}

        {opcoes.length > LIMITE_PARA_BUSCA && (
          <SearchInput
            className={styles['search']}
            label={t.findOption}
            placeholder={t.findOption}
            value={busca}
            onChange={setBusca}
          />
        )}

        {marcados.length > 0 && (
          <button
            type="button"
            className={cx(styles['clear'], 'chamfer-sm')}
            onClick={() => {
              onChange({ ...state, [spec.id]: { ...state[spec.id], values: [] } });
            }}
          >
            {t.clearTopic}
          </button>
        )}
      </header>

      <div className={styles['options']}>
        {visiveis.length === 0 ? (
          <p className={styles['empty']}>{t.noResults}</p>
        ) : (
          visiveis.map((opcao) => {
            const marcado = marcados.includes(opcao.value);
            return (
              <button
                key={opcao.value}
                type="button"
                role="checkbox"
                aria-checked={marcado}
                className={cx(styles['option'], marcado && styles['optionOn'])}
                onClick={() => {
                  alternar(opcao.value);
                }}
              >
                <span className={styles['mark']} aria-hidden="true">
                  {marcado ? '✓' : ''}
                </span>
                <span className={styles['label']}>
                  {spec.kind === 'cost' ? (
                    <CostOption token={opcao.value} />
                  ) : (
                    valueLabel(spec, opcao.value)
                  )}
                </span>
                <span className={styles['count']}>{opcao.count}</span>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}

/**
 * O desenho de uma opção de custo: o GLIFO, não a palavra.
 *
 * É o mesmo `ActionCost` da lista e do cabeçalho do detalhe. Ter um componente só garante
 * que os três desenhem igual, e é o que faz o filtro ser reconhecível de relance: a pessoa
 * procura ◆◆, não a frase "duas ações".
 */
function CostOption({ token }: { readonly token: string }) {
  if (token === '1' || token === '2' || token === '3') {
    return <ActionCost kind="action" count={Number(token)} />;
  }
  if (token === '') return <span>{t.noValue}</span>;
  return <ActionCost kind={token} count={null} />;
}
