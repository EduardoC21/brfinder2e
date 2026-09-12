import { useMemo, useState } from 'react';

import {
  contextFor,
  fieldValue,
  type BrowseEntity,
  type DetailFieldSpec,
  type FullViewSpec,
  type TabSpec,
} from '@core/browse/index';
import { parseDescription, pruneForReading } from '@core/markup/index';
import { strings } from '@i18n/index';
import { CollapseToggle } from '@ui/components/CollapseToggle';
import { RichText, type RichTextLinks } from '@ui/components/RichText';
import { cx } from '@ui/cx';
import { useDescription } from '@ui/hooks/useDescription';

import { DetailPane } from './DetailPane';
import type { ReferenceBridge } from './DetailPanel';
import styles from './EntityScreen.module.css';

const t = strings.browse.fullView;
const d = strings.browse.detail;

/**
 * A TELA COMPLETA de uma entrada (Etapa 22b, redesenhada na 22c).
 *
 * A barra vai da área central até a lateral direita: Voltar, nome, fonte, e as abas à
 * direita. Debaixo dela, DUAS colunas: a prosa ocupa o lugar da lista, e o painel lateral
 * — o mesmo de sempre, com a mecânica em campos — fica onde sempre esteve. O trilho de
 * fontes não participa: clicar numa fonte ali é "vai para a lista de X", inclusive na
 * fonte já aberta.
 *
 * É ESTADO da tela de consulta, e não rota: a lista, o filtro e a linha escolhida
 * continuam montados por baixo (o `SourcePane` só troca o que desenha), e o Voltar
 * devolve exatamente o que estava.
 *
 * Só a aba de TEXTO existe hoje. A de lista — os talentos da ancestralidade com o filtro
 * travado — vem com as fontes que ela lista; nela a lateral é a da linha aberta.
 */
export function EntityScreen({
  entity,
  entityType,
  fields,
  sourceLabel,
  view,
  reference,
  onPopOut,
  onBack,
}: {
  readonly entity: BrowseEntity;
  readonly entityType: string;
  readonly fields: readonly DetailFieldSpec[];
  readonly sourceLabel: string;
  readonly view: FullViewSpec;
  readonly reference: ReferenceBridge;
  readonly onPopOut: () => void;
  readonly onBack: () => void;
}) {
  const [abaId, setAbaId] = useState(view.tabs[0]?.id ?? '');
  const aba = view.tabs.find((tab) => tab.id === abaId) ?? view.tabs[0];
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
        {/*
          O Voltar com a cara dos botões de recolher: é o padrão que a tela já tem para
          "isto sai daqui", e um botão de texto ao lado do nome brigava com ele.
        */}
        <CollapseToggle side="left" collapsed={false} label={t.back} onToggle={onBack} />
        <h2 className={styles['nome']}>{fieldValue(entity, 'name')}</h2>
        <span className={styles['fonte']}>{sourceLabel}</span>
        {/* O mesmo botão de tradução da lateral, no mesmo estado: à espera da Etapa 15. */}
        <button
          type="button"
          className={cx(styles['traduzir'], 'chamfer-sm')}
          disabled
          title={d.translationPending}
        >
          {d.translate}
        </button>
        <nav className={styles['abas']} role="tablist">
          {view.tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={tab.id === aba?.id}
              className={cx(styles['aba'], tab.id === aba?.id && styles['ativa'], 'chamfer-sm')}
              onClick={() => {
                setAbaId(tab.id);
                setLateralFechada(false);
              }}
            >
              {t.tabs[tab.id] ?? tab.id}
            </button>
          ))}
        </nav>
      </header>

      {aba !== undefined && (
        <PageTab entity={entity} entityType={entityType} tab={aba} reference={reference} />
      )}

      {/*
        A lateral de sempre, com a mecânica em campos — o que o painel mostra na lista. O
        `key` na aba: trocar de aba é trocar de assunto, e a lateral acompanha.
      */}
      <DetailPane
        key={aba?.id}
        entity={entity}
        entityType={entityType}
        fields={fields}
        onPopOut={onPopOut}
        reference={reference}
        collapsed={lateralFechada}
        onToggleCollapsed={() => {
          setLateralFechada((estava) => !estava);
        }}
      />
    </section>
  );
}

/** A aba de texto: uma descrição inteira de `desc/`, com a prosa clicável como no painel. */
function PageTab({
  entity,
  entityType,
  tab,
  reference,
}: {
  readonly entity: BrowseEntity;
  readonly entityType: string;
  readonly tab: TabSpec;
  readonly reference: ReferenceBridge;
}) {
  const texto = useDescription(entityType, entity.key, tab.field);
  const nodes = useMemo(
    () => (texto === null ? null : pruneForReading(parseDescription(texto))),
    [texto],
  );

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
      reference.onPopOut?.(contexto === null ? destino : { ...destino, context: contexto });
    },
    embed: (target) => {
      const alvo = reference.resolve(target);
      return alvo === null ? null : { type: alvo.entityType, key: alvo.entity.key };
    },
  };

  return (
    <div className={styles['corpo']} role="tabpanel">
      {nodes !== null && (
        <div className={styles['pagina']}>
          <RichText nodes={nodes} links={links} />
        </div>
      )}
    </div>
  );
}
