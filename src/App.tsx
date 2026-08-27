import { strings } from '@i18n/index';

export function App() {
  return (
    <main style={{ padding: 'var(--space-6)' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', margin: 0 }}>{strings.app.name}</h1>
      <p style={{ color: 'var(--color-text-muted)', marginTop: 'var(--space-2)' }}>
        {strings.app.tagline}
      </p>
      <p style={{ marginTop: 'var(--space-6)' }}>{strings.skeleton.description}</p>
    </main>
  );
}
