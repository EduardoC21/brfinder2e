import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  // `public/bergamot` é dependência copiada (não é fonte); o script de cópia é Node puro.
  globalIgnores([
    'dist',
    'coverage',
    'node_modules',
    'src-tauri',
    'public/bergamot',
    'scripts/copy-bergamot.mjs',
  ]),

  js.configs.recommended,

  // "TypeChecked" = regras que consultam o compilador, não só a sintaxe.
  // Vale o custo: é o que pega Promise sem await e acesso a campo de JSON não tipado,
  // que são exatamente os erros que a importação do Foundry produz.
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

  // ── Camada de UI: React ────────────────────────────────────────────────────
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
  // O core é domínio puro. Se um dia alguém importar React aqui, o lint quebra.
  // Comentário não segura arquitetura; regra segura.
  {
    files: ['src/core/**/*.ts'],
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
                '@ui/*',
                '@i18n/*',
                '@platform/*',
                '**/ui/**',
                '**/i18n/**',
                '**/platform/**',
              ],
              message:
                'src/core/ é domínio puro: não pode importar React nem a camada de UI. Inverta a dependência.',
            },
          ],
        },
      ],
    },
  },

  // O teste de contrato é a exceção deliberada: ele existe justamente para ligar o
  // core a uma implementação real e bater na rede. Sem essa liberação, ele não teria
  // como montar a porta HTTP de verdade.
  {
    files: ['src/core/**/*.contract.test.ts'],
    rules: { '@typescript-eslint/no-restricted-imports': 'off' },
  },

  // ── Configuração e scripts rodam em Node ───────────────────────────────────
  {
    files: ['*.config.{js,ts}', 'eslint.config.js', 'scripts/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['scripts/**/*.ts'],
    rules: {
      // Um comando de linha existe para escrever na tela.
      'no-console': 'off',
    },
  },

  // ── Testes: um pouco menos rígido ──────────────────────────────────────────
  {
    files: ['**/*.test.{ts,tsx}', 'src/test/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },

  // Desliga toda regra de ESTILO do ESLint. Formatação é assunto do Prettier.
  // Precisa ficar por último.
  prettier,
]);
