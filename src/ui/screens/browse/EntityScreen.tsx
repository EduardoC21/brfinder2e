import { useLayoutEffect, useMemo, useRef, useState } from 'react';

import {
  contextFor,
  expandChoiceTabs,
  fieldValue,
  lockedEntities,
  type BrowseEntity,
  type DetailFieldSpec,
  type FullViewSpec,
  type ListTabSpec,
  type PageTabSpec,
  type SideSpec,
} from '@core/browse/index';
import { parseDescription, pruneForReading } from '@core/markup/index';
import { strings } from '@i18n/index';
import { CollapseToggle } from '@ui/components/CollapseToggle';
import { ScrollRail } from '@ui/components/ScrollRail';
import { RichText, type RichTextLinks } from '@ui/components/RichText';
import { cx } from '@ui/cx';
import { useDescription } from '@ui/hooks/useDescription';
import type { LoadedSource } from '@ui/hooks/useAllBases';

import { DetailPane } from './DetailPane';
import type { ReferenceBridge } from './DetailPanel';
import type { PopoutSubject } from './popouts';
import styles from './EntityScreen.module.css';

const t = strings.browse.fullView;
const d = strings.browse.detail;

/** Uma aba pronta para a barra: a de texto sem contagem, a de lista com as entradas travadas. */
type Aba =
  | {
      readonly tab: PageTabSpec;
      readonly entities: null;
      readonly count: null;
      readonly label: null;
    }
  | {
      readonly tab: ListTabSpec;
      readonly entities: readonly BrowseEntity[];
      readonly count: number;
      /** O rótulo vindo do DADO (a aba de escolha tem o nome da habilidade); nulo = i18n. */
      readonly label: string | null;
    };

/**
 * A TELA COMPLETA de uma entrada (Etapa 22b, redesenhada na 22c, com abas de lista na 23).
 *
 * A barra vai da área central até a lateral direita: Voltar, nome, fonte, e as abas à
 * direita. Debaixo dela, DUAS colunas: na aba de texto, a prosa ocupa o lugar da lista e
 * o painel lateral — o mesmo de sempre, com a mecânica em campos — fica onde sempre
 * esteve; na aba de LISTA, a lista de outra fonte com o filtro travado nesta entrada, e
 * a lateral é a da linha aberta. O trilho de fontes não participa.
 *
 * É ESTADO da tela de consulta, e não rota: a lista, o filtro e a linha escolhida
 * continuam montados por baixo (o `SourcePane` só troca o que desenha), e o Voltar
 * devolve exatamente o que estava.
 */
