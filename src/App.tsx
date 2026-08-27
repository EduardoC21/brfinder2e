import { TopBar } from '@ui/components/TopBar';
import { BrowseScreen } from '@ui/screens/browse/BrowseScreen';
import { useSync } from '@ui/hooks/useSync';

/**
 * A casca.
 *
 * O `useSync` mora aqui, e não na barra, porque duas partes precisam dele: a barra mostra
 * a versão da base, e a tela de consulta precisa saber quando ela mudou para recarregar a
 * lista. Deixá-lo na barra obrigaria a tela a adivinhar.
 */
export function App() {
  const sync = useSync();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TopBar sync={sync} />
      <main style={{ flex: 1, minHeight: 0 }}>
        <BrowseScreen baseVersion={sync.state.stored?.syncedAt ?? null} />
      </main>
    </div>
  );
}
