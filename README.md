# brfinder2e

Consulta de **Pathfinder 2e (Remaster)** em português, sem login e sem backend de
conteúdo: o app sincroniza a base do sistema `pf2e` do Foundry (17.801 entradas) direto do
GitHub deles, guarda no navegador da pessoa, e traduz sob demanda com a chave dela do
Gemini — com o glossário da comunidade brasileira no prompt e as marcas do Foundry
blindadas. As traduções de máquina se juntam numa **central** minúscula (um worker na
Cloudflare) para ninguém traduzir a mesma coisa duas vezes.

Não é um VTT: sem rolagem, combate, iniciativa, tokens, mapas ou bestiário.

## Estado

**V1 — a consulta, como site.** Decidido na Etapa 58: a V1 vive só no navegador (GitHub
Pages); tudo o que o app grava fica no armazenamento do navegador de cada pessoa. Quando
as fichas, criaturas e o escudo do mestre entrarem, o app passa a executável com uma pasta
local, e a central continua só para as traduções.

Para soltar a V1 (do autor): subir a central (`server/README.md`) e ligar o Pages no
repositório (Settings › Pages › GitHub Actions). A URL da central de produção está fixa
em `src/platform/env.ts`; a variável `CENTRAL_URL` só a sobrescreve (um fork).

Próxima, depois da V1: a amostra em larga escala pelo Gemini com os jogadores; cobertura
por tipo e o dump público da central; e as tabelas da lateral no editor. O PR ao pf2e com
a seção 3 do INCONSISTENCIAS se faz em outro chat, com o repositório deles.

### Histórico das etapas

Antes: **Etapa 57** — a V1 como site: a Action de Pages (`pages.yml`) constrói com
`BASE_PATH=/brfinder2e/` e `VITE_CENTRAL_URL` (variável do repositório), o app nasce
ligado à central, e o download do release passa pelo proxy dela (`setProxyBase`) —
conferido o build servido sob `/brfinder2e/`.

Antes: **Etapa 56** — os votos: o uso é o voto (um por entrada e campo por aparelho,
move ao passar de candidata, sai ao apagar), "‹ 2/3 ›" para passar, "Traduzir ↻", votos
em lote no Aceitar todas, e a limpeza diária das candidatas sem voto.

Antes: **Etapa 55** — a central de traduções, lado app: "Usar a compartilhada", a
etiqueta, "↻ Traduzir", o envio automático ao terminar, "Aceitar todas", o modo
"sem perguntar", o bloco nas configurações; e uma central de mentira em Node para testar.

Antes: **Etapa 54** — a central de traduções, lado servidor: um worker na Cloudflare com
um banco D1 (`server/`), o contrato (`/v1/translations`, `/use`, `/stats`, o proxy do
release), a trava das marcas do lado de lá, o limite por hora sem guardar IP, e o passo a
passo do deploy. As regras de uso estão em OPEN-DECISIONS #16.

Antes: **Etapa 52** — o `[[/act slug]]` da prosa vira link (1.170 na base): resolvido pelo
slug na fonte de ações, com o nome da ação como rótulo.

Antes: **Etapa 51** — os filtros em português (a promessa da 28): a tabela de termos do
pacote alimenta os traços sem descrição, os domínios e a fonte divina; de 402 valores em
inglês no modo Traduzido para 21 sem termo.

Antes: **Etapa 50** — a tradução chega de uma vez: sem piscar, o botão conta o progresso
("Traduzindo… 3/8") e o texto troca no fim.

Antes: **Etapa 49** — as entradas coladas (`@Embed`) entram no escopo do Traduzir da
página, como traduções subsequentes gravadas na própria chave; com a tradução à vista, a
colada mostra a tradução do alvo. Os links ficam para quando se abre.

Antes: **Etapa 48** — o Gemini funcionando com a chave do autor: a lista de modelos vem da
API (só os de texto, "Flash Latest" como padrão), sem `thinkingConfig`; com a tradução à
vista, o título mostra o nome traduzido; e o aviso "Tradução: forma" saiu.

Antes: **Etapa 46** — os nomes gravados entram na blindagem: o rótulo de um link dentro
da prosa traduzida usa o nome traduzido pelo modelo ou corrigido à mão, por cima do
glossário.

Antes: **Etapa 45** — o nome faz parte da entidade traduzida: o Traduzir também traduz o
nome quando o glossário não o tem, a lista e a busca leem o nome gravado por cima do
glossário, e o editor ganhou o campo Nome ("Necromancer" → "Necromante").