export function EntityScreen({
  entity,
  entityType,
  fields,
  side,
  sourceLabel,
  view,
  reference,
  sources,
  onPopOut,
  onBack,
  renderList,
}: {
  readonly entity: BrowseEntity;
  readonly entityType: string;
  readonly fields: readonly DetailFieldSpec[];
  /** A lateral com sub-abas da fonte, quando há. Ver `SideSpec`. */
  readonly side?: SideSpec;
  readonly sourceLabel: string;
  readonly view: FullViewSpec;
  readonly reference: ReferenceBridge;
  /** Todas as bases carregadas: a aba de lista pega a dela daqui. */
  readonly sources: readonly LoadedSource[];
  readonly onPopOut: () => void;
  readonly onBack: () => void;
  /** Quem sabe desenhar uma lista travada é a tela de consulta; a aba só pede. */
  readonly renderList: (
    tab: ListTabSpec,
    entities: readonly BrowseEntity[],
    lock: string,
  ) => React.ReactNode;
}) {
  /*
   * As abas com CONTAGEM, e sem as vazias. A versátil não tem heranças; uma aba
   * "Heranças 0" seria um botão que abre o nada. Calculado aqui porque a aba de texto e a
   * de lista dividem a mesma barra, e é a barra que decide o que aparece.
   */
  const abas = useMemo<readonly Aba[]>(
    () =>
      view.tabs.flatMap((tab): Aba[] => {
        if (tab.kind === 'page') return [{ tab, entities: null, count: null, label: null }];
        const fonte = sources.find((loaded) => loaded.source.id === tab.source);
        if (fonte === undefined) return [];
        /* As abas de ESCOLHA: uma por habilidade-escolha da entrada, com o nome dela. */
        if (tab.kind === 'choices') {
          return expandChoiceTabs(tab, entity, fonte.entities).map((escolha) => ({
            tab: escolha.tab,
            entities: escolha.entities,
            count: escolha.entities.length,
            label: escolha.label,
          }));
        }
        const lookup = (id: string) => sources.find((loaded) => loaded.source.id === id)?.entities;
        const entities = lockedEntities(tab, entity, fonte.entities, lookup);
        return entities.length === 0
          ? []
          : [{ tab, entities, count: entities.length, label: null }];
      }),
    [view.tabs, sources, entity],
  );
  const [abaId, setAbaId] = useState(abas[0]?.tab.id ?? '');
  const aba = abas.find((item) => item.tab.id === abaId) ?? abas[0];
  /*
   * A ROLAGEM de cada aba de texto, lembrada enquanto a entrada está aberta (26c, pelo
   * autor): ir a Habilidades e voltar a Detalhes devolve a altura em que se estava. Um
   * mapa que vive com a tela — mudar a altura não redesenha nada, por isso não é estado
   * que se troca, e não é ref porque render não lê ref: quem lê é o efeito da aba, e
   * quem escreve é o evento de rolar. Morre com a tela (voltar à lista, trocar de
   * fonte). A chave leva a ENTRADA: o pop-out que leva a outra entrada dentro da mesma
   * tela começa do topo, porque o texto é outro.
   */
  const [rolagem] = useState(() => new Map<string, number>());
  /* A lateral com sub-abas SEM a descrição: a página inteira está do lado (26e). */
  const lateral = useMemo(
    () =>
      side === undefined
        ? undefined
        : { tabs: side.tabs.filter((tab) => tab.kind !== 'description') },
    [side],
  );
  /* A lateral recolhe como na lista — e volta ao trocar de aba, que é conteúdo novo. */
  const [lateralFechada, setLateralFechada] = useState(false);

  return (
    <section
      className={styles['full']}
      aria-label={fieldValue(entity, 'name')}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onBack();
      }}
    >
      <header className={styles['bar']}>
        <CollapseToggle side="left" collapsed={false} label={t.back} onToggle={onBack} />
        <h2 className={styles['nome']}>{fieldValue(entity, 'name')}</h2>
        <span className={styles['fonte']}>{sourceLabel}</span>
        {/*
          As abas logo depois da fonte, separadas por um fio vertical — pedido do autor:
          "ao lado de ANCESTRALIDADE, com uma barrinha entre". No canto direito, só o
          Traduzir. Estavam invertidos, e as abas no canto ficavam longe do nome.
        */}
        <span className={styles['fio']} aria-hidden="true" />
        {/*
          As abas num TRILHO que rola com setas (26f, pelo autor): numa janela estreita
          elas eram engolidas pela barra. O mesmo `ScrollRail` dos filtros — setas só
          quando há o que rolar.
        */}
        <ScrollRail className={styles['abasTrilho']} label={t.tabsLabel}>
          <nav className={styles['abas']} role="tablist">
            {abas.map(({ tab, count, label }) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={tab.id === aba?.tab.id}
                className={cx(
                  styles['aba'],
                  tab.id === aba?.tab.id && styles['ativa'],
                  'chamfer-sm',
                )}
                onClick={() => {
                  setAbaId(tab.id);
                  setLateralFechada(false);
                }}
              >
                {label ?? t.tabs[tab.id] ?? tab.id}
                {count !== null && <span className={styles['contagem']}>{count}</span>}
              </button>
            ))}
          </nav>
        </ScrollRail>
        <button
          type="button"
          className={cx(styles['traduzir'], 'chamfer-sm')}
          disabled
          title={d.translationPending}
        >
          {d.translate}
        </button>
      </header>

      {aba?.tab.kind === 'page' && (
        <>
          <PageTab
            key={entity.key}
            entity={entity}
            entityType={entityType}
            tab={aba.tab}
            reference={reference}
            memory={rolagem}
            memoryKey={`${entity.key}/${aba.tab.id}`}
          />
          <DetailPane
            key={aba.tab.id}
            entity={entity}
            entityType={entityType}
            fields={fields}
            {...(lateral === undefined ? {} : { side: lateral })}
            onPopOut={onPopOut}
            reference={reference}
            collapsed={lateralFechada}
            onToggleCollapsed={() => {
              setLateralFechada((estava) => !estava);
            }}
          />
        </>
      )}

      {aba?.tab.kind === 'list' &&
        aba.entities !== null &&
        renderList(aba.tab, aba.entities, `${sourceLabel}: ${fieldValue(entity, 'name')}`)}
    </section>
  );
}

