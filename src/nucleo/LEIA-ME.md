# `nucleo/` — o dominio

Codigo puro: TypeScript, sem React, sem DOM, sem acesso direto a rede ou disco espalhado.
Roda em Node nos testes, o que o torna rapido e faceis de testar.

A regra e vigiada pelo ESLint (`eslint.config.js`, bloco "A FRONTEIRA"): importar React ou
qualquer coisa de `interface/` daqui e erro de lint, nao convencao escrita num comentario.

As quatro camadas de importacao (briefing, secao 4) nunca olham para dentro uma da outra:

| Pasta           | Responde a pergunta    | Muda quando                     |
| --------------- | ---------------------- | ------------------------------- |
| `fonte/`        | ONDE esta o dado       | o GitHub do Foundry reorganizar |
| `selecao/`      | O QUE entra            | o escopo do produto mudar       |
| `normalizacao/` | COMO vira entidade     | o autor mudar uma receita       |
| `base/`         | onde a saida e gravada | o formato de persistencia mudar |

As demais:

- `marcacao/` — parser das dez sintaxes do Foundry (`@UUID`, `@Check`, `[[/r`...). Ver briefing 7.6.
- `busca/` — indice e consulta. E o diferencial do produto.
- `glossario/` — tabela de termos de jogo, tres consumidores. Ver briefing 8.1.
- `tipos/` — tipos compartilhados entre as camadas.
