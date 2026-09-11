/**
 * A descrição de UMA entrada, lida de `desc/<tipo>`.
 *
 * Saiu do `DetailPanel` na Etapa 20b porque o `@Embed` precisa do mesmo: a página de
 * Hexploration cola a descrição da ação Travel dentro dela, e é esta leitura que a traz.
 *
 * As descrições moram à parte da base por serem pesadas (briefing 5.2); a leitura é por
 * tipo inteiro, e o navegador guarda o JSON em cache — abrir dez ações da mesma lista
 * custa uma leitura.
 */

import { isRecord } from '@core/json';
import { readDesc } from '@core/store/index';
import { createIndexedDbStore } from '@platform/store-indexeddb';
import { useEffect, useState } from 'react';

const store = createIndexedDbStore();

/** `field` é o campo de `desc/`: `main` é a descrição; `page`, a página do jornal (22b). */
export function useDescription(type: string, key: string, field = 'main'): string | null {
  const [loaded, setLoaded] = useState<{ token: string; text: string } | null>(null);
  const token = `${type}/${key}/${field}`;

  useEffect(() => {
    let alive = true;
    readDesc(store, type)
      .then((all) => {
        if (!alive || all === null) return;
        const entry = all[key];
        if (!isRecord(entry)) return;
        const texto = entry[field];
        if (typeof texto === 'string') setLoaded({ token, text: texto });
      })
      .catch(() => {
        // Sem descrição gravada, quem chamou mostra só o que tem.
      });
    return () => {
      alive = false;
    };
  }, [type, key, field, token]);

  return loaded?.token === token ? loaded.text : null;
}
