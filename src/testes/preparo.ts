/**
 * Preparo do ambiente de teste da camada de interface (projeto "interface" no
 * vite.config.ts). O nucleo NAO carrega este arquivo — ele roda em Node puro.
 */
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Desmonta o que ficou na tela entre um teste e outro.
afterEach(() => {
  cleanup();
});
