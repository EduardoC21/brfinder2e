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

  return (
    <PreferencesProvider>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <TopBar sync={sync} />
        <main style={{ flex: 1, minHeight: 0 }}>
          <BrowseScreen baseVersion={sync.state.stored?.syncedAt ?? null} />
        </main>
      </div>
    </PreferencesProvider>
  );
}
