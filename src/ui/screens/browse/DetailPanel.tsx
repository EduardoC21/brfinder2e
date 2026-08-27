import { useEffect, useState } from 'react';

import { fieldValue, type BrowseEntity } from '@core/browse/index';
import { readDesc } from '@core/store/index';
import { isRecord } from '@core/json';
import { strings } from '@i18n/index';
import { createIndexedDbStore } from '@platform/store-indexeddb';

import styles from './DetailPanel.module.css';

const store = createIndexedDbStore();
const t = strings.browse;

/**
 * PROVISÓRIO — a tela de detalhe é a Etapa 8, e a decisão "painel lateral ou tela cheia"
 * está aberta (OPEN-DECISIONS, item 5). Isto existe para o Enter ter para onde levar.
 *
 * A descrição aparece CRUA de propósito, com a marcação `@UUID[...]` à mostra. É honesto
 * e deixa visível exatamente o que a Etapa 7 vai ter que resolver.
 */
export function DetailPanel({ entity }: { readonly entity: BrowseEntity }) {
  const description = useDescription(entity.key);
  const summary = fieldValue(entity, 'summary');
  const group = fieldValue(entity, 'group');

  return (
    <aside className={styles['panel']}>
      <h2 className={styles['name']}>{fieldValue(entity, 'name')}</h2>

      <p className={styles['meta']}>
        {group === '' ? '' : `${group} · `}
        {entity.uuid}
        {entity.retiredIn !== undefined && ` · ${t.retired} (${entity.retiredIn})`}
      </p>

      {summary !== '' && <p className={styles['summary']}>{summary}</p>}
      {description !== null && <pre className={styles['raw']}>{description}</pre>}

      <p className={styles['note']}>{t.detailProvisional}</p>
    </aside>
  );
}

/**
 * As descrições moram em `desc/<tipo>`, à parte, por serem pesadas (briefing 5.2).
 *
 * O texto carregado guarda a chave que o produziu, e a troca de entrada é DERIVADA da
 * comparação — limpar com `setText(null)` no começo do efeito provocaria uma renderização
 * em cascata, e a descrição da entrada anterior piscaria na tela da nova.
 */
function useDescription(key: string): string | null {
  const [loaded, setLoaded] = useState<{ key: string; text: string } | null>(null);

  useEffect(() => {
    let alive = true;

    readDesc(store, 'condition')
      .then((all) => {
        if (!alive || all === null) return;
        const entry = all[key];
        if (!isRecord(entry)) return;
        const main = entry['main'];
        if (typeof main === 'string') setLoaded({ key, text: main });
      })
      .catch(() => {
        // Sem descrição gravada o painel simplesmente não a mostra.
      });

    return () => {
      alive = false;
    };
  }, [key]);

  return loaded?.key === key ? loaded.text : null;
}
