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
import { displayName, translatedLabel } from '@ui/text';
import { sourceHash, type Translation } from '@core/store/index';
import { useDescriptionFields } from '@ui/hooks/useDescription';
import type { LoadedSource } from '@ui/hooks/useAllBases';
import { useHasLlmKey, useStoredTranslations, useTranslate } from '@ui/hooks/useTranslation';
import { usePreferences } from '@ui/prefs/usePreferences';

import { DetailPane } from './DetailPane';
import type { ReferenceBridge } from './DetailPanel';
import type { PopoutSubject } from './popouts';
import { TranslationEditor } from './TranslationEditor';
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
  /* O editor de tradução da página (Etapa 43). */
  const [editando, setEditando] = useState(false);
  /* O nome como a preferência manda (Etapa 36). */
  const nome = displayName(entityType, fieldValue(entity, 'name'));

  /*
   * A TRADUÇÃO da tela (Etapa 35, pelo autor: "o central e a lateral traduzidos quando
   * clicado no botão da tela inteira"). O botão do canto é o único: cobre a página (ou a
   * reserva dela), o apêndice e as tabelas da lateral — a lateral não tem botão próprio
   * aqui. Os textos vêm de `desc/` numa leitura só; a tradução gravada, por campo.
   */
  const abaDePagina = aba?.tab.kind === 'page' ? aba.tab : null;
  const camposDaTela = useMemo(() => {
    const campos: string[] = [];
    if (abaDePagina !== null) {
      campos.push(abaDePagina.field);
      if (abaDePagina.fallback !== undefined) campos.push(abaDePagina.fallback);
      if (abaDePagina.appendix !== undefined) campos.push(abaDePagina.appendix.field);
    }
    for (const tab of lateral?.tabs ?? []) if (tab.kind === 'table') campos.push(tab.field);
    return [...new Set(campos)];
  }, [abaDePagina, lateral]);
  const textos = useDescriptionFields(entityType, entity.key, camposDaTela);
  const gravadas = useStoredTranslations(entityType, entity.key);
  const { prefs } = usePreferences();
  const tradutor = useTranslate();
  const temChave = useHasLlmKey();
  const [verTraducao, setVerTraducao] = useState(prefs.translation.display === 'translated');
  const [entradaDaTraducao, setEntradaDaTraducao] = useState(entity.key);
  if (entradaDaTraducao !== entity.key) {
    setEntradaDaTraducao(entity.key);
    setVerTraducao(prefs.translation.display === 'translated');
  }
  /* A versátil não tem página de jornal: a aba cai no resumo, que é o que ela tem. */
  const campoDaPagina =
    abaDePagina === null
      ? null
      : textos !== null && textos[abaDePagina.field] !== ''
        ? abaDePagina.field
        : (abaDePagina.fallback ?? abaDePagina.field);
  const traducaoDaPagina = campoDaPagina === null ? null : (gravadas[campoDaPagina] ?? null);
  const mostrando = traducaoDaPagina !== null && verTraducao;
  const vista = (campo: string | null | undefined): string | null =>
    campo === undefined || campo === null || textos === null
      ? null
      : mostrando
        ? (gravadas[campo]?.html ?? textos[campo] ?? null)
        : (textos[campo] ?? null);
  const traduzirTela = (): void => {
    if (textos === null) return;
    /* Quem pediu para traduzir quer VER a tradução, seja qual for a preferência. */
    setVerTraducao(true);
    tradutor.translate(
      entityType,
      entity.key,
      camposDaTela
        .filter((campo) => campo !== abaDePagina?.fallback || campo === campoDaPagina)
        .map((campo) => ({ field: campo, html: textos[campo] ?? '' })),
    );
  };

  return (
    <section
      className={styles['full']}
      aria-label={nome}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onBack();
      }}
    >
      <header className={styles['bar']}>
        <CollapseToggle side="left" collapsed={false} label={t.back} onToggle={onBack} />
        <h2 className={styles['nome']}>{nome}</h2>
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
                {label === null ? (t.tabs[tab.id] ?? tab.id) : displayName('feature', label)}
                {count !== null && <span className={styles['contagem']}>{count}</span>}
              </button>
            ))}
          </nav>
        </ScrollRail>
        {abaDePagina !== null && (
          <button
            type="button"
            className={cx(styles['traduzir'], 'chamfer-sm')}
            disabled={
              tradutor.state.status === 'busy' ||
              textos === null ||
              (traducaoDaPagina === null && temChave !== true)
            }
            title={
              tradutor.state.status === 'error'
                ? tradutor.state.message
                : traducaoDaPagina === null && temChave !== true
                  ? strings.settings.translation.llm.noKey
                  : undefined
            }
            onClick={
              traducaoDaPagina !== null
                ? () => {
                    setVerTraducao((estava) => !estava);
                  }
                : traduzirTela
            }
          >
            {tradutor.state.status === 'busy'
              ? d.translating
              : traducaoDaPagina !== null
                ? mostrando
                  ? d.toggleOriginal
                  : d.toggleTranslated
                : d.translate}
          </button>
        )}
        {abaDePagina !== null && campoDaPagina !== null && textos !== null && (
          <button
            type="button"
            className={cx(styles['traduzir'], styles['editar'], 'chamfer-sm')}
            title={d.editTranslation}
            aria-label={d.editTranslation}
            onClick={() => {
              setEditando(true);
            }}
          >
            ✎
          </button>
        )}
      </header>

      {editando && campoDaPagina !== null && textos !== null && (
        <TranslationEditor
          entityType={entityType}
          entityKey={entity.key}
          field={campoDaPagina}
          title={nome}
          original={textos[campoDaPagina] ?? ''}
          current={
            traducaoDaPagina === null
              ? null
              : { html: traducaoDaPagina.html, method: traducaoDaPagina.method }
          }
          onClose={(saved) => {
            setEditando(false);
            if (saved) setVerTraducao(true);
          }}
        />
      )}

      {aba?.tab.kind === 'page' && (
        <>
          <PageTab
            key={entity.key}
            entity={entity}
            tab={aba.tab}
            page={vista(campoDaPagina)}
            appendix={vista(aba.tab.appendix?.field)}
            translation={
              mostrando && campoDaPagina !== null
                ? {
                    stored: traducaoDaPagina,
                    originalChanged:
                      traducaoDaPagina.sourceHash !== sourceHash(textos?.[campoDaPagina] ?? ''),
                  }
                : null
            }
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
            translationShowing={mostrando}
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
        renderList(aba.tab, aba.entities, `${sourceLabel}: ${nome}`)}
    </section>
  );
}

