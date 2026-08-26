import { textos } from '@idiomas/index';

export function App() {
  return (
    <main style={{ padding: 'var(--espaco-8)' }}>
      <h1 style={{ fontFamily: 'var(--fonte-titulo)', margin: 0 }}>{textos.app.nome}</h1>
      <p style={{ color: 'var(--cor-texto-fraco)', marginTop: 'var(--espaco-2)' }}>
        {textos.app.subtitulo}
      </p>
      <p style={{ marginTop: 'var(--espaco-6)' }}>{textos.esqueleto.descricao}</p>
    </main>
  );
}
