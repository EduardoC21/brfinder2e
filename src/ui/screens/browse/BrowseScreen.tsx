import { useDeferredValue, useEffect, useMemo, useReducer, useRef, useState } from 'react';

import {
  SOURCES,
  applyFilters,
  columnsInScope,
  filtersInScope,
  presetFor,
  scopeKey,
  selectedTypes,
  createSearchIndex,
  firstReadySource,
  fieldValue,
  sortEntities,
  DEFAULT_SORT,
  type Sort,
  type BrowseEntity,
  type FilterState,
  type SourceSpec,
} from '@core/browse/index';
import { sourcePreferences, withLayout, withSource } from '@core/prefs/index';
import { strings } from '@i18n/index';
import { FloatingPanel } from '@ui/components/FloatingPanel';
import type { LoadedSource } from '@ui/hooks/useAllBases';
import { SearchInput } from '@ui/components/SearchInput';
import { useAllBases } from '@ui/hooks/useAllBases';
import { useBase } from '@ui/hooks/useBase';
import { useGlobalIndex } from '@ui/hooks/useGlobalIndex';
import { useNarrowScreen } from '@ui/hooks/useNarrowScreen';
import { usePreferences } from '@ui/prefs/usePreferences';

import { DetailPane } from './DetailPane';
import { FilterBar } from './FilterBar';
import { GlobalSearch } from './GlobalSearch';
import { ColumnPicker } from './ColumnPicker';
import { FilterTopicPanel } from './FilterTopicPanel';
import { ResultList } from './ResultList';
import { SourceRail } from './SourceRail';
import { DetailPanel } from './DetailPanel';
import { EMPTY_POPOUTS, popoutReducer, type PopoutSubject } from './popouts';
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

  const { prefs, update } = usePreferences();

  /*
   * O trilho recolhe SOZINHO em tela estreita, e isso não vira preferência.
   *
   * São coisas diferentes: "eu quero ele fechado" é escolha e fica gravada; "não cabe
   * agora" é circunstância e passa quando a janela cresce. Guardar a segunda como se
   * fosse a primeira faria o trilho continuar fechado depois, sem ninguém ter pedido.
   *
   * 900px é 190 do trilho + 260 de lista + 450 de painel, que é o mínimo em que os três
   * ainda são utilizáveis ao mesmo tempo.
   */
  const telaEstreita = useNarrowScreen(900);
  const trilhoRecolhido = prefs.layout.railCollapsed || telaEstreita;

  const alternarTrilho = (): void => {
    update((atual) => withLayout(atual, { railCollapsed: !trilhoRecolhido }));
  };

  /*
   * Os flutuantes e a paleta moram AQUI, e não no painel da fonte.
   *
   * O painel remonta ao trocar de fonte (é o que a `key` garante), e a busca global abre
   * coisa de qualquer fonte: um flutuante de magia aberto enquanto a tela mostra talentos
   * morreria no instante em que a pessoa trocasse de fonte. Aqui em cima, nada remonta.
   */
  const [popouts, despacharPopout] = useReducer(popoutReducer, EMPTY_POPOUTS);
  const [paletaAberta, setPaletaAberta] = useState(false);
  const [buscaNaDescricao, setBuscaNaDescricao] = useState(false);

  /*
   * As bases e os índices da paleta moram AQUI, e não dentro dela.
   *
   * A paleta é desmontada ao fechar — é o que garante que o campo nasça vazio e que a
   * medição de largura veja um nó de verdade. Se os índices morassem lá, cada Ctrl+Q
   * pagaria uma leitura do IndexedDB e, com a busca por descrição ligada, 794 ms de
   * indexação. Aqui em cima eles sobrevivem entre uma abertura e outra.
   */
  /*
   * As bases carregam para a paleta E para a referência cruzada.
   *
   * Perícia é a primeira fonte que APONTA para outra: as ações dela moram em Ações, e sem
   * a base de ações carregada o clique não abre nada. `useAllBases` já guarda o resultado,
   * então abrir a paleta depois não relê nada.
   */
  const precisaDeTodas = paletaAberta || (source?.crossReferences ?? false);
  const bases = useAllBases(precisaDeTodas, baseVersion);
  const carregadas = useMemo(() => (bases.status === 'ready' ? bases.sources : VAZIAS), [bases]);
  const indiceGlobal = useGlobalIndex(carregadas, buscaNaDescricao);

  /*
   * Ctrl+Q escutado na JANELA, e não num elemento: uma paleta global tem de abrir de onde
   * quer que o foco esteja — inclusive de dentro do campo de busca da lista.
   */
  useEffect(() => {
    const aoTeclar = (event: KeyboardEvent): void => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'q') {
        event.preventDefault();
        setPaletaAberta((estava) => !estava);
      }
    };
    window.addEventListener('keydown', aoTeclar);
    return () => {
      window.removeEventListener('keydown', aoTeclar);
    };
  }, []);

  const abrirFlutuante = (subject: PopoutSubject): void => {
    despacharPopout({ kind: 'open', ...subject });
  };

  /**
   * Abre a entrada apontada por um `@UUID`, venha ela de que fonte for.
   *
   * É a primeira ponte entre fontes do aplicativo: a perícia guarda o UUID da ação, e quem
   * sabe resolvê-lo é esta tela, que tem todas as bases. Referência que não resolve não faz
   * nada — e não deveria acontecer: o teste de contrato prende as 50 da tabela de perícias.
   */
  const abrirReferencia = (uuid: string): void => {
    const alvo = indiceGlobal.byUuid.get(uuid);
    if (alvo === undefined) return;
    abrirFlutuante({
      entity: alvo.entity,
      entityType: alvo.source.entityType ?? '',
      fields: alvo.source.detail,
    });
  };

  return (
    <div className={styles['screen']}>
      <SourceRail
        sources={SOURCES}
        currentId={sourceId}
        currentCount={entities.length}
        collapsed={trilhoRecolhido}
        onToggle={alternarTrilho}
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
          onPopOut={abrirFlutuante}
          onOpenReference={abrirReferencia}
        />
      )}

      {paletaAberta && (
        <GlobalSearch
          index={indiceGlobal}
          sources={carregadas}
          loading={bases.status !== 'ready'}
          inText={buscaNaDescricao}
          onInText={setBuscaNaDescricao}
          onClose={() => {
            setPaletaAberta(false);
          }}
          onOpenEntry={abrirFlutuante}
        />
      )}

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
          {/*
            Sem `onCollapse` e sem `onPopOut`: o flutuante não recolhe (ele fecha, pelo ×
            da própria barra de título) e não se destaca de novo. Ausência de callback é o
            que apaga cada botão — o painel não pergunta onde está.
          */}
          <DetailPanel entity={item.entity} entityType={item.entityType} fields={item.fields} />
        </FloatingPanel>
      ))}
    </div>
  );
}