Antes: **Etapa 44** — os acertos do autor: o glossário da comunidade vem junto com a
sincronização (o botão virou "Atualizar"), o Traduzir fica apagado sem chave, o cursor
dos botões da tela completa, os textos das configurações sem citar uma língua, e as abas
de escolha da classe com o nome traduzido.

Antes: **Etapa 43** — a edição manual: o lápis abre a fonte HTML com prévia ao vivo e a
trava das marcas do Foundry; grava como "manual" (nunca sobrescrita), com "Apagar
tradução" como caminho de volta. E a vassoura do cache órfão do Bergamot ao abrir.

Antes: **Etapa 42** — a limpeza: o Bergamot saiu (dependência, worker, cache do modelo,
adaptador), a hierarquia de formas saiu das preferências e da tela, e as configurações de
tradução viraram três blocos — como ler, o glossário da comunidade, o tradutor (Gemini).

Antes: **Etapa 41** — o Gemini com a chave da pessoa (BYOK) como forma principal de
tradução: provedor no core com a blindagem e o glossário no prompt, adaptador REST na
plataforma, a chave fora das preferências, e o bloco nas configurações (modelo, chave,
Testar). O modelo local sai do padrão.

Antes: **Etapa 40** — a medição do motor local contra o do navegador (Google Tradutor, 8
parágrafos): o Google é claramente melhor na prosa livre e claramente pior nos termos de
jogo; "virar navegador" perderia o offline. Registrado em OPEN-DECISIONS #15, com a
recomendação: medir a API `Translator` do Chrome como terceiro provedor, e o BYOK.

Antes: **Etapa 39** — os links na prosa traduzida mostram o nome traduzido do alvo, em
latão, resolvido na hora de desenhar pelo pacote; e a caixa dos termos afinada (sigla,
título).

Antes: **Etapa 38** — a segunda bateria (120 entradas novas): siglas do módulo (CD, CA,
PV, Mestre, PJ), ordinais com º, a caixa do termo pela caixa do original, e 40 frases
fixas a mais (salvamentos, jogadas, testes, rótulos da divindade).

Antes: **Etapa 37** — a amostra da tradução: 105 entradas de 15 tipos, 1.762 marcas do
Foundry, nenhuma perdida — e o que ela ensinou sobre o motor mudou a blindagem: termo do
glossário inline com o inglês dentro, referência sempre em bloco (inline duplicava o
link), rótulo desconhecido fica no original, o negrito-rótulo (`Trigger`, `Sacred
Animal`) vira bloco para traduzir sozinho, número com sinal protegido, ". ." e espaço
engolido corrigidos na volta.

Antes: **Etapa 36** — os nomes das entradas em português na tela, por preferência própria
(separada da prosa): na lista, na paleta, nos títulos da lateral e da tela completa e nas
caixinhas de referência, o nome do pacote da comunidade — e o original para o que o pacote
não tem. A lista ordena pelo nome que se vê. A busca acha pelos dois nomes, sempre.

Antes: **Etapa 35** — o glossário aprendido do pacote da comunidade: as famílias de
termos das duas tabelas de idioma emparelhadas pela chave (899 pares), o dicionário de
frases fixas e os nomes de condição, ação e habilidade; o termo passa a viajar em inglês
dentro de um elemento próprio (o motor realinhava as palavras do `translate="no"`); e
cada botão Traduzir cobre o seu escopo — a lateral traduz descrição e tabelas, a tela
completa traduz o centro e a lateral.

Antes: **Etapa 34** — a tradução local, o carro-chefe: o motor do Firefox (Bergamot) em
WASM dentro do app, com o modelo en→pt guardado para funcionar sem internet; a
blindagem das marcas do Foundry (`@UUID`, `@Damage`… viram elementos que o motor
preserva, e voltam com o rótulo traduzido — ou a tradução é recusada); o glossário fixo
dos termos que o tradutor erra; e o botão Traduzir ligado na lateral e no flutuante.

Antes: **Etapa 33** — os termos do sistema na nomenclatura da comunidade: "Características",
"círculo", "Média"; e, com "Traduzido", perícias, atributos, tradições, tipos de dano,
categorias, grupos e Tipos em português (tabela copiada do módulo). No "Original", tudo
como era.

Antes: **Etapa 32** — a busca acha pelo nome original e pelo nome em português do pacote
("guerreiro" e "fighter" levam ao Fighter), na lista e na paleta.

