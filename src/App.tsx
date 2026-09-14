import { useEffect } from 'react';

import { purgeLegacy } from '@core/store/index';
import { createIndexedDbStore } from '@platform/store-indexeddb';
import { TopBar } from '@ui/components/TopBar';
import { useSync } from '@ui/hooks/useSync';
import { PreferencesProvider } from '@ui/prefs/PreferencesProvider';
import { BrowseScreen } from '@ui/screens/browse/BrowseScreen';

/**
 * A casca.
 *
 * O `useSync` mora aqui, e não na barra, porque duas partes precisam dele: a barra mostra
 * a versão da base, e a tela de consulta precisa saber quando ela mudou para recarregar a
 * lista. Deixá-lo na barra obrigaria a tela a adivinhar.
 *
 * O provedor de preferências envolve tudo pelo mesmo motivo: a largura da lateral, o
 * tamanho do pop-out, as colunas e o último filtro são lidos por componentes distantes,
 * e todos gravam no MESMO documento. Um leitor e um escritor só.
 */
export function App() {
  const sync = useSync();
  /* O que uma versão anterior gravou e esta não lê (o cache do Bergamot) sai ao abrir. */
  useEffect(() => {
    purgeLegacy(createIndexedDbStore()).catch(() => {
      // Sem armazenamento (teste, navegador sem IndexedDB), não há o que varrer.
    });
  }, []);

  return (
    <PreferencesProvider>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <TopBar sync={sync} />
        <main style={{ flex: 1, minHeight: 0 }}>
          <BrowseScreen
            baseVersion={
              sync.state.stored === null
                ? null
                : `${sync.state.stored.syncedAt}#${String(sync.state.stored.revision)}`
            }
          />
        </main>
      </div>
    </PreferencesProvider>
  );
}
