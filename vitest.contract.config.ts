import { defineConfig } from 'vitest/config';

/**
 * Configuração separada para o teste de contrato (briefing 4.2).
 *
 * Ele fica fora do `npm test` de propósito: toca a rede, baixa 34 MiB e depende da cota
 * da API do GitHub. Um teste assim dentro da suíte normal transforma "meu código quebrou"
 * em "sei lá, às vezes falha" — e aí ninguém mais confia no verde.
 */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    name: 'contract',
    environment: 'node',
    globals: true,
    include: ['src/**/*.contract.test.ts'],
    testTimeout: 180_000,
    hookTimeout: 180_000,
  },
});
