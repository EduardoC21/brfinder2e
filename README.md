# brfinder2e

Forja de fichas de **Pathfinder 2e (Remaster)**. Aplicativo desktop, offline, sem backend,
sem login. A primeira entrega é o **aplicativo de consulta**: sincroniza a base do sistema
`pf2e` do Foundry (~17.200 entradas) e deixa pesquisar e ler talentos, magias, itens,
ações, condições, ancestrias, antecedentes e classes.

Não é um VTT: sem rolagem, combate, iniciativa, tokens, mapas ou bestiário.

## Estado

**Etapa 1 concluída** — camada `source/`: canais, resolução de release, download,
extração e manifesto. `npm run packs` lista os 97 packs com tamanho, e o teste de contrato
passa contra o repositório real do Foundry. A escada completa está no briefing, seção 6.

## Requisitos

- Node.js **>= 20.19** (testado em 20.19.5)
- Rust: **ainda não**. Só faz falta na Etapa 15 (empacotamento). Ver `src-tauri/README.md`.

## Comandos

| Comando                 | O que faz                                                    |
| ----------------------- | ------------------------------------------------------------ |
| `npm run dev`           | Servidor de desenvolvimento em http://localhost:5173         |
| `npm run check`         | **Formato + lint + tipos + testes.** Rode antes de commitar. |
| `npm run packs`         | Lista os packs do release com tamanho (Etapa 1)              |
| `npm run test:watch`    | Testes em modo contínuo                                      |
| `npm run test:contract` | Bate no GitHub do Foundry e valida o canal (rede, 34 MiB)    |
| `npm run test:cov`      | Testes com relatório de cobertura                            |
| `npm run lint:fix`      | Corrige o que o ESLint sabe corrigir                         |
| `npm run format`        | Aplica o Prettier no projeto todo                            |
| `npm run build`         | Build de produção em `dist/`                                 |
| `npm run tauri dev`     | Janela nativa — **exige Rust instalado**                     |

## Idioma

Duas regras, e elas não se misturam:

- **Código em inglês** — pastas, identificadores, tokens CSS, chaves de tradução, scripts,
  nomes de arquivo.
- **Português para gente** — comentários, documentação `.md`, e os _valores_ dentro de
  `src/i18n/`.

Detalhe e justificativa em `ARCHITECTURE.md`, seção 2.

## Licença e conteúdo

Código do sistema `pf2e` sob Apache 2.0; conteúdo de jogo sob ORC/OGL e acordo Paizo–Foundry.
**Nada de conteúdo da Paizo é embarcado no instalador nem redistribuído.** O usuário baixa a
base na primeira execução; o cache de tradução fica local, por usuário.

## Documentos

- `ARCHITECTURE.md` — a estrutura de pastas e o porquê de cada escolha
- `OPEN-DECISIONS.md` — o que ainda não foi decidido, e quando decidir
- `src/core/README.md` — as camadas de importação
- `src/ui/README.md` — a camada React
- `src-tauri/README.md` — a casca nativa e o que falta para compilá-la
