import { useDeferredValue, useMemo, useReducer, useRef, useState } from 'react';

import {
  SOURCES,
  applyFilters,
  createSearchIndex,
  firstReadySource,
  fieldValue,
  sortByName,
  type BrowseEntity,
  type FilterState,
  type SourceSpec,
} from '@core/browse/index';
import { sourcePreferences, withSource } from '@core/prefs/index';
import { strings } from '@i18n/index';
import { FloatingPanel } from '@ui/components/FloatingPanel';
import { SearchInput } from '@ui/components/SearchInput';
import { useBase } from '@ui/hooks/useBase';
import { usePreferences } from '@ui/prefs/usePreferences';

import { DetailPane } from './DetailPane';
import { FilterBar } from './FilterBar';
import { ColumnPicker } from './ColumnPicker';
import { FilterTopicPanel } from './FilterTopicPanel';
import { ResultList } from './ResultList';
import { SourceRail } from './SourceRail';
import { DetailPanel } from './DetailPanel';
import { EMPTY_POPOUTS, popoutReducer } from './popouts';
import styles from './BrowseScreen.module.css';

interface BrowseScreenProps {
  /** Muda a cada sincronização, e é o que faz a lista recarregar do armazenamento. */
  readonly baseVersion: string | null;
}

const t = strings.browse;

export function BrowseScreen({ baseVersion }: BrowseScreenProps) {
  const [sourceId, setSourceId] = useState(() => firstReadySource()?.id ?? SOURCES[0]?.id ?? '');
  const source = SOURCES.find((entry) => entry.id === sourceId);

  const base = useBase(source?.entityType ?? null, baseVersion);
  const entities = base.status === 'ready' ? base.entities : EMPTY;

  return (
    <div className={styles['screen']}>
      <SourceRail
        sources={SOURCES}
        currentId={sourceId}
        currentCount={entities.length}
        onSelect={setSourceId}
      />

      {source === undefined ? (
        <p className={styles['empty']}>{t.empty}</p>
      ) : (
        <SourcePane
          key={source.id}
          source={source}
          entities={entities}
          loading={base.status === 'loading'}
        />
      )}
    </div>
  );
}

const EMPTY: readonly BrowseEntity[] = [];

/**
 * O painel de uma fonte: busca, filtros, lista e o detalhe provisório.
 *
 * Está separado da tela para que trocar de fonte REMONTE este componente — a `key` na
 * chamada garante isso. Sem remontar, o termo digitado, os filtros e a linha ativa
 * vazariam de uma fonte para a outra, o que é sempre errado.
 */
