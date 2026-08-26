# brfinder2e

Forja de fichas de **Pathfinder 2e (Remaster)**. Aplicativo desktop, offline, sem backend,
sem login. A primeira entrega e o **aplicativo de consulta**: sincroniza a base do sistema
`pf2e` do Foundry (~17.200 entradas) e deixa pesquisar e ler talentos, magias, itens,
acoes, condicoes, ancestrias, antecedentes e classes.

Nao e um VTT: sem rolagem, combate, iniciativa, tokens, mapas ou bestiario.

## Estado

**Etapa 0 concluida** — projeto base com lint, tipos, testes e CI verdes num esqueleto vazio.
A escada completa de etapas esta no briefing, secao 6.

## Requisitos

- Node.js **>= 20.19** (testado em 20.19.5)
- Rust: **ainda nao**. So faz falta na Etapa 15 (empacotamento). Ver `src-tauri/LEIA-ME.md`.

## Comandos

| Comando              | O que faz                                                    |
| -------------------- | ------------------------------------------------------------ |
| `npm run dev`        | Servidor de desenvolvimento em http://localhost:5173         |
| `npm run verificar`  | **Formato + lint + tipos + testes.** Rode antes de commitar. |
| `npm run test:watch` | Testes em modo continuo                                      |
| `npm run test:cov`   | Testes com relatorio de cobertura                            |
| `npm run lint:fix`   | Corrige o que o ESLint sabe corrigir                         |
| `npm run format`     | Aplica o Prettier no projeto todo                            |
| `npm run build`      | Build de producao em `dist/`                                 |
| `npm run tauri dev`  | Janela nativa — **exige Rust instalado**                     |

## Licenca e conteudo

Codigo do sistema `pf2e` sob Apache 2.0; conteudo de jogo sob ORC/OGL e acordo Paizo-Foundry.
**Nada de conteudo da Paizo e embarcado no instalador nem redistribuido.** O usuario baixa a
base na primeira execucao; o cache de traducao fica local, por usuario.

## Documentos

- `ARQUITETURA.md` — a estrutura de pastas e o porque de cada escolha
- `src/nucleo/LEIA-ME.md` — as camadas de importacao
- `src/interface/LEIA-ME.md` — a camada React
- `src-tauri/LEIA-ME.md` — a casca nativa e o que falta para compila-la
