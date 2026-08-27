# `core/` — o domínio

Código puro: TypeScript, sem React, sem DOM. Roda em Node nos testes, o que o torna rápido
e fácil de testar.

A regra é vigiada pelo ESLint (`eslint.config.js`, bloco "A FRONTEIRA"): importar React ou
qualquer coisa de `ui/` daqui é erro de lint, não convenção escrita num comentário.

As quatro camadas de importação (briefing, seção 4) nunca olham para dentro uma da outra:

| Pasta            | Responde a pergunta    | Muda quando                     |
| ---------------- | ---------------------- | ------------------------------- |
| `source/`        | ONDE está o dado       | o GitHub do Foundry reorganizar |
| `selection/`     | O QUE entra            | o escopo do produto mudar       |
| `normalization/` | COMO vira entidade     | o autor mudar uma receita       |
| `store/`         | onde a saída é gravada | o formato de persistência mudar |

As demais:

- `markup/` — parser das dez sintaxes do Foundry (`@UUID`, `@Check`, `[[/r`...). Ver briefing 7.6.
- `search/` — índice e consulta. É o diferencial do produto.
- `glossary/` — tabela de termos de jogo, três consumidores. Ver briefing 8.1.
- `types/` — tipos compartilhados entre as camadas.

## `source/` — pronta (Etapa 1)

`channels.ts` é o único arquivo do projeto com URL do Foundry. `ports.ts` define a porta
HTTP, implementada em `src/platform/` — o download do release não manda cabeçalho CORS,
então o mesmo código precisa de três hospedeiros. Detalhes em `ARCHITECTURE.md`, seção 7.

Comando: `npm run packs`. Teste de contrato: `npm run test:contract`.
