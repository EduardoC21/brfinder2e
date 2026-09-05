import { useEffect, useRef } from 'react';

import {
  budgetTraits,
  fieldList,
  fieldValue,
  rarityLetter,
  type BrowseEntity,
  type ColumnSpec,
} from '@core/browse/index';
import { strings } from '@i18n/index';
import { ActionCost } from '@ui/components/ActionCost';
import { cx } from '@ui/cx';

import { columnLabel } from './filterLabels';
import styles from './ResultList.module.css';

/** Quais especiais estão ligadas nesta fonte, depois da escolha do usuário. */
export interface ActiveSpecials {
  readonly level: string | null;
  readonly rarity: string | null;
  readonly traits: string | null;
}

interface ResultListProps {
  readonly entities: readonly BrowseEntity[];
  readonly columns: readonly ColumnSpec[];
  readonly specials: ActiveSpecials;
  /** Índice da linha ativa. `-1` quando nenhuma está. */
  readonly activeIndex: number;
  readonly onActivate: (index: number) => void;
  readonly onOpen: (index: number) => void;
}

/**
 * A lista não sabe o que é uma condição.
 *
 * Ela recebe entidades e uma lista de colunas, e desenha. Trocar de fonte é trocar o
 * descritor — não há `if (tipo === 'condition')` em lugar nenhum daqui.
 *
 * O teclado mora no <input> da busca, não aqui: o usuário digita e desce com a seta sem
 * tirar o foco do campo (Anexo A do briefing). Por isso as linhas são `option` dentro de
 * um `listbox`, e não botões — quem tem o foco é o campo.
 *
 * ⚠️ A linha é uma GRADE, e não uma fileira flexível.
 *
 * Era `flex` com `gap`, e o alinhamento à direita vinha de um `margin-left: auto`. Aquilo
 * desenha uma linha bonita e nada mais: cada linha resolvia o próprio espaço, então a
 * coluna "categoria" da linha 1 não ficava sob a da linha 2, e não havia onde pendurar um
 * cabeçalho. Com `grid-template-columns` declarado uma vez e herdado por todas as linhas
 * E pelo cabeçalho, o alinhamento sai de graça — e a ordenação por cabeçalho, depois,
 * tem onde morar.
 */
