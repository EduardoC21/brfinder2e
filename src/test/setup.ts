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