/** A aba de texto: uma descrição inteira de `desc/`, com a prosa clicável como no painel. */
function PageTab({
  entity,
  entityType,
  tab,
  reference,
  memory,
  memoryKey,
}: {
  readonly entity: BrowseEntity;
  readonly entityType: string;
  readonly tab: PageTabSpec;
  readonly reference: ReferenceBridge;
  /** A memória de rolagem da tela, e a chave desta aba nela. Ver `EntityScreen`. */
  readonly memory: Map<string, number>;
  readonly memoryKey: string;
}) {
  const texto = useDescription(entityType, entity.key, tab.field);
  const reserva = useDescription(entityType, entity.key, tab.fallback ?? tab.field);
  /* A versátil não tem página de jornal: a aba cai no resumo, que é o que ela tem. */
  const escolhido = texto !== null && texto !== '' ? texto : reserva;
  const nodes = useMemo(
    () => (escolhido === null ? null : pruneForReading(parseDescription(escolhido))),
    [escolhido],
  );
  /*
   * O APÊNDICE: o bloco de mecânica do livro, recolhido no fim. A lateral tem os campos,
   * mas há mecânica que só existe como texto (5 das 50 ancestralidades têm uma
   * habilidade que nenhum campo traz), e o autor quer o livro inteiro à mão sem que ele
   * repita a lateral na cara de quem só quer ler a prosa. Nasce fechado; um clique abre.
   */
  const apendice = useDescription(entityType, entity.key, tab.appendix?.field ?? tab.field);
  const apendiceNodes = useMemo(
    () =>
      tab.appendix === undefined || apendice === null || apendice === ''
        ? null
        : pruneForReading(parseDescription(apendice)),
    [tab.appendix, apendice],
  );

  /*
   * Devolve a rolagem UMA vez, quando a prosa chega — a descrição vem do armazenamento,
   * e no primeiro render o corpo ainda está vazio e não tem para onde rolar. Layout
   * effect, e não effect: antes de pintar, para não mostrar o topo por um quadro.
   */
  const corpo = useRef<HTMLDivElement>(null);
  const devolvida = useRef(false);
  useLayoutEffect(() => {
    if (devolvida.current || nodes === null || corpo.current === null) return;
    devolvida.current = true;
    corpo.current.scrollTop = memory.get(memoryKey) ?? 0;
  }, [nodes, memory, memoryKey]);

  /*
   * A mesma ponte do painel: só o que resolve vira botão, e cada clique abre um
   * flutuante — aqui não há "navegar no lugar", porque a tela É a entrada.
   */
  const links: RichTextLinks = {
    resolves: (target) => reference.resolve(target) !== null,
    open: (target) => {
      const destino = reference.resolve(target);
      if (destino === null) return;
      // Aberto daqui, o alvo leva o que ESTA entrada diz sobre ele — ver `contextFor`.
      const contexto = contextFor(entity, destino.entityType, destino.entity);
      const assunto: PopoutSubject =
        contexto === null ? destino : { ...destino, context: contexto };
      reference.onPopOut?.(assunto);
    },
    embed: (target) => {
      const alvo = reference.resolve(target);
      return alvo === null ? null : { type: alvo.entityType, key: alvo.entity.key };
    },
  };

  return (
    <div
      className={styles['corpo']}
      role="tabpanel"
      ref={corpo}
      onScroll={(event) => {
        memory.set(memoryKey, event.currentTarget.scrollTop);
      }}
    >
      {nodes !== null && (
        <div className={styles['pagina']}>
          <RichText nodes={nodes} links={links} />
        </div>
      )}
      {/*
        O apêndice ABERTO (28, pelo autor): a prosa toda no centro, como na classe, e sem
        recolher — o botão de recolher da 24 saiu. Um fio, o título na voz dos títulos da
        prosa, e o bloco do livro embaixo.
      */}
      {apendiceNodes !== null && tab.appendix !== undefined && (
        <section className={styles['apendice']}>
          <h2 className={styles['apendiceTitulo']}>
            {t.appendix[tab.appendix.label] ?? tab.appendix.label}
          </h2>
          <div className={cx(styles['pagina'], styles['apendiceCorpo'])}>
            <RichText nodes={apendiceNodes} links={links} />
          </div>
        </section>
      )}
    </div>
  );
}
