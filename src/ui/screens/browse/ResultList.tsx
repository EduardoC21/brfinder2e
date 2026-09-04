import { useEffect, useRef } from 'react';

import type { BrowseEntity, ColumnSpec } from '@core/browse/index';
import { fieldValue } from '@core/browse/index';
import { strings } from '@i18n/index';
import { ActionCost } from '@ui/components/ActionCost';
import { cx } from '@ui/cx';

import styles from './ResultList.module.css';

interface ResultListProps {
  readonly entities: readonly BrowseEntity[];
  readonly columns: readonly ColumnSpec[];
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
 */
export function ResultList({
  entities,
  columns,
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
    const node = container.current?.children[activeIndex];
    if (node instanceof HTMLElement) node.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  return (
    <div ref={container} role="listbox" aria-label={strings.browse.sourcesLabel} tabIndex={-1}>
      {entities.map((entity, index) => (
        <div
          key={entity.key}
          id={`resultado-${String(index)}`}
          role="option"
          aria-selected={index === activeIndex}
          className={styles['row']}
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
          {/*
            O nome vem SEMPRE, e fora do laço.
            Ele não é uma coluna escolhível: uma linha de resultado sem nome não identifica
            nada. Deixá-lo na lista de colunas o tornaria desmarcável, e a primeira coisa
            que alguém faria por engano seria apagá-lo.
          */}
          <span className={styles['name']}>{fieldValue(entity, 'name')}</span>

          {columns.map((column) => (
            <Column key={column.id} spec={column} entity={entity} />
          ))}
          {entity.retiredIn !== undefined && (
            <span className={styles['retired']} title={entity.retiredIn}>
              {strings.browse.retired}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * O desenhista de colunas.
 *
 * Um caso por `kind` da união em `core/browse/spec.ts`. Acrescentar `level`, `traits` ou
 * `rarity` na Etapa 9 é acrescentar um caso aqui — e o compilador cobra, porque o `switch`
 * é exaustivo sobre a união.
 */
function Column({ spec, entity }: { readonly spec: ColumnSpec; readonly entity: BrowseEntity }) {
  switch (spec.kind) {
    case 'chip': {
      const value = fieldValue(entity, spec.field);
      // Valor vazio não desenha chip: 20 das 43 condições têm grupo nulo, e um chip
      // vazio em metade das linhas seria ruído.
      if (value === '') return null;
      return <span className={cx(styles['chip'], alinhamento(spec))}>{value}</span>;
    }

    case 'text': {
      const value = fieldValue(entity, spec.field);
      if (value === '') return null;
      // Booleano vira palavra: "true" numa coluna não diz nada a quem está jogando.
      const texto =
        value === 'true' ? strings.browse.yes : value === 'false' ? strings.browse.no : value;
      return <span className={cx(styles['text'], alinhamento(spec))}>{texto}</span>;
    }

    case 'cost': {
      const kind = fieldValue(entity, 'costKind');
      if (kind === '') return null;
      const count = Number(fieldValue(entity, 'costCount'));
      return (
        <span className={alinhamento(spec)}>
          <ActionCost kind={kind} count={Number.isFinite(count) ? count : null} />
        </span>
      );
    }
  }
}

function alinhamento(spec: ColumnSpec): string | undefined {
  return spec.align === 'end' ? styles['end'] : undefined;
}
