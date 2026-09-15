import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// https://vite.dev/config/  |  https://vitest.dev/config/
export default defineConfig({
  plugins: [react()],

  /*
   * O caminho-base do site (Etapa 57): no GitHub Pages o app vive em
   * `https://<conta>.github.io/brfinder2e/`, e os arquivos precisam saber disso. A Action
   * passa `BASE_PATH=/brfinder2e/`; em dev e no Tauri fica `/`.
   */
  base: process.env['BASE_PATH'] ?? '/',

  resolve: {
    // Lê os "paths" do tsconfig.app.json. Assim os apelidos (@core/...) existem
    // em UM lugar só, e valem no editor, no build e nos testes ao mesmo tempo.
    tsconfigPaths: true,
  },

  // Porta fixa: o Tauri aponta para ela em src-tauri/tauri.conf.json (devUrl).
  server: {
    port: 5173,
    strictPort: true,

    /*
     * O download do release NÃO manda cabeçalho CORS (medido em 26/08/2026), então o
     * navegador não consegue buscá-lo direto. Em dev, o Vite refaz o pedido pelo lado
     * Node, onde CORS não existe.
     *
     * Isto é só para o desenvolvimento. Em produção quem sai para a rede é o Rust, pelo
     * plugin HTTP do Tauri — mesma porta `HttpPort`, outro adaptador.
     */
    proxy: {
      '/gh-api': {
        target: 'https://api.github.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/gh-api/, ''),
      },
      '/gh-dl': {
        target: 'https://github.com',
        changeOrigin: true,
        // O download responde 302 para release-assets.githubusercontent.com.
        followRedirects: true,
        rewrite: (path) => path.replace(/^\/gh-dl/, ''),
      },
    },
  },

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
      // A central de traduções (server/): lógica pura, em Node, sem Cloudflare por perto.
      {
        extends: true,
        test: {
          name: 'server',
          environment: 'node',
          include: ['server/src/**/*.test.ts'],
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