Antes: **Etapa 31** — o pacote da comunidade como glossário: baixado a pedido nas
configurações (v8.1.2.0: 420 traços, 8.801 nomes, o dicionário de frases fixas), gravado
sob `trans/pt-BR/glossary/`; com "Traduzido", os traços saem em português na tela.

Antes: **Etapa 30** — o esqueleto da tradução: as configurações em setores (Sincronização
e Tradução), as preferências globais (o que aparece quando há tradução, a língua, as
formas na hierarquia em que uma sobrescreve a outra), a quinta camada `trans/<língua>/`
que sobrevive à sincronização, e o contrato do provedor. Nenhum provedor ainda.

Antes: **Etapa 29** — a varredura: o pack cruzado com ele mesmo e com o Archives of
Nethys (mesma era) por `scripts/varredura-foundry.py` — 1.606 magias, 4.677 talentos,
3.526 itens, 248 antecedentes, 31 ancestralidades, 29 classes; a seção 3 do
INCONSISTENCIAS é a lista de entrada do PR ao pf2e.

Antes: **Etapa 28** — o fechamento das fontes: a ponte arquétipo multiclasse → classe
(que nunca desenhava: o campo é texto e a ponte só lia lista), o "Mecânicas" da
ancestralidade aberto de vez, a sub-aba da lateral lembrada por tipo, os Tipos do trilho
também na paleta de busca, e a OPEN-DECISIONS #12 fechada (2.757 `@Embed`, zero fora da
base).

Antes: **Etapa 27c** — o trilho vira acordeão: todas as pastas nascem fechadas, só uma
abre por vez, a aberta em bordô com a entrada escolhida dentro, sem seta.

Antes: **Etapa 27** — o trilho setorizado, pelo autor: seis pastas que recolhem
(Personagem, Talentos, Habilidades, Equipamentos, Magias, Regras), e nas fontes grandes
"Todos" mais uma entrada por Tipo — a mesma fonte com o Tipo travado, colunas e filtros
do Tipo ligados sozinhos. "Antecedente" virou "Biografia".

Antes: **Etapa 26g** — as perícias da classe numa linha ("Stealth · outro · +7"), com o
"outro" derivado das regras das opções de subclasse (10 das 29); o "outro" do
atributo-chave fica só como palavra. INCONSISTENCIAS 2.10: o Ranger sem Nature no pack.

Antes: **Etapa 26f** — o rodapé que aponta para o jornal sai na poda de leitura (29
classes, 219 talentos, 50 ancestralidades, 1 habilidade, 3 equipamentos — o dado fica
inteiro); as barras de abas, de cima e da lateral, rolam com setas quando não cabem.

Antes: **Etapa 26e** — a lateral com sub-abas também na lista (Detalhes · Progressão ·
Proficiências · Magias; Detalhes some na tela completa); as abas de escolha na ordem em
que a classe as ganha, não alfabética.

Antes: **Etapa 26d** — a lateral rola inteira; a classe na tela completa tem a lateral
própria: identidade em cima e sub-abas Progressão (a tabela da página, 29), Proficiências
e Magias (12); a sigla do atributo também na coluna de perícia.

Antes: **Etapa 26c** — a dona da habilidade só dentro do Tipo (Ancestralidade marcada →
coluna e filtro "Ancestralidade"; Classe → "Classe"; visão geral → só o Tipo); as abas de
escolha da classe só com Livro; a rolagem da aba Detalhes lembrada enquanto a entrada
está aberta; "Your Level" → "Level" e "Class Features" → "Features" nas tabelas (41 + 29,
poda de leitura).

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
- Rust: **ainda não** — a V1 é site. Só faz falta no executável (fichas). Ver `src-tauri/README.md`.

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
**Nada de conteúdo da Paizo é embarcado no site nem redistribuído pelo app.** A pessoa baixa
a base na primeira execução; as traduções ficam no navegador dela, e as de máquina vão para
a central da comunidade sob a Community Use Policy (ver `server/README.md`).

## Documentos

- `ARCHITECTURE.md` — a estrutura de pastas e o porquê de cada escolha
- `OPEN-DECISIONS.md` — o que ainda não foi decidido, e quando decidir
- `src/core/README.md` — as camadas de importação
- `src/ui/README.md` — a camada React
- `src-tauri/README.md` — a casca nativa e o que falta para compilá-la