/** A aba de texto: uma descrição inteira de `desc/`, com a prosa clicável como no painel. */
function PageTab({
  entity,
  tab,
  page,
  appendix,
  translation,
  reference,
  memory,
  memoryKey,
}: {
  readonly entity: BrowseEntity;
  readonly tab: PageTabSpec;
  /** A página (ou a reserva), já na língua vista; `null` até chegar. A tela é quem lê. */
  readonly page: string | null;
  readonly appendix: string | null;
  /** A tradução à vista, para o aviso acima da prosa: de que forma veio, e se o original mudou. */
  readonly translation: { readonly stored: Translation; readonly originalChanged: boolean } | null;
  readonly reference: ReferenceBridge;
  /** A memória de rolagem da tela, e a chave desta aba nela. Ver `EntityScreen`. */
  readonly memory: Map<string, number>;
  readonly memoryKey: string;
}) {
  const nodes = useMemo(
    () => (page === null || page === '' ? null : pruneForReading(parseDescription(page))),
    [page],
  );
  /*
   * O APÊNDICE: o bloco de mecânica do livro, recolhido no fim. A lateral tem os campos,
   * mas há mecânica que só existe como texto (5 das 50 ancestralidades têm uma
   * habilidade que nenhum campo traz), e o autor quer o livro inteiro à mão sem que ele
   * repita a lateral na cara de quem só quer ler a prosa. Nasce fechado; um clique abre.
   */
  const apendiceNodes = useMemo(
    () =>
      tab.appendix === undefined || appendix === null || appendix === ''
        ? null
        : pruneForReading(parseDescription(appendix)),
    [tab.appendix, appendix],
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
    /* Na prosa traduzida, o link mostra o nome traduzido do alvo (Etapa 39). */
    label: (target, label) => {
      if (translation === null) return label;
      const alvo = reference.resolve(target);
      return alvo === null
        ? label
        : translatedLabel(alvo.entityType, fieldValue(alvo.entity, 'name'), label);
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
      {/* O aviso de tradução, como na lateral: a forma, e se o original mudou desde então. */}
      {translation !== null && (
        <p className={styles['avisoTraducao']}>
          {d.translatedBy(
            strings.settings.translation.methods[translation.stored.method]?.name ??
              translation.stored.method,
          )}
          {translation.originalChanged && ` · ${d.originalChanged}`}
        </p>
      )}
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
