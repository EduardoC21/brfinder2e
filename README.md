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

Antes: **Etapa 19** — `rule`: as 64 páginas da tela do mestre e do Remaster Changes, com a
seção do livro como Tipo. Os índices viram sumário clicável — a referência relativa
`@UUID[.página]`, que só jornal usa, é reescrita na forma canônica.

Antes: **Etapa 22** — `ancestry`, a primeira das três fontes grandes: 50 do pack com a
mecânica em campos (PV, tamanho, deslocamento, aumentos, falha, visão, idiomas) e a
página do jornal `Ancestries` colada por `fromJournal`, a segunda tabela de consulta do
motor. A lista e o painel lateral mostram o básico; a página fica guardada para a tela
completa.

Antes: **Etapa 21** — o Tipo do familiar, derivado: o livro separa habilidade de familiar
e de mestre e o pack não; contra o AoN, nome a nome, os 111 viram 65 de familiar, 16 do
patrono da bruxa, 14 de mestre (a única lista nossa), 10 de familiar específico, 6
elementais. Familiares específicos (37 no AoN) e companheiros (97) não existem no zip —
OPEN-DECISIONS #13.

Antes: **Etapa 20** — as tabelas das regras param de quebrar (célula compacta medida em
40 caracteres, `pf2-icon`, `sup`, `colspan`, `float:right`), o link na prosa perde a
linha, `@Embed` cola a entrada apontada, e as duas vassouras em Configurações: apagar as
entradas aposentadas e apagar a base inteira.

Antes: **Etapa 26b** — o atributo-chave que a subclasse abre (`subfeatures.keyOptions`,
9 habilidades: o Rogue vira "Des ou outro", o Psychic "Int ou Car"), pela quarta tabela
de consulta do motor; os atributos abreviados nas colunas (For, Des, Con, Int, Sab, Car);
as proficiências agrupadas pelo rank; a aba Habilidades da classe só com Livro.

Antes: **Etapa 26a** — `class`: as 29 do pack com a ficha inicial em campos
(atributo-chave, PV, percepção, resistências, ataques, defesas, perícias, conjura) e a
página do jornal `Classes` colada; as 556 habilidades por nível de `system.items` viram
a aba Habilidades, e as ESCOLHAS da classe (ordem do druida, escola do mago) viram uma
aba cada, achadas pelo `ChoiceSet` da habilidade — `item:tag:druid-order` marca as 9
ordens. `class-features` (856 + 18 chamados) entra em Habilidades como Tipo.

Antes: **Etapa 25** — `archetype`: os 249 do jornal `Archetypes`, com o Tipo do livro
(184 gerais, 29 multiclasse, 14 de classe, 13 destinos míticos, 6 mortos-vivos, 3
artefatos), a dedicação, os talentos citados pela página (2.125 dos 2.142) e a tela
completa com o livro inteiro colado. As 8 páginas de regra do jornal entram em Regras.

Antes: **Etapa 24** — a chamada recolhida "Mecânicas" no fim da prosa da ancestralidade;
as heranças com o que concedem e a visão; a versátil com a visão pelas regras.

Antes: **Etapa 23** — `heritage` (311 próprias, fonte fora do trilho) e as 17 versáteis
como Tipo da ancestralidade; as abas de lista da tela completa, com o filtro travado —
Dwarf: Heranças 9, Talentos 48; Nephilim: Talentos 88.

Próxima: **classe, a lateral da aba Detalhes** — a tabela de progressão por nível (o que
se ganha em cada um, dos níveis de talento e das habilidades) e as proficiências
iniciais, trocando entre as duas dentro da lateral; e as pontes que ficaram esperando
(arquétipo multiclasse → classe).

Antes: **Etapa 22e** — a descrição no contexto: o Change Shape aberto pelo Anadi tem o
texto do Anadi (o `ItemAlteration` de descrição do Foundry, 91 estáticas no zip), com
"Ver a original". Serve a qualquer fonte que conceda algo.

Antes: **Etapa 22d** — `feature`, as 55 habilidades de ancestralidade (o clique em
"Fangs" abre); o Change Shape que vinha por `GrantItem`; a linha "quantos" dos idiomas
adicionais; e `RECIPES_REVISION`: a base gravada por receitas antigas pede sincronização
na barra de topo.

Antes: **Etapas 22b e 22c** — a tela completa: o botão da lateral ou o duplo clique na
linha trocam a lista pela entrada com abas em cima (só Detalhes por ora): a prosa da
página do jornal no lugar da lista, a lateral de sempre ao lado. Voltar, Esc ou o trilho
devolvem a lista como estava. E a poda de leitura: os 1.806 parágrafos que são só o link
para um efeito de VTT saem da tela, sem tocar no dado.

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
