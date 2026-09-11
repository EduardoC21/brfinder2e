import { useMemo, useState } from 'react';

import { fieldValue, type BrowseEntity, type FullViewSpec, type TabSpec } from '@core/browse/index';
import { parseDescription } from '@core/markup/index';
import { strings } from '@i18n/index';
import { RichText, type RichTextLinks } from '@ui/components/RichText';
import { cx } from '@ui/cx';
import { useDescription } from '@ui/hooks/useDescription';

import type { ReferenceBridge } from './DetailPanel';
import styles from './EntityScreen.module.css';

const t = strings.browse.fullView;

/**
 * A TELA COMPLETA de uma entrada (Etapa 22b).
 *
 * A lista e a lateral saem; a entrada ocupa as duas colunas, com uma barra em cima —
 * Voltar, o nome, a fonte — e as abas à direita, como o Archives of Nethys. O trilho de
 * fontes fica onde está: clicar numa fonte ali é "vai para a lista de X", e sai daqui.
 *
 * É ESTADO da tela de consulta, e não rota: a lista, o filtro e a linha escolhida
 * continuam montados por baixo (o `SourcePane` só troca o que desenha), e o Voltar devolve
 * exatamente o que estava — nada foi destruído para ser refeito.
 *
 * Só a aba de TEXTO existe hoje. A de lista — os talentos da ancestralidade com o filtro
 * travado, e a lateral de sempre para a linha aberta — vem com as fontes que ela lista.
 */
export function EntityScreen({
  entity,
  entityType,
  sourceLabel,
  view,
  reference,
  onBack,
}: {
  readonly entity: BrowseEntity;
  readonly entityType: string;
  readonly sourceLabel: string;
  readonly view: FullViewSpec;
  readonly reference: ReferenceBridge;
  readonly onBack: () => void;
}) {
  const [abaId, setAbaId] = useState(view.tabs[0]?.id ?? '');
  const aba = view.tabs.find((tab) => tab.id === abaId) ?? view.tabs[0];

  return (
    <section
      className={styles['full']}
      aria-label={fieldValue(entity, 'name')}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onBack();
      }}
    >
      <header className={styles['bar']}>
        <button
          type="button"
          className={cx(styles['voltar'], 'chamfer-sm')}
          onClick={onBack}
          title={t.back}
        >
          ‹ {t.back}
        </button>
        <h2 className={styles['nome']}>{fieldValue(entity, 'name')}</h2>
        <span className={styles['fonte']}>{sourceLabel}</span>
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
  const nodes = useMemo(() => (texto === null ? null : parseDescription(texto)), [texto]);

  /*
   * A mesma ponte do painel: só o que resolve vira botão, e cada clique abre um
   * flutuante — aqui não há "navegar no lugar", porque a tela É a entrada.
   */
  const links: RichTextLinks = {
    resolves: (target) => reference.resolve(target) !== null,
    open: (target) => {
      const destino = reference.resolve(target);
      if (destino !== null) reference.onPopOut?.(destino);
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
