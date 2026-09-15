import { Component, type ErrorInfo, type ReactNode } from 'react';

import { strings } from '@i18n/index';

/**
 * A rede de proteção da V1 (varredura da Etapa 58): um erro de render sem isto é uma
 * tela preta sem explicação — e quem está do outro lado é um jogador, não um
 * desenvolvedor. Mostra o que houve e um botão para recarregar. É componente de classe
 * porque `componentDidCatch` só existe assim; é o único do projeto.
 */
export class ErrorBoundary extends Component<
  { readonly children: ReactNode },
  { readonly erro: Error | null }
> {
  override state: { readonly erro: Error | null } = { erro: null };

  static getDerivedStateFromError(erro: Error): { erro: Error } {
    return { erro };
  }

  override componentDidCatch(erro: Error, info: ErrorInfo): void {
    console.error('brfinder2e: erro de render', erro, info.componentStack);
  }

  override render(): ReactNode {
    if (this.state.erro === null) return this.props.children;
    const t = strings.app.crash;
    return (
      <div
        role="alert"
        style={{ padding: 32, maxWidth: 640, margin: '0 auto', fontFamily: 'sans-serif' }}
      >
        <h1 style={{ fontSize: 18 }}>{t.title}</h1>
        <p>{t.description}</p>
        <pre style={{ whiteSpace: 'pre-wrap', opacity: 0.7, fontSize: 12 }}>
          {this.state.erro.message}
        </pre>
        <button
          type="button"
          onClick={() => {
            window.location.reload();
          }}
        >
          {t.reload}
        </button>
      </div>
    );
  }
}