const EMPTY: readonly BrowseEntity[] = [];
const VAZIAS: readonly LoadedSource[] = [];

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
  onPopOut,
  onOpenReference,
}: {
  readonly source: SourceSpec;
  readonly entities: readonly BrowseEntity[];
  readonly loading: boolean;
  readonly onPopOut: (subject: PopoutSubject) => void;
  readonly onOpenReference: (uuid: string) => void;
}) {
  const [term, setTerm] = useState('');
  const { prefs, update, ready } = usePreferences();
  /*
   * Memoizado porque o resultado alimenta as dependências do `useMemo` da lista.
   * Sem isso o compilador do React não consegue provar que `filters` é estável e desiste
   * de otimizar o componente inteiro — inclusive a filtragem das 766 linhas.
   */
  const salvas = useMemo(() => sourcePreferences(prefs, source.id), [prefs, source.id]);

  /*
   * O filtro vive na PREFERÊNCIA, não num `useState` local.
   *
   * Antes era estado do componente, e a `key` da tela o descartava ao trocar de fonte —
   * que era o comportamento certo enquanto ele não persistia. Agora ele volta: guardar por
   * fonte é o que faz "voltar em Ações" reencontrar o recorte de ontem sem refazer.
   */
  const filters = salvas.filters;
  const setFilters = (next: FilterState): void => {
    update((atual) => withSource(atual, source.id, { filters: next }));
  };

  /** O que está aberto na lateral por cima do detalhe: um tópico, as colunas, ou nada. */
  const [overlay, setOverlay] = useState<
    { kind: 'topic'; id: string } | { kind: 'columns' } | null
  >(null);

  /**
   * O painel de detalhe é DERIVADO, não gravado.
   *
   * Ele está aberto quando há o que mostrar — uma entrada escolhida ou uma camada aberta —
   * e o usuário não o fechou. Nada disso vira preferência, e é o que conserta a página
   * abrindo com o painel escancarado e vazio: a escolha sobrevivia ao recarregamento e a
   * seleção não.
   *
   * `fechadoAMao` volta a `false` sozinho toda vez que aparece algo novo para mostrar, e
   * por isso não precisa ser desfeito em lugar nenhum.
   */
  const [fechadoAMao, setFechadoAMao] = useState(false);

  const mostrarCamada = (proxima: typeof overlay): void => {
    setOverlay(proxima);
    if (proxima !== null) setFechadoAMao(false);
  };
  const [activeIndex, setActiveIndex] = useState(-1);
  const [openedKey, setOpenedKey] = useState<string | null>(null);
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

  /*
   * A ordem é estado da TELA, e não preferência gravada.
   *
   * Ordenar é um gesto de leitura do momento — "quero ver os de nível alto agora" —, e não
   * uma configuração. Guardá-la faria a lista abrir amanhã numa ordem que a pessoa não
   * lembra ter pedido. Volta ao padrão ao trocar de fonte, pelo mesmo motivo.
   */
  const [sort, setSort] = useState<Sort>(DEFAULT_SORT);
  /*
   * Trocar de fonte volta à ordem padrão — ajustado DURANTE o render, e não num efeito.
   *
   * É o idioma do React para "acertar estado quando uma prop muda": o efeito rodaria
   * DEPOIS da tela já ter sido pintada com a ordem antiga, e a lista piscaria na ordem
   * errada antes de se corrigir. Aqui o React descarta este render e refaz, sem pintar.
   */
  const [fonteDaOrdem, setFonteDaOrdem] = useState(source.id);
  if (fonteDaOrdem !== source.id) {
    setFonteDaOrdem(source.id);
    setSort(DEFAULT_SORT);
  }

  const results = useMemo(() => {
    const filtered = applyFilters(entities, source.filters, filters);
    if (deferredTerm.trim() === '')
      return sortEntities(filtered, sort, source.special.level ?? 'level');

    // Com termo, a ordem é a da RELEVÂNCIA, não a alfabética — e o filtro só recorta.
    const allowed = new Set(filtered.map((entity) => entity.key));
    const byKey = new Map(entities.map((entity) => [entity.key, entity]));
    return index
      .search(deferredTerm)
      .filter((key) => allowed.has(key))
      .map((key) => byKey.get(key))
      .filter((entity): entity is BrowseEntity => entity !== undefined);
  }, [entities, source.filters, filters, source.special.level, deferredTerm, index, sort]);

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
    setFechadoAMao(false);
  };

  /*
   * O RECORTE POR TIPO. Ver `core/browse/scope.ts` para a regra.
   *
   * Com um Tipo marcado, só as colunas e os filtros daquele Tipo aparecem, e o preset dele
   * liga sozinho; com vários, só o que eles têm em comum; com nenhum, só o universal. É o
   * que desfaz as vinte e duas colunas de equipamento — nove conjuntos empilhados que
   * ninguém precisa ver juntos.
   */
  const tiposMarcados = useMemo(() => selectedTypes(source, filters), [source, filters]);
  const colunasNoEscopo = useMemo(
    () => columnsInScope(source, tiposMarcados),
    [source, tiposMarcados],
  );
  const filtrosNoEscopo = useMemo(
    () => filtersInScope(source, tiposMarcados),
    [source, tiposMarcados],
  );
  const escopo = scopeKey(tiposMarcados);

  const openTopic = overlay?.kind === 'topic' ? overlay.id : null;
  const topicoAberto = filtrosNoEscopo.find((spec) => spec.id === openTopic);

  /*
   * As colunas visíveis: a escolha do usuário PARA ESTE RECORTE, ou o preset dele.
   *
   * `ready` importa aqui — antes da leitura terminar as preferências estão vazias, e usar
   * o padrão nesse instante evitaria o piscar, mas gravaria o padrão por cima da escolha
   * dele se ele mexesse rápido demais.
   *
   * `?? ` e não `.length > 0`: `[]` é uma escolha legítima ("nenhuma coluna"), e tratá-la
   * como ausência ressuscitava a coluna que o usuário acabara de desmarcar.
   */
  const gravadas = escopo === '' ? salvas.columns : (salvas.columnsByType[escopo] ?? null);
  const idsVisiveis =
    (ready ? gravadas : null) ?? presetFor(source, tiposMarcados) ?? source.defaultColumns;
  const colunasVisiveis = idsVisiveis
    .map((id) => colunasNoEscopo.find((column) => column.id === id))
    .filter((column) => column !== undefined);

  /** Grava a escolha de colunas no recorte em vigor, e não por cima do geral. */
  const gravarColunas = (columns: readonly string[] | null): void => {
    update((atual) =>
      escopo === ''
        ? withSource(atual, source.id, { columns })
        : withSource(atual, source.id, {
            columnsByType: {
              ...sourcePreferences(atual, source.id).columnsByType,
              [escopo]: columns,
            },
          }),
    );
  };

  /*
   * As especiais ligadas: as que a fonte TEM, menos as que o usuário desligou.
   *
   * Guardamos o que está desligado, e não o que está ligado — assim a ausência de
   * preferência já significa "todas ligadas", e uma especial nova nasce visível.
   */
  const escondidas = ready ? salvas.hiddenSpecials : [];
  const especiaisAtivas = {
    level: escondidas.includes('level') ? null : source.special.level,
    rarity: escondidas.includes('rarity') ? null : source.special.rarity,
    traits: escondidas.includes('traits') ? null : source.special.traits,
  };

  /**
   * O teclado da lista, ouvido na ÁREA INTEIRA — busca, barra de filtros e lista.
   *
   * O briefing (Anexo A) pede "digita, desce com as setas, abre com Enter, sem tocar no
   * mouse", e por isso o foco continua no campo: se ele pulasse para a lista na primeira
   * seta, continuar digitando exigiria voltar. A lista segue comandada por
   * `aria-activedescendant`.
   *
   * O que mudou é ONDE o teclado é ouvido. Estava só no `<input>`, e bastava clicar no
   * corpo da lista — que é `tabIndex={-1}` e portanto RECEBE foco ao ser clicado — para as
   * setas pararem de andar de linha em linha e voltarem a só rolar a caixa. Ouvindo na
   * área inteira, o evento chega aqui por borbulhamento venha de onde vier.
   *
   * Botão é exceção: o cabeçalho ordenável e os tópicos de filtro respondem a Enter por
   * conta própria, e sequestrá-lo abriria uma entrada em vez de acionar o botão.
   */
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (results.length === 0) return;
    if (event.target instanceof HTMLElement && event.target.closest('button') !== null) return;

    /*
     * A seta MOSTRA; o Enter escolhe.
     *
     * Andar de linha em linha já troca o que está na lateral — sem isso era preciso apertar
     * Enter a cada passo para ver onde se está, o que transforma percorrer dez magias em
     * vinte teclas. A diferença que sobra para o Enter é a CAMADA: ele fecha o painel de
     * filtro aberto por cima do detalhe, e a seta não. Fechá-lo a cada seta tiraria da tela
     * justamente o filtro que a pessoa está montando.
     *
     * E a seta NÃO desfaz o recolher: quem fechou a lateral à mão continua com ela fechada.
     */
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      const seguinte = activeIndex + step;
      const proximo = seguinte < 0 ? results.length - 1 : seguinte >= results.length ? 0 : seguinte;
      setActiveIndex(proximo);
      const escolhida = results[proximo];
      if (escolhida) setOpenedKey(escolhida.key);
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
        available={colunasNoEscopo}
        selected={idsVisiveis}
        noPadrao={gravadas === null && salvas.hiddenSpecials.length === 0}
        special={source.special}
        hiddenSpecials={escondidas}
        onToggleSpecial={(id) => {
          update((atual) => {
            const atuais = sourcePreferences(atual, source.id).hiddenSpecials;
            return withSource(atual, source.id, {
              hiddenSpecials: atuais.includes(id)
                ? atuais.filter((entry) => entry !== id)
                : [...atuais, id],
            });
          });
        }}
        onChange={gravarColunas}
        onReset={() => {
          // `null` devolve o recorte ao preset dele; `[]` seria "nenhuma coluna".
          gravarColunas(null);
          update((atual) => withSource(atual, source.id, { hiddenSpecials: [] }));
        }}
        onClose={() => {
          mostrarCamada(null);
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
          mostrarCamada(null);
        }}
      />
    );

  return (
    <>
      {/*
        `tabIndex={-1}` na área inteira, e é o que faz as setas funcionarem depois de um
        clique em espaço vazio.

        Sem ele, clicar fora de uma linha ou de um botão manda o foco para o `<body>` — e
        dali o `keydown` não passa por este `<div>` nunca. Com ele, o navegador procura o
        ancestral focável mais próximo do que foi clicado e para aqui. `-1` e não `0`: a
        área não entra na ordem do Tab, que já tem a busca, os filtros e os cabeçalhos.
      */}
      <div className={styles['main']} tabIndex={-1} onKeyDown={onKeyDown}>
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
          />
          <span className={styles['count']}>{t.counting(results.length, entities.length)}</span>
        </div>

        <FilterBar
          specs={filtrosNoEscopo}
          state={filters}
          openTopic={openTopic}
          onOpenTopic={(id) => {
            mostrarCamada(id === null ? null : { kind: 'topic', id });
          }}
          columnsOpen={overlay?.kind === 'columns'}
          onOpenColumns={() => {
            mostrarCamada(overlay?.kind === 'columns' ? null : { kind: 'columns' });
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
              allEntities={entities}
              columns={colunasVisiveis}
              specials={especiaisAtivas}
              activeIndex={activeIndex}
              sort={sort}
              onSort={setSort}
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
        onPopOut={() => {
          if (opened !== null) {
            onPopOut({
              entity: opened,
              entityType: source.entityType ?? '',
              fields: source.detail,
            });
          }
        }}
        onOpenReference={onOpenReference}
        collapsed={fechadoAMao || (opened === null && overlay === null)}
        onToggleCollapsed={() => {
          setFechadoAMao((estava) => !estava);
        }}
        {...(camada === null ? {} : { overlay: camada })}
      />
    </>
  );
}