export function ResultList({
  entities,
  columns,
  specials,
  activeIndex,
  onActivate,
  onOpen,
}: ResultListProps) {
  const container = useRef<HTMLDivElement>(null);

  /*
   * Rola a linha ativa para dentro da vista quando ela muda por teclado. `block: 'nearest'`
   * e não `'center'`: centralizar faz a lista pular meia tela a cada seta, o que
   * desorienta em lista densa.
   */
  useEffect(() => {
    if (activeIndex < 0) return;
    const lista = container.current;
    const node = lista?.querySelector(`[data-indice="${String(activeIndex)}"]`);
    if (node instanceof HTMLElement) node.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  /*
   * O molde das colunas, montado uma vez e usado pelo cabeçalho e por toda linha.
   *
   *   nível     calha estreita de largura fixa, para os nomes alinharem entre si
   *   nome      `minmax(0, 1fr)` — é quem cede quando falta espaço
   *   traços    `auto`, limitado pelo orçamento de caracteres
   *   demais    `auto`, cada uma do tamanho do conteúdo
   *
   * A raridade NÃO tem trilha própria: ela é uma etiqueta colada ao nome, dentro da
   * célula dele. Trilha própria abriria um vão em toda linha comum, que é a maioria.
   */
  const trilhas = [
    specials.level !== null ? '3ch' : null,
    'minmax(0, 1fr)',
    specials.traits !== null ? 'auto' : null,
    ...columns.map(() => 'auto'),
  ]
    .filter((trilha) => trilha !== null)
    .join(' ');

  return (
    <div className={styles['tabela']} style={{ gridTemplateColumns: trilhas }}>
      <Cabecalho columns={columns} specials={specials} />

      <div
        ref={container}
        className={styles['corpo']}
        style={{ gridTemplateColumns: trilhas }}
        role="listbox"
        aria-label={strings.browse.sourcesLabel}
        tabIndex={-1}
      >
        {entities.map((entity, index) => (
          <Linha
            key={entity.key}
            entity={entity}
            index={index}
            columns={columns}
            specials={specials}
            ativa={index === activeIndex}
            onActivate={onActivate}
            onOpen={onOpen}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * A linha, como `display: contents`.
 *
 * O elemento da linha não desenha caixa nenhuma: os filhos dele participam DIRETAMENTE da
 * grade do contêiner, que é a única forma de as células de linhas diferentes caírem na
 * mesma trilha. O fundo de seleção e o `hover` vêm das próprias células.
 */
function Linha({
  entity,
  index,
  columns,
  specials,
  ativa,
  onActivate,
  onOpen,
}: {
  readonly entity: BrowseEntity;
  readonly index: number;
  readonly columns: readonly ColumnSpec[];
  readonly specials: ActiveSpecials;
  readonly ativa: boolean;
  readonly onActivate: (index: number) => void;
  readonly onOpen: (index: number) => void;
}) {
  const nivel = specials.level === null ? null : fieldValue(entity, specials.level);
  const raridade = specials.rarity === null ? null : fieldValue(entity, specials.rarity);
  const letra = raridade === null ? null : rarityLetter(raridade);
  const traços = specials.traits === null ? null : budgetTraits(fieldList(entity, specials.traits));

  return (
    <div
      className={cx(styles['row'], ativa && styles['ativa'])}
      data-indice={index}
      id={`resultado-${String(index)}`}
      role="option"
      aria-selected={ativa}
      onMouseDown={(event) => {
        // Impede o campo de busca de perder o foco ao clicar na lista — o usuário
        // continua digitando depois de escolher com o mouse.
        event.preventDefault();
        onActivate(index);
      }}
      onDoubleClick={() => {
        onOpen(index);
      }}
    >
      {specials.level !== null && (
        <span className={cx(styles['celula'], styles['nivel'])}>{nivel === '' ? '0' : nivel}</span>
      )}

      <span className={cx(styles['celula'], styles['nomeCelula'])}>
        <span className={styles['name']}>{fieldValue(entity, 'name')}</span>
        {letra !== null && raridade !== null && (
          <span className={cx(styles['raridade'], 'chamfer-sm')} title={rarityTitle(raridade)}>
            {letra}
          </span>
        )}
        {entity.retiredIn !== undefined && (
          <span className={styles['retired']} title={entity.retiredIn}>
            {strings.browse.retired}
          </span>
        )}
      </span>

      {traços !== null && (
        <span className={cx(styles['celula'], styles['tracos'])}>
          {traços.shown.map((trait) => (
            <span key={trait} className={styles['chip']}>
              {trait}
            </span>
          ))}
          {traços.hidden > 0 && (
            <span
              className={cx(styles['chip'], styles['resto'])}
              title={strings.browse.moreTraits(traços.hidden)}
            >
              +{traços.hidden}
            </span>
          )}
        </span>
      )}

      {columns.map((column) => (
        <span key={column.id} className={cx(styles['celula'], alinhamento(column))}>
          <Column spec={column} entity={entity} />
        </span>
      ))}
    </div>
  );
}

/**
 * A linha de títulos.
 *
 * Não é decoração: é o que diz o que cada coluna significa quando o usuário escolheu
 * quatro delas. E é onde a ordenação vai morar — por isso ela nasce como grade irmã das
 * linhas, e não como um bloco solto acima.
 */
function Cabecalho({
  columns,
  specials,
}: {
  readonly columns: readonly ColumnSpec[];
  readonly specials: ActiveSpecials;
}) {
  const t = strings.browse;
  return (
    <div className={styles['cabecalho']} role="presentation">
      {specials.level !== null && (
        <span className={cx(styles['titulo'], styles['nivel'])}>{t.columnLevel}</span>
      )}
      <span className={styles['titulo']}>{t.columnName}</span>
      {specials.traits !== null && <span className={styles['titulo']}>{t.columnTraits}</span>}
      {columns.map((column) => (
        <span key={column.id} className={cx(styles['titulo'], alinhamento(column))}>
          {columnLabel(column)}
        </span>
      ))}
    </div>
  );
}

function rarityTitle(rarity: string): string {
  return strings.browse.rarity[rarity] ?? rarity;
}

function alinhamento(spec: ColumnSpec): string | undefined {
  return spec.align === 'end' ? styles['end'] : undefined;
}

/**
 * O desenhista de colunas.
 *
 * Um caso por `kind` da união em `core/browse/spec.ts`, e o compilador cobra quando um
 * caso novo aparece.
 *
 * TODO valor sai em caixinha, e não uns em caixa e outros em texto cru: numa grade, a
 * caixa é o que dá à célula uma borda visível e faz a coluna parecer coluna.
 */
function Column({ spec, entity }: { readonly spec: ColumnSpec; readonly entity: BrowseEntity }) {
  switch (spec.kind) {
    case 'chip': {
      const value = fieldValue(entity, spec.field);
      if (value === '') return null;
      return <span className={styles['chip']}>{capitalizar(value)}</span>;
    }

    case 'text': {
      const value = fieldValue(entity, spec.field);
      if (value === '') return null;
      // Booleano vira SÍMBOLO: "true" numa coluna não diz nada, e "sim/não" em toda linha
      // gasta espaço para repetir o que a ausência já conta.
      if (value === 'true') {
        return (
          <span className={styles['sim']} title={strings.browse.yes}>
            ✓
          </span>
        );
      }
      if (value === 'false') return null;
      return <span className={styles['chip']}>{capitalizar(value)}</span>;
    }

    case 'cost': {
      const kind = fieldValue(entity, 'costKind');
      if (kind === '') return null;
      const count = Number(fieldValue(entity, 'costCount'));
      return <ActionCost kind={kind} count={Number.isFinite(count) ? count : null} />;
    }
  }
}

/** `offensive` vira `Offensive`. O dado vem em minúscula; a coluna é uma etiqueta. */
function capitalizar(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
