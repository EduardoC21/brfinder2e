import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// https://vite.dev/config/  |  https://vitest.dev/config/
export default defineConfig({
  plugins: [react()],

  resolve: {
    // Lê os "paths" do tsconfig.app.json. Assim os apelidos (@core/...) existem
    // em UM lugar só, e valem no editor, no build e nos testes ao mesmo tempo.
    tsconfigPaths: true,
  },

  // Porta fixa: o Tauri aponta para ela em src-tauri/tauri.conf.json (devUrl).
  server: { port: 5173, strictPort: true },

  test: {
    globals: true,

    // Dois projetos, espelhando a fronteira da arquitetura.
    // O core roda em Node puro (rápido, sem DOM). Só a UI paga o custo do jsdom.
    projects: [
      {
        extends: true,
        test: {
          name: 'core',
          environment: 'node',
          include: ['src/core/**/*.test.ts'],
          // O teste de contrato toca a rede: roda separado, via npm run test:contract.
          exclude: ['**/*.contract.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'ui',
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: ['src/core/**', '**/*.contract.test.ts'],
          setupFiles: ['./src/test/setup.ts'],
        },
      },
    ],

    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx', 'scripts/**'],
    },
  },
});
