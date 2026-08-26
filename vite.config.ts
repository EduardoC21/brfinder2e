import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// https://vite.dev/config/  |  https://vitest.dev/config/
export default defineConfig({
  plugins: [react()],

  resolve: {
    // Le os "paths" do tsconfig.app.json. Assim os apelidos (@nucleo/...) existem
    // em UM lugar so, e valem no editor, no build e nos testes ao mesmo tempo.
    tsconfigPaths: true,
  },

  // Porta fixa: o Tauri aponta para ela em src-tauri/tauri.conf.json (devUrl).
  server: { port: 5173, strictPort: true },

  test: {
    globals: true,

    // Dois projetos, espelhando a fronteira da arquitetura.
    // O nucleo roda em Node puro (rapido, sem DOM). So a interface paga o jsdom.
    projects: [
      {
        extends: true,
        test: {
          name: 'nucleo',
          environment: 'node',
          include: ['src/nucleo/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'interface',
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: ['src/nucleo/**'],
          setupFiles: ['./src/testes/preparo.ts'],
        },
      },
    ],

    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/testes/**', 'src/main.tsx'],
    },
  },
});
