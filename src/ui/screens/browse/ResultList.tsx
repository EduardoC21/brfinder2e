import { useEffect, useRef } from 'react';

import {
  fieldList,
  fieldValue,
  fitTraits,
  rarityLetter,
  traitSpace,
  type BrowseEntity,
  type ColumnSpec,
} from '@core/browse/index';
import { strings } from '@i18n/index';
import { ActionCost } from '@ui/components/ActionCost';
import { Frequency } from '@ui/components/Frequency';
import { RarityMark } from '@ui/components/RarityMark';
import { cx } from '@ui/cx';
import { useTrackWidth } from '@ui/hooks/useTrackWidth';

import { columnLabel } from './filterLabels';
import styles from './ResultList.module.css';

/** Quais dados fixos estão ligados nesta fonte, depois da escolha do usuário. */
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
 * ⚠️ UMA grade para o cabeçalho e para todas as linhas.
 *
 * Havia duas: o cabeçalho numa e as linhas noutra, com o mesmo molde de trilhas. Mas
 * trilha `auto` se dimensiona pelo CONTEÚDO, e o conteúdo era diferente — o cabeçalho
 * media as palavras "nome/traços/setor" e as linhas mediam os valores. Resultado medido:
 * cabeçalho em 32,7 | 58,9 | 58,4 e linhas em 0 | 71,5 | 78,5. Nunca iam alinhar.
 *
 * Agora o `listbox` é `display: contents`: ele some do layout e as células das linhas
 * entram na MESMA grade das células de título.
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
  const trilhaDoNome = useRef<HTMLSpanElement>(null);

  /*
   * UMA medida para a lista inteira: a largura da trilha do nome.
   *
   * É dela que sai quantos traços cabem em cada linha. Uma observação, e não uma por
   * linha — e como o elemento observado É a trilha, a medida já responde a abrir a
   * lateral, arrastar a borda e redimensionar a janela sem saber que isso existe.
   */
  const larguraDoNome = useTrackWidth(trilhaDoNome);

  /*
   * Rola a linha ativa para dentro da vista quando ela muda por teclado. `block: 'nearest'`
   * e não `'center'`: centralizar faz a lista pular meia tela a cada seta, o que
   * desorienta em lista densa.
   */
  useEffect(() => {
    if (activeIndex < 0) return;
    const node = container.current?.querySelector(`[data-indice="${String(activeIndex)}"]`);
    if (node instanceof HTMLElement) node.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  /*
   * O molde das trilhas.
   *
   *   nível     calha estreita e fixa, para os nomes alinharem entre si
   *   nome      `minmax(0, 1fr)` — leva junto a raridade e os traços, colados
   *   demais    `auto`, cada uma do tamanho do conteúdo
   *
   * Raridade e traços NÃO têm trilha: são informação do item, não coluna. Colados ao nome
   * eles acompanham nomes curtos em vez de flutuarem a meia tela de distância.
   */
  const trilhas = [
    specials.level !== null ? '3ch' : null,
    'minmax(0, 1fr)',
    ...columns.map(() => 'auto'),
  ]
    .filter((trilha) => trilha !== null)
    .join(' ');

  return (
    <div className={styles['tabela']} style={{ gridTemplateColumns: trilhas }}>
      {specials.level !== null && <span className={cx(styles['titulo'], styles['nivel'])} />}
      <span ref={trilhaDoNome} className={styles['titulo']}>
        {strings.browse.columnName}
      </span>
      {columns.map((column) => (
        <span key={column.id} className={cx(styles['titulo'], alinhamento(column))}>
          {columnLabel(column)}
        </span>
      ))}

      <div
        ref={container}
        className={styles['corpo']}
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
            larguraDoNome={larguraDoNome}
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
 * grade do avô, que é a única forma de as células de linhas diferentes caírem na mesma
 * trilha. O fundo de seleção e o `hover` vêm das próprias células.
 */
function Linha({
  entity,
  index,
  columns,
  specials,
  larguraDoNome,
  ativa,
  onActivate,
  onOpen,
}: {
  readonly entity: BrowseEntity;
  readonly index: number;
  readonly columns: readonly ColumnSpec[];
  readonly specials: ActiveSpecials;
  readonly larguraDoNome: number;
  readonly ativa: boolean;
  readonly onActivate: (index: number) => void;
  readonly onOpen: (index: number) => void;
}) {
  const nome = fieldValue(entity, 'name');
  const nivel = specials.level === null ? null : fieldValue(entity, specials.level);
  const raridade = specials.rarity === null ? null : fieldValue(entity, specials.rarity);
  const letra = raridade === null ? null : rarityLetter(raridade);

  /* Aritmética, não medição: a largura da trilha veio de uma observação só, lá em cima. */
  const traços =
    specials.traits === null
      ? null
      : fitTraits(
          fieldList(entity, specials.traits),
          traitSpace(larguraDoNome, nome, letra !== null),
        );

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

      {/*
        Nome, raridade e traços na MESMA célula: é o que os mantém colados. Em trilhas
        separadas, um nome curto deixava os traços a meia tela de distância dele.
      */}
      <span className={cx(styles['celula'], styles['nomeCelula'])}>
        <span className={styles['name']}>{nome}</span>

        {letra !== null && raridade !== null && (
          <RarityMark letter={letra} label={rarityTitle(raridade)} />
        )}

        {entity.retiredIn !== undefined && (
          <span className={styles['retired']} title={entity.retiredIn}>
            {strings.browse.retired}
          </span>
        )}

        {traços !== null && (traços.shown.length > 0 || traços.hidden > 0) && (
          <span className={styles['tracos']}>
            {traços.shown.map((trait) => (
              <span key={trait} className={styles['chip']}>
                {trait}
              </span>
            ))}
            {traços.hidden > 0 && (
              /*
                O `title` lista os traços ESCONDIDOS, e não só quantos são.
                "mais 2" obriga a abrir a entrada para saber quais; a lista responde na
                hora, do mesmo jeito que o símbolo de custo responde ao passar o mouse.
              */
              <span
                className={cx(styles['chip'], styles['resto'])}
                title={fieldList(entity, specials.traits ?? '')
                  .slice(traços.shown.length)
                  .join(', ')}
              >
                +{traços.hidden}
              </span>
            )}
          </span>
        )}
      </span>

      {columns.map((column) => (
        <span key={column.id} className={cx(styles['celula'], alinhamento(column))}>
          <Column spec={column} entity={entity} />
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
      return <span className={styles['chip']}>{capitalizar(value)}</span>;
    }

    /*
     * Sim vira SÍMBOLO; não desenha nada.
     *
     * "true" numa coluna não diz nada, e "sim/não" em toda linha gasta espaço para repetir
     * o que a ausência já conta — mesma regra do detalhe. Espera-se que a maioria seja
     * falsa: `onlyLevel1` é verdadeiro em 64 dos 6.284 talentos.
     *
     * Espécie própria, e não um faro dentro do `text`: farejando a string "true", qualquer
     * campo de texto que por acaso valesse isso viraria um check.
     */
    case 'boolean': {
      if (fieldValue(entity, spec.field) !== 'true') return null;
      return (
        <span className={styles['sim']} title={strings.browse.yes}>
          ✓
        </span>
      );
    }

    case 'frequency':
      return <Frequency entity={entity} field={spec.field} />;

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
