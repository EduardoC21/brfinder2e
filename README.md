# brfinder2e

Forja de fichas de **Pathfinder 2e (Remaster)**. Aplicativo desktop, offline, sem backend,
sem login. A primeira entrega é o **aplicativo de consulta**: sincroniza a base do sistema
`pf2e` do Foundry (~17.200 entradas) e deixa pesquisar e ler talentos, magias, itens,
ações, condições, ancestrias, antecedentes e classes.

Não é um VTT: sem rolagem, combate, iniciativa, tokens, mapas ou bestiário.

## Estado

**Etapa 10 concluída** — a receita de `spell` e a tela de magias.

Antes: **Etapa 8** — a tela de consulta e detalhe. Lista em grade única com nome, nível,
raridade e traços colados ao nome; quantos traços cabem é aritmética sobre uma largura
medida uma vez, e o que não cabe vira `+N`. Filtros derivados do dado, com E/OU por tópico;
colunas escolhidas e reordenadas pela pessoa; laterais recolhíveis; painel flutuante; e o
chanfro do sistema feito com `corner-shape: bevel` nativo.

Antes: **Etapa 7** — analisador das dez sintaxes de marcação, com o invariante de ida e
volta valendo em 100% da base (2,87 milhões de strings, zero quebras).
Antes: **Etapa 6** — receita de `action`: 766 normalizadas de dois packs, 0 falhas,
relatório limpo, com o setor vindo da pasta do compêndio (Class 196, Adventure 192,
Archetype 140, Skill 54, Basic 30…).
Antes: **Etapa 5** — tela de consulta: trilho de fontes, busca com MiniSearch, filtros
derivados do dado e navegação por teclado.
Antes: **Etapa 4** — sistema de design do mockup fixado nos tokens, fontes embarcadas,
casca com barra de topo, e a sincronização pelo botão da engrenagem: baixa, normaliza,
**grava em IndexedDB** e mostra o que entrou, o que mudou e o que sumiu. A base sobrevive
ao recarregar a janela. E `source/` (Etapa 1), motor de receita (Etapa 2) e a receita de
`condition` (Etapa 3).

Antes: **Etapa 9** — receita de `feat` e a tela de talentos: 6.284 normalizados de um pack
entre os sete que o tipo mistura, lista com nível, ordenação pelo cabeçalho, largura de
coluna pela cerca de Tukey, e a lista desenhando só o que aparece (42.905 nós no DOM
viraram 416).

Antes: **Etapa 10** — receita de `spell` e a tela de magias: 1.994 normalizadas, o custo de
conjurar decodificado dos 27 formatos da fonte, filtros de faixa numérica para alcance e
área, e a defesa montada de quatro campos (a CA de 82 magias existe só no traço `attack`).

Antes: **Etapa 11** — a busca global: Ctrl+Q abre uma paleta que atravessa as quatro
fontes (9.087 entradas), com filtro por fonte, busca opcional dentro da descrição e
abertura em painel flutuante.

Antes: **Etapa 12** — receita de `equipment`: 5.869 itens de NOVE tipos do Foundry numa
receita só, com preço em cobre, volume na escala do jogo e os números de arma, armadura e
escudo.

Antes: **Etapa 13** — receita e tela de `skill`: as 17 perícias, que não são documento no
Foundry — saem de uma tabela dentro de um jornal. Primeira fonte que APONTA para outra: as
ações de cada perícia abrem a entrada que já existe em Ações.

Antes: **Etapa 14** — receita e tela de `background`: os 520 antecedentes, a fonte mais
textual do projeto (descrição de 370 a 4.860 caracteres, mediana 666). Segunda ponte entre
fontes: o talento concedido abre a entrada que já existe em Talentos.

Antes: **Etapas 16 e 17** — `familiar` (111 habilidades, a receita mais barata), e as
duas fontes que o trilho não previa: `deity` (480 divindades, panteões, pactos e
filosofias) e `domain` (61 páginas de jornal). Segunda forma de ponte, por slug: os
domínios, a perícia e a arma de uma divindade abrem a entrada correspondente.

Próxima: **ancestralidade** — 50 do pack, com a mecânica (aumentos, PV, tamanho,
deslocamento, visão) e o capítulo do jornal `Ancestries`, que traz 4.350 caracteres onde o
pack traz 639. Primeira fonte cuja descrição vem de OUTRO pack.

⚠️ Correção: a linha anterior daqui dizia que a descrição de ancestralidade e de classe
morava nos jornais. Está errado — os packs `ancestries` (50/50), `classes` (29/29) e
`backgrounds` (520/520) trazem descrição própria. O jornal é um SEGUNDO texto, muito maior,
e não um substituto.

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
