import { TopBar } from '@ui/components/TopBar';

/**
 * A casca. Barra de topo e, abaixo, a área de conteúdo — vazia até a Etapa 5, quando a
 * tela de busca entra.
 */
export function App() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TopBar />
      <main style={{ flex: 1, minHeight: 0 }} />
    </div>
  );
}
