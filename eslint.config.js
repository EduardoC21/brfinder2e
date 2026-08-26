import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'node_modules', 'src-tauri']),

  js.configs.recommended,

  // "TypeChecked" = regras que consultam o compilador, nao so a sintaxe.
  // Vale o custo: e o que pega Promise sem await e acesso a campo de JSON nao tipado,
  // que sao exatamente os erros que a importacao do Foundry produz.
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // ── Camada de interface: React ─────────────────────────────────────────────
  {
    ...reactHooks.configs.flat.recommended,
    files: ['src/**/*.{ts,tsx}'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-refresh': reactRefresh },
    rules: {
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  // ── A FRONTEIRA, escrita como regra ────────────────────────────────────────
  // O nucleo e dominio puro. Se um dia alguem importar React aqui, o lint quebra.
  // Comentario nao segura arquitetura; regra segura.
  {
    files: ['src/nucleo/**/*.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react',
                'react-dom',
                'react/*',
                'react-dom/*',
                '@interface/*',
                '@idiomas/*',
                '**/interface/**',
                '**/idiomas/**',
              ],
              message:
                'O nucleo/ e dominio puro: nao pode importar React nem a camada de interface. Inverta a dependencia.',
            },
          ],
        },
      ],
    },
  },

  // ── Arquivos de configuracao rodam em Node ─────────────────────────────────
  {
    files: ['*.config.{js,ts}', 'eslint.config.js'],
    languageOptions: { globals: globals.node },
  },

  // ── Testes: um pouco menos rigido ──────────────────────────────────────────
  {
    files: ['**/*.test.{ts,tsx}', 'src/testes/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },

  // Desliga toda regra de ESTILO do ESLint. Formatacao e assunto do Prettier.
  // Precisa ficar por ultimo.
  prettier,
]);
