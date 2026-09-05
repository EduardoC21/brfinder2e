/**
 * Preparo do ambiente de teste da camada de UI (projeto "ui" no vite.config.ts).
 * O core NÃO carrega este arquivo — ele roda em Node puro.
 */
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Desmonta o que ficou na tela entre um teste e outro.
afterEach(() => {
  cleanup();
});

/**
 * `ResizeObserver` não existe no jsdom.
 *
 * O substituto é inerte de propósito: o jsdom não faz layout, então toda medida seria
 * zero e um polyfill de verdade não mediria nada. Componentes que observam tamanho
 * continuam montando e desmontando sem quebrar, e o que depende de medida real é
 * verificado no navegador, não aqui.
 */
class ResizeObserverStub {
  observe(): void {
    // inerte
  }
  unobserve(): void {
    // inerte
  }
  disconnect(): void {
    // inerte
  }
}

// O tipo diz que sempre existe, porque as libs do DOM o declaram; em jsdom, não existe.
// Daí a checagem em runtime com `in`, que o compilador não tenta adivinhar.
if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = ResizeObserverStub;
}

/**
 * `matchMedia` não existe no jsdom.
 *
 * Um esboço inerte, como o do `ResizeObserver`: responde "não casa" e nunca avisa de
 * mudança. Os testes de UI não medem a janela; quem mede de verdade é o navegador.
 *
 * Instalado em `window` e SEM guarda, por duas razões descobertas na marra:
 *
 *   `globalThis` e `window` não são o mesmo objeto no jsdom do Vitest, e o esboço posto
 *   no primeiro não aparecia para quem chama `window.matchMedia`.
 *
 *   `'matchMedia' in window` dá VERDADEIRO ali mesmo sem existir função nenhuma, então a
 *   guarda pulava a instalação e o teste quebrava assim mesmo.
 *
 * `defineProperty` ainda evita a briga de tipos: a lib do DOM promete que a propriedade
 * existe, então uma atribuição direta não compila.
 */
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }),
});