function SourcePane({
  source,
  entities,
  loading,
}: {
  readonly source: SourceSpec;
  readonly entities: readonly BrowseEntity[];
  readonly loading: boolean;
}) {
  const [term, setTerm] = useState('');
  const { prefs, update, ready } = usePreferences();
  const salvas = sourcePreferences(prefs, source.id);

  /*
   * O filtro vive na PREFERÊNCIA, não num `useState` local.
   *
   * Antes era estado do componente, e a `key` da tela o descartava ao trocar de fonte —
   * que era o comportamento certo enquanto ele não persistia. Agora ele volta: guardar por
   * fonte é o que faz "voltar em Ações" reencontrar o recorte de ontem sem refazer.
   */
  const filters = salvas.filters as FilterState;
  const setFilters = (next: FilterState): void => {
    update((atual) => withSource(atual, source.id, { filters: next }));
  };

  /** O que está aberto na lateral por cima do detalhe: um tópico, as colunas, ou nada. */
  const [overlay, setOverlay] = useState<
    { kind: 'topic'; id: string } | { kind: 'columns' } | null
  >(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [openedKey, setOpenedKey] = useState<string | null>(null);
  /*
   * Os flutuantes são INDEPENDENTES da lateral, e não a moldura alternativa dela.
   *
   * Na primeira versão eram exclusivos, e o resultado era que destacar um poder desligava
   * a lista: clicar noutra entrada trocava o conteúdo do flutuante em vez de alimentar a
   * lateral. Agora o flutuante CONGELA a entrada dele, e a lateral segue viva — que é o
   * que permite comparar dois poderes lado a lado.
   */
  const [popouts, despacharPopout] = useReducer(popoutReducer, EMPTY_POPOUTS);
  const input = useRef<HTMLInputElement>(null);

  /*
   * `useDeferredValue` no termo: o React desenha o campo com a letra nova de imediato e
   * refaz a lista quando puder. Sem isso, digitar rápido numa lista grande engasga a
   * digitação — e a lista vai a 6.283 talentos. Não é debounce: nada é adiado por tempo,
   * e o resultado nunca fica "atrasado", só ganha prioridade menor.
   */
  const deferredTerm = useDeferredValue(term);

  /* O índice é caro de montar; só refaz quando a base ou os campos mudam. */
  const index = useMemo(
    () => createSearchIndex(entities, source.searchFields),
    [entities, source.searchFields],
  );

  const results = useMemo(() => {
    const filtered = applyFilters(entities, source.filters, filters);
    if (deferredTerm.trim() === '') return sortByName(filtered);

    // Com termo, a ordem é a da RELEVÂNCIA, não a alfabética — e o filtro só recorta.
    const allowed = new Set(filtered.map((entity) => entity.key));
    const byKey = new Map(entities.map((entity) => [entity.key, entity]));
    return index
      .search(deferredTerm)
      .filter((key) => allowed.has(key))
      .map((key) => byKey.get(key))
      .filter((entity): entity is BrowseEntity => entity !== undefined);
  }, [entities, source.filters, filters, deferredTerm, index]);

  const opened = results.find((entity) => entity.key === openedKey) ?? null;
  /**
   * Escolher uma entrada FECHA o que estiver por cima da lateral.
   *
   * O painel de filtro cobre o detalhe, então escolher uma entrada com ele aberto não
   * mostrava nada — era preciso fechá-lo à mão para ver o que se acabou de clicar. Clicar
   * numa entrada é dizer "me mostra esta", e a camada de escolha já cumpriu o papel dela.
   */
  const escolher = (key: string): void => {
    setOpenedKey(key);
    setOverlay(null);
  };

  const openTopic = overlay?.kind === 'topic' ? overlay.id : null;
  const topicoAberto = source.filters.find((spec) => spec.id === openTopic);

  /*
   * As colunas visíveis: a escolha do usuário, ou o padrão da fonte enquanto ele não
   * escolheu. `ready` importa aqui — antes da leitura terminar as preferências estão
   * vazias, e usar o padrão nesse instante evitaria o piscar, mas gravaria o padrão por
   * cima da escolha dele se ele mexesse rápido demais.
   *
   * `?? ` e não `.length > 0`: `[]` é uma escolha legítima ("nenhuma coluna"), e tratá-la
   * como ausência ressuscitava a coluna que o usuário acabara de desmarcar.
   */
  const idsVisiveis = (ready ? salvas.columns : null) ?? source.defaultColumns;
  const colunasVisiveis = idsVisiveis
    .map((id) => source.columns.find((column) => column.id === id))
    .filter((column) => column !== undefined);

  /**
   * O teclado vive no campo de busca, não na lista.
   *
   * O briefing (Anexo A) pede: "o usuário digita, desce com as setas, abre com Enter, sem
   * tocar no mouse". Se o foco pulasse para a lista na primeira seta, continuar digitando
   * exigiria voltar — então o foco fica no campo e a lista é comandada por `aria-activedescendant`.
   */
  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (results.length === 0) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((current) => {
        const next = current + step;
        if (next < 0) return results.length - 1;
        if (next >= results.length) return 0;
        return next;
      });
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const chosen = results[activeIndex >= 0 ? activeIndex : 0];
      if (chosen) {
        escolher(chosen.key);
        if (activeIndex < 0) setActiveIndex(0);
      }
      return;
    }

    if (event.key === 'Escape' && term !== '') {
      event.preventDefault();
      setTerm('');
      setActiveIndex(-1);
    }
  };

  /*
   * Fragmento, e não um `<div>` em volta.
   *
   * A lista e o detalhe são COLUNAS IRMÃS da grade da tela. Envolvê-los num elemento
   * criaria uma célula só, e o detalhe voltaria a viver dentro da área da lista — que é
   * exatamente por que a barra de filtros passava por cima dele.
   */
  /*
   * A camada da lateral é UMA: filtro ou colunas, nunca os dois.
   * Montada aqui e passada pronta porque quem sabe quais dados cada painel precisa é esta
   * tela — o `DetailPane` só empresta o espaço.
   */
  const camada =
    overlay === null ? null : overlay.kind === 'columns' ? (
      <ColumnPicker
        available={source.columns}
        selected={idsVisiveis}
        noPadrao={salvas.columns === null}
        onChange={(columns) => {
          update((atual) => withSource(atual, source.id, { columns }));
        }}
        onReset={() => {
          // `null` devolve a fonte ao padrão dela; `[]` seria "nenhuma coluna".
          update((atual) => withSource(atual, source.id, { columns: null }));
        }}
        onClose={() => {
          setOverlay(null);
        }}
      />
    ) : topicoAberto === undefined ? null : (
      <FilterTopicPanel
        spec={topicoAberto}
        entities={entities}
        state={filters}
        onChange={(next) => {
          setFilters(next);
          setActiveIndex(-1);
        }}
        onClose={() => {
          setOverlay(null);
        }}
      />
    );

  return (
    <>
      <div className={styles['main']}>
        <div className={styles['searchRow']}>
          {/*
          Era um <input type="search"> cru aqui, escrito à parte só por causa dos atributos
          de caixa de combinação — e por isso sem o CSS que esconde o × nativo do Chrome.
          Agora é o mesmo SearchInput das outras duas buscas, com a fiação como prop.
        */}
          <SearchInput
            ref={input}
            className={styles['search']}
            label={t.searchLabel}
            placeholder={`${t.searchPlaceholder} ${(strings.sources[source.id] ?? '').toLowerCase()}…`}
            value={term}
            controls={{
              listId: 'lista-de-resultados',
              activeId: activeIndex >= 0 ? `resultado-${String(activeIndex)}` : undefined,
            }}
            onChange={(next) => {
              setTerm(next);
              setActiveIndex(-1);
            }}
            onKeyDown={onKeyDown}
          />
          <span className={styles['count']}>{t.counting(results.length, entities.length)}</span>
        </div>

        <FilterBar
          specs={source.filters}
          state={filters}
          openTopic={openTopic}
          onOpenTopic={(id) => {
            setOverlay(id === null ? null : { kind: 'topic', id });
          }}
          columnsOpen={overlay?.kind === 'columns'}
          onOpenColumns={() => {
            setOverlay((atual) => (atual?.kind === 'columns' ? null : { kind: 'columns' }));
          }}
          onChange={(next) => {
            setFilters(next);
            setActiveIndex(-1);
          }}
        />

        <div className={styles['list']} id="lista-de-resultados">
          {loading ? null : entities.length === 0 ? (
            <p className={styles['empty']}>{t.empty}</p>
          ) : results.length === 0 ? (
            <p className={styles['empty']}>{t.noResults}</p>
          ) : (
            <ResultList
              entities={results}
              columns={colunasVisiveis}
              activeIndex={activeIndex}
              onActivate={(index) => {
                setActiveIndex(index);
                const chosen = results[index];
                if (chosen) escolher(chosen.key);
                input.current?.focus();
              }}
              onOpen={(index) => {
                const chosen = results[index];
                if (chosen) escolher(chosen.key);
              }}
            />
          )}
        </div>
      </div>

      <DetailPane
        entity={opened}
        entityType={source.entityType ?? ''}
        fields={source.detail}
        onClose={() => {
          setOpenedKey(null);
        }}
        onPopOut={() => {
          if (opened !== null) despacharPopout({ kind: 'open', entity: opened });
        }}
        {...(camada === null ? {} : { overlay: camada })}
      />

      {popouts.items.map((item) => (
        <FloatingPanel
          key={item.id}
          title={fieldValue(item.entity, 'name')}
          initial={{ x: item.x, y: item.y }}
          z={item.z}
          onFocus={() => {
            despacharPopout({ kind: 'focus', id: item.id });
          }}
          onClose={() => {
            despacharPopout({ kind: 'close', id: item.id });
          }}
        >
          <DetailPanel
            entity={item.entity}
            entityType={source.entityType ?? ''}
            fields={source.detail}
            onClose={() => {
              despacharPopout({ kind: 'close', id: item.id });
            }}
          />
        </FloatingPanel>
      ))}
    </>
  );
}
