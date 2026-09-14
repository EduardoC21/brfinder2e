# Padrões de interface

Este arquivo é a **memória de trabalho da UI**. `ARCHITECTURE.md` guarda o porquê das
decisões de arquitetura; aqui ficam as regras que eu preciso reler antes de montar cada
uma das doze telas de listagem, para que a terceira saia igual à primeira.

Regra de ouro do projeto: **as listagens são o mesmo componente**. Mudam colunas, filtros
e algumas interações. Se uma tela precisar de um componente novo, ou o componente é
genérico o bastante para as outras onze, ou a diferença tem que estar escrita aqui.

---

## 1. Vocabulário visual

| Coisa                       | Significado                                                             | Onde                        |
| --------------------------- | ----------------------------------------------------------------------- | --------------------------- |
| **Bordô** (`--color-state`) | ESTADO da aplicação: selecionado, ativo, aposentado, barra do flutuante | nunca em dado de jogo       |
| **Latão** (`--color-data`)  | DADO DE JOGO: custo, referência cruzada, número que veio do Paizo       | nunca em estado             |
| Chanfro (`clip-path`)       | superfície clicável ou recorte de conteúdo                              | `chamfer-sm` / `chamfer-lg` |

#### O chanfro: `corner-shape: bevel`, com `clip-path` de reserva

O corte é nativo. A utilitária `chamfer-sm` / `chamfer-md` / `chamfer-lg` declara
`border-top-left-radius` mais `corner-shape: bevel` dentro de um `@supports`, e deixa o
`clip-path` de fora como caminho de queda. Nunca aplique o corte à mão.

Por que nativo ganha: `clip-path` recorta a caixa DEPOIS de pintada — borda, sombra e
filhos junto —, e por isso a diagonal ficava sem contorno. `corner-shape` diz ao motor
qual é a forma do canto, então quem desenha a diagonal é o mesmo código que desenha as
quatro retas: mesma espessura, emenda exata, e de graça em foco e sombra.

Medido antes de adotar, e não pela documentação: WebView2 desta máquina em 152.0.4191.66,
e a propriedade entrou no Chromium 139. O app empacota só para Windows (`targets:
["nsis"]`), então o motor é conhecido.

**A trava do `@supports` não é zelo à toa.** Sem ela, um motor sem a propriedade obedeceria
o `border-top-left-radius` sozinho e desenharia um canto ARREDONDADO — o oposto exato da
assinatura. Fora do bloco fica o `clip-path` de sempre, e a degradação é para o que a
gente já tinha.

**Duas coisas que o `clip-path` fazia de brinde e o nativo não faz:**

1. _Recortar os filhos._ `border-radius` recorta só o fundo e a borda do próprio elemento.
   Quem tem filho com fundo próprio encostado na quina precisa pedir `overflow: clip` no
   seu módulo. Hoje só o `FloatingPanel` precisa (a barra de título é bordô e ocupa a
   largura toda). Isso NÃO vai na utilitária: `SettingsPanel .panel` é chanfrado E é o
   próprio rolador, e um `overflow` global mataria a rolagem dele.
2. _Comer a sombra._ O `clip-path` vinha apagando a única sombra do app, a do flutuante.
   Com o nativo ela aparece.

**Ficou registrado, para não se tentar de novo.** Com `clip-path`, a diagonal não tem
conserto por cima: pseudo-elemento girado erra por construção (filho absoluto se posiciona
contra o padding box, o corte acontece no border box); duas camadas exigem saber a cor da
superfície de trás, que muda em três estados; `border-image` de 9 fatias só sai 1:1 com
`border-image-width: 6px`, que pinta 6px para dentro dos quatro lados e cobre o conteúdo
num quadrado de 16px.

**Não há exceção.** A marca de raridade já teve SVG próprio, com a diagonal traçada à
parte e mais grossa que as retas para compensar o antialiasing. Isso existia porque o
`clip-path` deixava a diagonal sem contorno e ali o contorno É o desenho — com
`corner-shape` deixou de ser verdade, e ela passou a usar a mesma utilitária. Uma forma só
de construir a mesma coisa.

### Glifos de custo

| Custo         | Símbolo        | Observação                   |
| ------------- | -------------- | ---------------------------- |
| 1, 2, 3 ações | ◆ ◆◆ ◆◆◆       | losango cheio, latão         |
| ação livre    | ◇              | losango vazado               |
| **reação**    | **↩ (U+21A9)** | símbolo, **nunca a palavra** |
| passiva       | —              | sem glifo                    |

O mesmo componente (`ActionCost`) atende a coluna da lista, o cabeçalho do detalhe e o
`<span class="action-glyph">` embutido na prosa. O Foundry manda a letra da fonte de
ícones dele (`1`, `A`, `D`, `T`, `R`, `F`), que não distribuímos; a tradução dessas letras
está em `core/markup/document.ts:actionGlyph`.

---

## 2. Um componente por trabalho

O bug que originou esta seção: existiam **três** campos de busca, sendo um `<input>` cru
solto em `BrowseScreen.tsx`, e o CSS do `SearchInput` prometia num comentário esconder o
`×` nativo do `type="search"` sem nunca ter escrito a regra. Resultado: dois `×` na tela,
um nativo e um nosso.

**Regra:** todo campo de busca é `SearchInput`. Nenhuma tela escreve `<input
type="search">`. Se o componente não serve, ele ganha uma prop — não um clone.

Vale igual para botão de ícone (`IconButton`), lista de opções (`OptionList`), trilho com
rolagem lateral (`ScrollRail`).

### Token de design que não existe

`color: var(--color-accent)` com `--color-accent` inexistente **não é erro em CSS**: a
declaração vira inválida e a propriedade herda. O rótulo que devia sair em latão saiu
branco, e nada reclamou — nem o navegador, nem o lint, nem o compilador. Só apareceu
porque fui medir a cor calculada na tela.

`npm run check` roda `scripts/check-tokens.ts`, que compara todo `var(--…)` do `src` com
o que `src/ui/design/tokens.css` declara. **O latão chama-se `--color-data`.**

---

## 3. Listagem dirigida por dado

`core/browse/spec.ts` descreve cada uma das doze fontes com **dado, nunca JSX**, porque a
FRONTEIRA proíbe React em `core/`. A UI tem um desenhista por espécie:

```
ColumnSpec       → ResultList.Column
FilterSpec       → FilterBar
DetailFieldSpec  → DetailPanel.Field
```

Acrescentar uma espécie é: um caso na união + um caso no `switch`. O compilador cobra o
segundo quando você faz o primeiro. **Nunca** desenhar coluna ou campo com `if` por nome
de fonte.

### A seta MOSTRA, o Enter escolhe

**Decidido:** andar de linha em linha com as setas já troca o que está na lateral. O Enter
continua existindo, e a diferença entre os dois é a CAMADA: o Enter fecha o painel de
filtro aberto por cima do detalhe, e a seta não.

Por quê: sem isso era preciso apertar Enter a cada passo para ver onde se está, o que
transforma percorrer dez magias em vinte teclas. E fechar o painel de filtro a cada seta
tiraria da tela justamente o filtro que a pessoa está montando. A seta também **não desfaz
o recolher**: quem fechou a lateral à mão continua com ela fechada.

### O teclado é da ÁREA, não do campo de busca

**Decidido:** o `keydown` das setas e do Enter é ouvido no `<div>` que embrulha busca,
barra de filtros e lista — e não no `<input>`. O foco continua no campo (Anexo A: "digita,
desce com as setas, abre com Enter"), e a lista segue comandada por `aria-activedescendant`.

Por quê: ouvindo só no `<input>`, bastava clicar em espaço vazio da lista para as setas
pararem de andar de linha em linha. O clique manda o foco para o `<body>` — ou para o corpo
da lista, que é `tabIndex={-1}` —, e dali o evento não passa pelo campo nunca.

Duas peças fazem isso funcionar:

- `tabIndex={-1}` na área inteira. O navegador procura o **ancestral focável mais próximo**
  do que foi clicado, e para ali. `-1` e não `0`: a área não entra na ordem do Tab, que já
  tem a busca, os filtros e os cabeçalhos ordenáveis.
- **Botão é exceção**, e o manipulador desiste quando o alvo está dentro de um. O cabeçalho
  que ordena e os tópicos de filtro respondem a Enter por conta própria; sequestrá-lo
  abriria uma entrada da lista em vez de acionar o botão.

---

## 4. O detalhe da entrada

- Grid de duas linhas: cabeçalho fixo, corpo que rola. A rolagem é **interna**, senão o
  nome sai de vista junto com o texto longo.
- **Uma** rolagem por coluna. Quando o detalhe está dentro do flutuante, o flutuante corta
  (`overflow: hidden`) e entrega a altura ao filho.
- O mesmo `DetailPanel` serve a lateral e o flutuante. Ele **não pergunta onde está**:
  recebe callbacks opcionais, e a ausência do callback apaga o botão.
- Ordem do cabeçalho: **ações em cima, nome embaixo**. O nome tem a linha inteira. Botão
  não espreme nome.
- A lateral é **fixa e permanente**: vai do topo da página até embaixo, existe com nada
  selecionado (estado vazio) e a barra de filtros **não passa por cima dela**.
- Largura da lateral é **arrastável pela borda**, com mínimo. A escolha persiste (seção 7).

### Tradução

**Um** botão, rotulado pelo **destino**: `Traduzir` quando se está vendo o original,
`Ver original` quando se está vendo a tradução. A roda de regerar (`⟳`) aparece **só** no
modo tradução, ao lado, e é o único caminho que ignora o cache local.

Traduzir usa o cache local quando existe; regerar refaz com o mesmo método e substitui o
cache. Nunca dois botões de tradução na mesma linha do nome.

### Pop-out

**Vários** pop-outs, independentes. Consequências:

- Cada `⤢` cria mais um painel, em **cascata** (deslocado do anterior).
- O pop-out **congela** a entrada dele. Clicar noutra entrada da lista alimenta a
  **lateral**, nunca um pop-out já aberto.
- Clicar num pop-out o traz para a frente: `z-index` por ordem de foco, não fixo.
- Minimizado, encolhe **horizontalmente até a largura do nome**; restaurado, volta à
  largura padrão. Guardar a largura de antes, não recalcular.
- Redimensionável pelo canto, com mínimo.

### Um gesto, um hook

Arrastar o pop-out, redimensioná-lo pelo canto e puxar a borda da lateral são o MESMO
gesto com contas diferentes. `usePointerDrag` guarda a mecânica — captura de ponteiro,
botão principal, alvo que não é botão — e entrega o **deslocamento** desde o início, não a
posição do cursor. Quem usa guarda o valor de partida e soma, e por isso o mesmo hook
serve posição e tamanho.

Escrever a mecânica em cada lugar é como o `×` duplicado apareceu: três cópias, e a
correção chegou a uma.

---

## 5. Máscara dos tokens de referência

Medido na base inteira (`json-assets-pf2e-8.4.1`). Estes números são a razão das regras —
não mexer sem medir de novo.

### A palavra que vem depois já está no texto

| token           | ocorrências sem rótulo | seguido de…                                |
| --------------- | ---------------------: | ------------------------------------------ |
| `@Damage`       |                 14.545 | **`damage` em 11.220 (77,1%)**             |
| `@Check`        |                 17.434 | `save`/`saving` em 8.577; `check` em 1.482 |
| `@Check[flat…]` |                  1.163 | `check` em apenas 120 (10,3%)              |

**Regra:** o texto ao redor já traz o substantivo. Acrescentar é duplicar.

- `@Damage` → **nunca** acrescentar `damage`. `@Damage[1d10[fire]]` → `1d10 fire`.
- `@Check` → **nunca** acrescentar `save`. `@Check[reflex|basic]` → `basic Reflex`.
- `@Check[flat…]` → **acrescentar `check`**, minúsculo. É a única exceção, porque
  "DC 5 flat" sozinho não é frase, e em 89,7% dos casos o texto não completa.
- `@Template` → sem palavra acrescentada. `@Template[cone|distance:30]` → `30-foot cone`.
- `[[/r 1d4 #Recharge Searing Wave]]` → o `#` é o _flavor_ da rolagem, **não** faz parte
  do texto. Sai `1d4`.

### Maiúsculas

Salvamentos e perícias são nome próprio no PF2e: `Reflex`, `Fortitude`, `Athletics`,
`Perception`. `flat check` é substantivo comum: minúsculo.

### O que não sabemos resolver

`@Localize` puxa texto da tabela de idioma. Enquanto não resolve, aparece discreto com o
alvo no `title` — mas **`@Localize` sozinho numa descrição é uma descrição vazia**: a
condição Sickened é exatamente isto, e na tela sai `PF2E.condition.sickened.rules`. A chave
existe na tabela de idioma que a receita já lê.

### A poda de leitura: o que é do VTT sai da tela

**Decidido (Etapa 22c), pelo autor:** o que a descrição traz para a mesa virtual e não
para quem lê sai da TELA — sem tocar no dado. Medido nas descrições das fontes
importadas: 1.852 links para packs de efeito (`equipment-effects` 960, `spell-effects`
502, `feat-effects` 355), o objeto que o Foundry arrasta para a ficha; **1.806 estão
sozinhos num parágrafo** (`<p>@UUID[…]{Spell Effect: Aid}</p>`, fechando quase toda
magia e talento) e 46 no meio de uma frase. `pruneForReading` tira o parágrafo que é só
o link; o do meio da frase fica, porque tirá-lo deixaria a frase manca.

É a terceira camada (o documento pronto para desenhar): `raw/` e `desc/` continuam com o
texto inteiro, e a busca na descrição busca no inteiro. O "leia mais" da ancestralidade
(o link para a própria página do jornal) sai na RECEITA, não na poda: só a receita sabe
que aquela página é o `page` dela — e `raw/` continua com ele.

**O rodapé para o jornal também sai na poda** (26f, pelo autor): a descrição da classe
termina com um parágrafo que é só o link para a própria página (`<p><em>@UUID[…journals…]
{Druid}</em></p>`), e a da dedicação com o link para a página do arquétipo — o caminho do
VTT para "abrir o livro", que aqui era um nome apontando para lugar nenhum. Medido: as 29
classes (22 em `<em>`), 219 talentos (218 dedicações mais Benefactor's Strike), as 50
ancestralidades, 1 habilidade de classe, 3 equipamentos. Só o ÚLTIMO parágrafo do
documento, e só quando é o link sozinho: um link para o jornal no meio do texto ("from
the Harrower archetype") é referência, e fica — e continua abrindo o arquétipo. Na
máscara, não no dado: o texto que volta para o Foundry na montagem de ficha é o inteiro.

### A descrição no contexto

**Decidido (Etapa 22e), pelo autor:** uma entrada aberta A PARTIR de outra pode ter o
texto daquela outra. O Change Shape é uma ação só, genérica; o Anadi, o Kitsune, o Tanuki
e o Yaoguai o concedem cada um com o seu texto — é o `ItemAlteration` de descrição do
Foundry, lido na receita (`alterations` na base de quem concede) e aplicado na abertura
(`contextFor`). Só as alterações estáticas (91 no zip): as que dependem do estado da ficha
ficam para a ficha.

Na tela: `override` troca o texto e avisa — "Descrição de Anadi. Ver a original" —, com
o caminho de volta; `add` deixa o original e acrescenta embaixo — "O que Anadi
acrescenta:". O aviso é mono e apagado, na voz dos rótulos: é anotação sobre o texto. O
original nunca some; é um clique. Aberta pela lista da própria fonte, a entrada é a
genérica. Navegar no flutuante deixa o contexto para trás; o Voltar o traz.

### `@Embed`: a entrada colada

**Recontado na 28, com as três fontes grandes na base** (era a OPEN-DECISIONS #12): no
`pf2e-8.5.0`, 2.757 `@Embed` nas fontes que lemos — `journals` 2.661 (Archetypes → feats
2.108; Classes → classfeatures 469; actions 66; spells 12; ancestryfeatures 3; equipment
3), `class-features` 53, `feats` 25, `equipment` 16, `heritages` 1, `backgrounds` 1 — e
**zero apontam para fora da base**: todo alvo é um pack que já é fonte. O segundo nível
(embed dentro de entrada colada) existe UMA vez, a página do Runelord colando a
habilidade Runelord, que cola habilidades; continua um nível só, e a segunda camada sai
como link, não colada — um caso não paga um contador de profundidade. `@Localize` já
expande (`markup/localize.ts`: a Sickened, 20 habilidades de classe, 135 páginas de
jornal). Decisão fechada.

**Decidido (Etapa 20b):** `@Embed[<uuid> inline]` cola a descrição da entrada apontada no
lugar do token, quando ela está na base. É como as páginas de subsistema são escritas —
Hexploration tem o título "Travel" como link e, logo abaixo, o embed da ação. 19 nas
regras (Infiltration 7, Duels 5, Hexploration 4, Influence 2, Research 1), todos para
`actionspf2e`.

Não fere "clicável abre pop-out": o embed não é clicável, é o corpo da página; o link é o
título acima. A entrada colada leva um fio à esquerda, para se ver onde a página para e a
entrada começa. Resolve UM nível: dentro da entrada colada, um embed fica pendente — é o
que impede o laço sem contador, e nenhuma das 19 tem embed dentro.

O que aponta para fora da base fica como antes, discreto com o alvo no `title`. Onde isso
acontece e quando volta: OPEN-DECISIONS #12.

### Os três atributos que sobrevivem

O parser de HTML descarta tudo que não é `class` — exceto `colspan`, `rowspan` e UM valor
de `style`, `float:right`, lido como `align: 'right'`. Os números que os fizeram entrar:
64 `colspan`/`rowspan` no zip, e a nota de rodapé de Skill Actions (`<td colspan="4">`)
caindo na primeira coluna; 5.400 `float:right`, que é o rodapé
`<em>Section: …</em><span style="float:right"><em>Player Core pg. 227</em></span>` de 50
das 67 páginas de regras — sem ele os dois `<em>` grudavam. Não é estilo inline permitido:
é um atributo semântico lido de onde o Foundry o escreve, e o CSS é nosso.

### Negrito: rótulo de bloco, não ênfase

Medido nas 809 descrições de condições e ações: **1.694 `<strong>`, e 1.683 (99,4%) abrem
o bloco em que estão.** Os que abrem são os rótulos estruturais do PF2e — `Effect` 258,
`Frequency` 191, `Requirements` 173, `Success` 167, `Trigger` 165, `Critical Failure` 144,
`Critical Success` 130, `Failure` 115, `Aspect` 67, `Activate` 50. Os 11 do meio são
referências de mapa (`A10`, `C45`): ênfase de verdade.

**Regra:** `<strong>` que abre o bloco vira rótulo — **latão + versalete**. `<strong>` no
meio da frase fica branco forte, como ênfase. A distinção é **estrutural**, detectada pela
posição no nó pai — nunca por lista de palavras, que quebraria na primeira fonte nova.

---

## 6. Campos estruturados

### Frequência

`per` vem em **ISO-8601 de duração** misturado com palavras. Medido nas 766 ações (177 têm
frequência):

| `per`   | quantas | significa         |
| ------- | ------: | ----------------- |
| `day`   |      95 | por dia           |
| `PT1H`  |      32 | por hora          |
| `PT10M` |      22 | a cada 10 minutos |
| `round` |      17 | por rodada        |
| `PT1M`  |       8 | por minuto        |
| `turn`  |       2 | por turno         |

`1 × PT1H` na tela é defeito. Precisa de decodificador com fallback para o código cru
quando aparecer forma nova.

A frequência **não aparece na prosa** — é campo estruturado. Não é omissão do texto.

### Livro e legado

- Mostrar **só o título do livro**. A licença (ORC/OGL) não vai na linha.
- "Legado" é marcação **por omissão**: só o legado é marcado; pós-remaster não ganha nada.
- Marcação distinta, não texto colado no nome do livro.

---

## 6b. Filtros: o super filtro

**Decidido:** a barra de filtros mostra só os **títulos dos tópicos**. Clicar num tópico
faz a **barra lateral trocar de conteúdo** e mostrar as opções daquele filtro; fechar
devolve a lateral à entrada que estava aberta antes.

Por quê: a barra de filtros não tem espaço para doze tipos de entidade, e ninguém consulta
uma entrada enquanto está montando filtro. A lateral é espaço morto naquele momento.

Consequências que o código tem que respeitar:

- A lateral tem **dois modos**, e o modo filtro é uma **camada por cima** (`position:
absolute; inset: 0`), não uma troca. Desmontar o detalhe perderia o `scrollTop`, e
  alternar `display: none` também o zera em alguns motores. Sobreposto, o detalhe fica
  montado e com layout, e o navegador nem toca na rolagem dele.
- Um tópico aberto por vez. Abrir outro fecha o primeiro **sem limpar** o que foi marcado.
- Os filtros aplicados ficam visíveis fora do painel, com `×` individual e um "limpar
  todos" — é o que já existe hoje e continua.
- Cada tópico é um **módulo declarado como dado** (`FilterTopic`), não um componente por
  tela. As doze telas escolhem quais tópicos usam; o que não se aplica, some. Um tópico
  novo é um descritor novo, e nenhuma tela existente muda.

### As espécies de tópico

| espécie     | lê                                               | par E/OU |
| ----------- | ------------------------------------------------ | -------- |
| `options`   | um campo de valor único                          | não      |
| `boolean`   | um campo de sim/não                              | não      |
| `list`      | um campo que guarda ARRAY (traços)               | **sim**  |
| `cost`      | `costKind` + `costCount` juntos, como um token   | não      |
| `rarity`    | domínio fechado e ordenado pelo jogo             | não      |
| `frequency` | `{max, per}` como um token, ordenado por duração | não      |
| `cast`      | o custo de conjurar da magia, pelo texto cru     | não      |
| `defense`   | CA, salvamento e CD passiva — MULTIVALOR         | não      |
| `number`    | uma FAIXA preenchível (mínimo e máximo)          | não      |
| `area`      | tipo (opções) + tamanho (faixa), no mesmo tópico | não      |

O par E/OU só aparece na espécie `list`, e o motivo é aritmético: num campo de valor único
o "E" daria sempre lista vazia, e um controle que só produz resultado vazio é armadilha.
Onde ele existe, a diferença é grande — medido nas 766 ações do `pf2e-8.5.0`,
`concentrate` OU `manipulate` dá **250** e o E dá **20**.

`cost` existe porque a pessoa pensa "as de duas ações", não "tipo ação com contagem dois".
Os dois campos viram um token (`1`, `2`, `3`, `free`, `reaction`, `passive`) e o filtro é
uma fileira dos próprios glifos — ela procura ◆◆, não a frase.

`list` existe porque `fieldValue` devolve string vazia para array: um filtro `options`
sobre `traits` enxergava as 766 ações como "sem valor". Era por isso que traços nunca
tinham aparecido como filtro.

### Defesa: quatro campos para uma linha do livro

**Decidido:** a defesa de uma magia é uma LISTA, montada de quatro campos, e o filtro é
multivalor como o de traços.

O campo `defense` da fonte não basta, e isto foi medido nas 1.994 e conferido contra o
Archives of Nethys entrada por entrada:

1. Se há **defesa passiva** declarada, é contra ela que o ataque rola — e ela SUBSTITUI a
   CA. `Murderous Vine` ataca a CD de Fortitude, e o AoN escreve "Defense Fortitude".
2. Senão, o **traço `attack`** já diz CA. É assim que a fonte modela: `Phase Bolt` tem
   `defense: null`, o traço `attack`, e o texto "spell attack roll against your target's
   AC". São **82** magias em que a CA existe só no traço — sem esta regra o filtro achava
   **6 de 94**.
3. O **salvamento SOMA**, não substitui. `Pulverizing Wake` ataca e ainda pede Fortitude
   básico; o AoN escreve "Defense AC and basic Fortitude". São 6 assim, e elas contam nas
   duas opções do filtro.

A **CD passiva dobra no salvamento de mesmo nome**: `fortitude-dc` é `fortitude`. São
mecânicas diferentes — rolar contra a CD não é fazer o salvamento —, mas a mesma defesa, e
o livro escreve as duas como "Defesa Fortitude". Separadas, o filtro tinha sete opções para
quatro defesas.

O preço, e ele está no teste de contrato: **quatro** entradas trazem o traço `attack` sem
ataque nenhum e ganham um "CA" que o livro não dá — `Incarnate Ancestry` e `Lucky Month`
(que têm `attack` como ÚNICO traço, o que denuncia o defeito), `Unseen Heralds` e
`Shambling Horror`. É erro da FONTE, não nosso, e o teste cai sozinho quando o Foundry
corrigir.

### Faixa numérica: quando a lista de opções não serve

**Decidido:** alcance e tamanho de área se filtram por **dois campos preenchíveis**
(mínimo e máximo), e não por lista de opções nem por controle deslizante.

Por quê, medido nas 1.994 magias do `pf2e-8.5.0`:

- **Lista de opções não cabe.** Alcance tem **57** valores distintos e área tem **72** — em
  qualquer um dos dois a lista é mais longa que a tela, e a pergunta que se faz não é
  "quais têm exatamente 120 pés", é "quais chegam a pelo menos 60".
- **Deslizante de duas alças não serve.** A distribuição é torta demais: o alcance vai de
  **0 a 5.280.000 pés** (1.000 milhas), e quase tudo cabe nos primeiros 500. Numa pista
  linear, 99% do dado ocuparia 0,01% do curso, e "exatamente 30" seria impossível de
  acertar com o mouse.

Consequências que o código respeita:

- Os limites moram no **mesmo `values: string[]`** das opções marcadas, como `min:30` e
  `max:60`. Assim eles atravessam sem mudança o que já existe: a gravação da preferência, o
  `×` do chip na barra, a contagem no crachá do tópico e o "limpar tudo".
- O valor só é **aplicado ao sair do campo ou no Enter**. A cada tecla, digitar `120`
  filtraria por `1`, `12` e `120` — e como o filtro é gravado, seriam três escritas em
  disco para uma decisão só.
- Quem **não tem número** sai quando há limite marcado. Não dá para afirmar que `planetary`
  passa de 30 pés — são 29 assim, mais 636 sem alcance nenhum, contra 1.329 lidos.
- O painel escreve **o que existe no dado** ("no dado: 5 a 36.960 pés"). Sem isso, um teto
  de 60 parece recortar quase tudo, e a pessoa não tem como saber que não.
- `area` junta tipo e tamanho no MESMO tópico, somados (E): "explosão de até 20 pés". Dois
  tópicos chamados "área" na barra obrigariam a abrir os dois para descobrir qual é qual.

---

## 6c. A busca global é uma PALETA

**Decidido:** Ctrl+Q abre uma paleta por cima de tudo — campo em cima, resultados embaixo —
que atravessa as fontes. Clicar num resultado abre o **painel flutuante** daquela entrada.

Direção: **de cima para baixo**. O Quick Insert do Foundry cresce para cima porque está
ancorado na barra do rodapé; esta flutua no alto, como a do Opera. E, mais importante, é a
mesma direção da tela de consulta, onde o campo já fica acima da lista — duas buscas com
direções opostas no mesmo app obrigariam a reaprender.

A linha usa a **mesma gramática da lista**: calha do nível, nome, etiqueta de raridade,
traços colados — e, na outra ponta, de que fonte aquilo veio. Essa última coluna é o que a
paleta acrescenta, e ela é necessária: sem a fonte, dois nomes iguais de tipos diferentes
seriam a mesma linha.

### O que a arquitetura exigiu

- **Os flutuantes subiram de camada.** Eles moravam no painel da fonte, que REMONTA ao
  trocar de fonte — e a paleta abre coisa de qualquer fonte. Um flutuante de magia aberto
  com talentos na tela morreria na próxima troca. Agora moram na tela, e cada painel
  carrega o próprio `entityType` e os próprios campos, em vez de ler o descritor da fonte
  em vigor (que passaria a desenhar campos de talento numa magia).
- **A paleta desmonta ao fechar, mas o índice não.** São duas exigências opostas: o DOM tem
  de nascer na abertura, senão o `useTrackWidth` mede um nó que não existe e o orçamento de
  traços fica em zero; e o índice não pode nascer de novo, senão cada Ctrl+Q paga uma
  leitura do IndexedDB. A divisão: estado visual dentro, índices na tela acima.
- **O fundo é um ELEMENTO, não um ouvinte no documento.** Com ouvinte, o mesmo clique que
  abre a paleta chega ao documento e a fecha no quadro seguinte.

### A busca por descrição, e por que ela é opcional

Um interruptor `nome`/`descrição` ao lado do campo. Medido sobre as 9.103 descrições reais
do `pf2e-8.5.0` — **5,70 MiB de HTML, 835.459 palavras**:

|                              |              |
| ---------------------------- | ------------ |
| montar o índice de descrição | **794 ms**   |
| memória                      | **22,5 MiB** |
| buscar, depois de montado    | 1 a 12 ms    |

Rápido o bastante para não valer um trabalhador em outra linha de execução, e caro o
bastante para não ser pago por quem só quer achar "Fireball" pelo nome. Por isso ele é
montado **na primeira vez que alguém liga o modo**, e não na abertura.

O ganho é real: "fire" acha **65** entradas pelo nome e **633** pela descrição. É a única
forma de perguntar "quais poderes causam sangramento", que era o exemplo do autor.

---

## 6d. Três defeitos de desempenho, e o que eles ensinam

Medidos no navegador com `PerformanceObserver` de `longtask` e um `MutationObserver`
contando nós. Entrar em talentos custava **1.396 ms de tela travada**; hoje custa **127**.

### 1. A janela nascia valendo a lista inteira

`useWindowedRows` começava com `end: total`. A lista só é montada QUANDO a base chega, ou
seja: o primeiro render desenhava as **6.284 linhas** e o efeito de layout cortava para 47
logo depois. Medido: **6.287 nós removidos** num lote só, ~1,1 s.

O estado inicial passou a ser 60 linhas. O efeito roda antes da PINTURA
(`useLayoutEffect`), então essa janela provisória nunca chega aos olhos de ninguém.

**A lição:** virtualizar não adianta se o estado inicial do virtualizador for "tudo".

### 2. `localeCompare` com opções constrói um colator por comparação

Ordenar é O(n log n) comparações, e cada `a.localeCompare(b, 'en', {…})` instancia um
`Intl.Collator` novo. Medido sobre os 6.284 talentos reais:

|                                  |            |
| -------------------------------- | ---------- |
| `localeCompare` com opções       | **234 ms** |
| um `Intl.Collator` reaproveitado | **5 ms**   |
| `sort()` sem colação nenhuma     | 1 ms       |

Quarenta e sete vezes, com semântica idêntica — `Intl.Collator` é o que o `localeCompare`
instancia por baixo. Trocar por `<` não serve: sem colação, "Á" não fica junto de "A", e a
tradução vai trazer acento.

**A regra do projeto:** nenhum `localeCompare` com o segundo e o terceiro argumento dentro
de um comparador. O colator vive em módulo, criado uma vez.

### 3. O rolador era procurado a partir do PAI

`roladorDe` começava em `no.parentElement`, o que valia enquanto o único uso era a lista de
consulta — lá a grade não rola, quem rola é a caixa em volta. Na paleta da busca global é o
contrário: a caixa que rola É o elemento medido. Sem achá-lo, o cálculo caía no ramo "nada
rola" e devolvia a lista inteira: **9.087 linhas no DOM e 1,3 s** ao abrir a paleta.

### O que NÃO foi preciso fazer

Nada de carregar em pedaços, nada de `requestIdleCallback`, nada de trabalhador em outra
linha de execução. As três correções são de uma linha cada, e depois delas sobra:

|                            | antes           | depois                          |
| -------------------------- | --------------- | ------------------------------- |
| entrar em talentos         | 1.396 ms        | **127 ms**                      |
| nós de DOM na troca        | 6.287 removidos | 63                              |
| abrir a paleta             | 1.280 ms        | **164 ms** (uma vez por sessão) |
| digitar 5 letras na paleta | 259 ms          | **nenhuma tarefa longa**        |

Ler a base do IndexedDB são 14 ms para os 6.284 talentos, e montar o índice de nomes são
20 ms — nenhum dos dois era o problema, e é por isso que vale medir antes de otimizar.

---

## 6e. O recorte por Tipo: coluna e filtro dependem do que está marcado

**Decidido:** as colunas e os filtros oferecidos mudam conforme os Tipos marcados. A regra
é **universal ∪ interseção dos marcados**:

| Tipos marcados | o que aparece                              | preset                  |
| -------------- | ------------------------------------------ | ----------------------- |
| nenhum         | só o universal                             | a visão geral           |
| **um**         | universal + os daquele Tipo                | **o dele liga sozinho** |
| dois ou mais   | universal + só o que eles têm **em comum** | nenhum                  |

O problema que isto resolve está em equipamento: nove espécies de item num catálogo só, e
**vinte e duas colunas** oferecidas de uma vez. Não são vinte e duas escolhas — são nove
conjuntos empilhados, e quem procura armadura não tem nada que ver com `recarga` nem com
`dano`. Com um Tipo marcado sobram oito.

O modelo é o Archives of Nethys, onde cada categoria tem sua própria tabela — a diferença é
que lá as colunas são fixas por página e aqui quem escolhe é a pessoa.

Por que a visão geral é a mais pobre: é a única em que uma coluna pode estar **vazia em 90%
das linhas**. Com nada marcado a interseção seria "tudo" pela convenção matemática, e por
isso o caso zero é escrito à parte.

Consequências que o código respeita:

- Cada coluna e cada filtro declaram `kinds` — a que Tipos pertencem. Ausente é universal.
  E os `kinds` de equipamento foram **medidos**, não supostos: `acBonus` é
  `['armor', 'shield']` porque são esses dois que o preenchem (185 de 211 e 126 de 126).
- A fonte declara qual filtro é o Tipo (`typeFilter`). Em quase toda ela é o `sector`, da
  pasta do compêndio; em equipamento é o `kind`, porque lá 5.706 dos 5.869 não têm pasta.
- A preferência de colunas passa a ser **por fonte E por Tipo** (`columnsByType`). É o que
  faz "armas com dano e mãos" e "armaduras com CA e limite de Destreza" conviverem sem uma
  apagar a outra — e o que faz voltar à arma reencontrar as colunas de arma.
- O preset só vale com UM Tipo marcado. Com dois, o preset de qual? A união daria colunas
  que metade das linhas não preenche; a interseção daria quase nada.
- **Nada virou seleção única.** Chegou a ser a proposta, e o número a derrubou: em talentos,
  General tem 41 entradas e existe para ser lido ao lado de Skill e Class. O recorte entrega
  o mesmo ganho sem tirar isso de ninguém.

## 6e-2. O trilho setorizado: pastas, e o Tipo como entrada

**Decidido (Etapa 27), pelo autor** — a divisão é dele, item por item:

    Personagem    Ancestralidades · Arquétipos · Biografias · Classes · Familiar · Companheiros
    Talentos      Todos · Ancestry · Class · Archetype · Skill · General · Mythic · Miscellaneous
    Habilidades   Todos · Ancestralidade · Classe · Chamado mítico
    Equipamentos  Todos · Weapon · Armor · Shield · Consumable · Ammo · Equipment · Treasure · Backpack · Kit
    Magias        Todos · Spells · Focus · Rituals · Impossible Spells
    Regras        Ações · Condições · Perícias · Regras · Divindades · Domínios

"Antecedente" virou **Biografia**. Os Tipos pequenos (Kit 2, Impossible Spells 5) entram
como estão: são o dado, e esconder cria entradas que só a busca acha.

**A entrada de Tipo não é fonte nova**: é a mesma fonte com o Tipo TRAVADO. "Talentos ›
Class" abre a lista de talentos com `Class` fixo — a etiqueta em bordô sem ×, a mesma da
trava das abas da tela completa; o tópico "Tipo" some da barra; e entram as colunas e os
filtros daquele Tipo, que é o recorte da seção 6e (`presets` e `kinds`) funcionando sem
ninguém marcar nada. "Todos" é a lista de sempre. É `RailEntry` em `core/browse/rail.ts`:
`{kind: 'source'}` ou `{kind: 'type', value}`.

**A trava não se grava.** O filtro gravado da fonte é um só, e "Todos" e as entradas de
Tipo o compartilham: a entrada de Tipo o lê com o Tipo por cima, e ao escrever devolve ao
lugar o Tipo que estava gravado. Assim "Todos" reencontra o recorte de ontem, e nenhuma
entrada de Tipo o mexe. As colunas já eram por Tipo (`columnsByType`), e a entrada cai
nelas sozinha.

**As pastas são um acordeão** (27c, pelo autor): todas nascem fechadas, só uma abre por
vez, e a aberta é ESTADO — bordô cheio, como a entrada escolhida dentro dela. Sem seta:
com uma só aberta, a cor já diz qual é. As entradas da aberta ficam num BLOCO (27d, pelo
autor): fio bordô à esquerda, fundo tingido de leve, respiro antes da próxima pasta — só
o recuo não separava "o que está dentro" das pastas fechadas logo abaixo. Fechada, a pasta onde a entrada aberta mora fica
com o texto em bordô — o "você está aqui" quando se abre outra para olhar. A aberta é
estado do trilho, não preferência: "sempre começam fechadas" é a regra, e gravar a aberta
a quebraria no primeiro recarregamento. Com termo na busca do trilho, toda pasta abre:
fechada, ela esconderia o que a busca achou — e a busca é por entrada, não por pasta
("arma" acha Equipamentos › Armas). Clicar na entrada aberta, ou trocar de Tipo dentro da
mesma fonte, volta à lista se a tela completa estava aberta.

Os Tipos saem em PORTUGUÊS no trilho (27b, pelo autor: "por hora só o trilho; os filtros
depois"): uma tabela por fonte e valor em `browse.rail.types` — Talentos › Classe,
Equipamentos › Armas, Magias › Rituais. O filtro e a coluna continuam com o dado como está
até a tradução dos filtros; quando ela vier, a tabela do trilho é a semente.

---

## 6f. O filtro é CONTEXTUAL: opções, contagens e presença

**Decidido:** um tópico de filtro só oferece o que existe no recorte em vigor, e o número
ao lado de cada opção responde **"quantas sobram se eu marcar esta"**.

Três coisas mudaram juntas, e todas nascem do mesmo defeito relatado na conferência da
Etapa 12: os filtros ignoravam uns aos outros.

**1. As opções saem do recorte, não da base inteira.** Com Tipo = Arma marcado, `Categoria`
mostrava as quinze categorias de consumível junto com as quatro de arma. Agora mostra
quatro.

**2. A contagem conta o que a lista vai mostrar.** Com Arma e "uma mão" marcados, a opção
"marcial" dizia **613** — todas as marciais da base — e clicar nela devolvia **430**, que
são as marciais de uma mão. O número respondia uma pergunta que ninguém tinha feito.

A base de um tópico é: o termo digitado, mais **todos os outros tópicos**, e não ele
mesmo. Não ele mesmo porque a contagem tem de responder "quantas sobram se ESTA for a
marcada aqui" — mantendo a própria seleção, marcar uma segunda opção faria todos os números
crescerem, e a lista deixaria de ser comparável consigo mesma.

A exceção é o **modo E** dos traços, onde marcar mais restringe: ali a seleção do próprio
tópico fica, e o número já responde "quantas sobram se eu somar esta". Medido nas 766 ações:
com `concentrate` marcado, `manipulate` vale 92 no modo OU e 20 no modo E — os dois certos,
cada um para o seu modo.

**3. Tópico que não pode mudar nada não aparece.** Com Tipo = Escudo, `Categoria` e `Grupo`
vêm vazios nos 126 — um botão que só pode não fazer nada. Some. A regra é "há mais de uma
resposta distinta no recorte?", e a conta sai no segundo valor distinto, então custa pouco
mesmo nos 5.869.

Dois nunca somem, por motivos diferentes:

- **o Tipo**, porque é ele que comanda o recorte; medido dentro do próprio recorte ele
  teria sempre um valor só, e desapareceria no primeiro clique;
- **o que está marcado**, porque esconder um filtro em uso tira da tela a explicação de por
  que a lista encolheu.

**O que a busca digitada NÃO faz:** ela entra nas contagens, mas não decide quais tópicos
aparecem. Se decidisse, a barra de filtros ganharia e perderia botões a cada letra, e o
botão que a pessoa ia clicar sairia de baixo do cursor.

---

## 6g. O que se clica abre PAINEL

**Decidido:** toda referência clicável — na prosa ou num campo do detalhe — abre a entrada
num painel. Não empurra texto para baixo, não troca a lateral.

**Uma exceção, e ela tem prazo:** a perícia abre a ação numa sub-tela embaixo, porque
perícia é a única fonte **sem texto próprio** — o corpo do painel está vazio e a sub-tela
ocupa um espaço que ninguém usa. No dia em que perícia ganhar descrição, a exceção acaba.

### Onde o clique leva

| onde se clica    | clique                                     | Ctrl+clique (ou o do meio) |
| ---------------- | ------------------------------------------ | -------------------------- |
| painel lateral   | painel novo                                | painel novo (é o mesmo)    |
| painel flutuante | **navega no lugar**, empilhando o anterior | painel novo                |

A lateral nunca navega no lugar: ela está presa à entrada escolhida na lista, e trocar o
conteúdo dela deixaria a lista marcando uma linha que o painel já não mostra.

O **Ctrl** e o **clique do meio** são o padrão do navegador e do explorador de arquivos. O
botão DIREITO não entra: ele é do menu de contexto em toda plataforma, e sequestrá-lo
brigaria primeiro com o navegador e depois com o Tauri.

**Sem configuração.** O modificador É a escolha, e é por clique em vez de global — quem
quer comparar duas coisas segura Ctrl uma vez, e não precisa lembrar de desligar depois.

### O voltar

Cada painel tem a própria pilha. O botão **aparece só quando há para onde voltar**, e some
quando a pilha esvazia — em vez de ficar cinza no canto de um painel recém-aberto,
sugerindo que falta algo. **Não há avançar:** ele se perde no primeiro clique depois de
voltar, e quase ninguém o usa.

### O que NÃO vira botão

Medido nas descrições das sete fontes que importamos: **19.157 links `@UUID`**, e
**16.598 (86,6%) apontam para uma entrada que a base tem** — todos na forma
`Compendium.…`, e 19.154 já trazem o `{rótulo}` pronto.

Os outros **2.559 continuam texto marcado e inerte**. Deles, 1.853 apontam para _efeito de
VTT_ (`spell-effects`, `feat-effects`, `equipment-effects`), que este aplicativo nunca vai
ter — não é "ainda não importamos", é "não existe aqui". Um botão que não faz nada é pior
que texto: ele promete.

E o destaque não é link azul. O Anexo A pede que se destaquem "sem virar um mar de links
azuis", e são 16.598 — continuam em latão, com a linha pontilhada virando sólida quando
abrem.

### Duas formas de ponte: por UUID e por slug

O texto do Foundry aponta por `@UUID`; os **campos** do Foundry apontam por **slug**. A
divindade guarda `domains: ['fire']`, `skill: ['medicine']`, `weapons: ['scimitar']` — e
`fire` só é único dentro de um tipo (é domínio e também traço). Por isso a segunda ponte é
`resolveSlug(tipo, slug)`, e o índice global guarda `bySlug` chaveado `tipo/slug`.

Na tela é a espécie `links`: a mesma caixinha das referências, resolvida pelo outro
caminho. O que não resolve (`void`, `wyrmkin`, `delirium` não têm página) fica texto.

E uma referência pode vir **sem nome**: a divindade guarda só o UUID das magias de
clérigo. Aí o nome vem do índice na hora de desenhar (`1º Breathe Fire`), e sem índice
sai o UUID — feio, mas honesto.

### O detalhe não repete a descrição

Corolário da mesma ideia: campo que a descrição já escreve **sai do cabeçalho** e fica só
em coluna e filtro, onde recorta. Foi assim em talento (`frequência`, `pré-requisitos`,
`repetições`) e em antecedente (`aumento`, `perícia treinada`, `Saber` — a descrição cita a
perícia em **440 de 440**).

Fica o que a descrição **não** garante. Em antecedente é o talento: só **379 dos 404**
trazem o `@UUID` no texto, e os outros 25 o citam por nome, sem link.

---

## 6h. A caixinha do traço

**Decidido:** parar o mouse sobre um chip de traço mostra o que ele quer dizer. Só traços
por enquanto — é o primeiro glossário, e o único que a fonte traz (ver ARCHITECTURE, "A
quarta camada").

Quatro decisões, e cada uma tem o número dela:

- **350 ms de atraso.** Sem ele, varrer a lista com o mouse faz uma caixinha piscar a cada
  linha — 6.284 talentos com três traços cada são 18 mil gatilhos numa rolada. Com ele, a
  caixinha só aparece para quem PAROU em cima, que é quem quer ler. Foco pelo teclado
  abre na hora: quem chegou pelo Tab já parou ali de propósito.
- **Portal para o `<body>`.** O chip mora dentro de uma lista com `overflow`, de um painel
  que rola e — nos flutuantes — de um elemento com `transform`, que faz `position: fixed`
  passar a ser relativo a ele. Qualquer um dos três cortaria ou deslocaria a caixinha.
- **Focável só no detalhe.** Na lista, três paradas de foco por linha vezes sessenta
  linhas inutilizariam o Tab — e a linha já é navegável pelo teclado.
- **Contexto, e não prop.** O glossário é dado ambiente, só de leitura, consumido num
  `<span>` que mora em quatro componentes em cinco arquivos, inclusive dentro dos
  flutuantes. Passá-lo por prop atravessaria a lista, a linha, o painel e o campo — e cada
  intermediário ganharia uma prop que ele não lê. (No `RichText` foi parâmetro, e a
  diferença é de propósito: lá eram três funções puras num arquivo só.)

O chip continua do chamador — a lista e o detalhe têm chips com CSS diferente, e o
componente não impõe um terceiro. Sem descrição no glossário, ele é o `<span>` que sempre
foi: nada muda para os 1,1% que a tabela do Foundry não explica.

---

## 6i. Tabelas na descrição, e o link sem linha

**Decidido (Etapa 20):** a referência clicável na prosa NÃO tem linha embaixo. Só a cor —
latão, que é dado de jogo em todo o sistema — e a linha aparece ao passar o mouse. A
referência que não abre continua com a pontilhada: é a rara, e a pontilhada é a marca de
"nota".

O motivo foi a página de um domínio: 40 nomes de divindade sublinhados numa lista. O Anexo
A pede que as referências se destaquem "sem virar um mar de links azuis", e um mar de
links em latão sublinhado é o mesmo mar com outra cor.

**As tabelas** quebravam porque o navegador reparte a largura pelo conteúdo, e "Arrest a
Fall" virava duas linhas com o glifo numa terceira. Três consertos, cada um com o número:

- **A célula compacta não quebra.** Nas 2.301 células que não são a última coluna das
  tabelas de regras, 2.282 têm o maior trecho com até 40 caracteres, 3 têm mais de 60, e
  nenhuma entre 41 e 60. Rótulo cabe em 40; prosa passa de 60. O trecho é cada `<p>` da
  célula, não a soma — uma lista de nove ações curtas continua curta.
- **`pf2-icon` é glifo**, como `action-glyph`: 24 usos nas regras, e sem isto o "R" de
  reação saía como letra ao lado do nome.
- **`sup` entra na lista de tags**: as letras E, D, G em sobrescrito ao lado das ações (44
  usos) caíam no texto como parte do nome.

E o cabeçalho da tabela fala na mesma voz dos rótulos do detalhe — mono, maiúsculas,
apagado — em vez de "Action" em peso 500 a dez pixels de "AÇÕES".

---

## 6j. As duas vassouras

**Decidido (Etapa 20):** dois botões em Configurações, "Apagar N entradas aposentadas" e
"Apagar a base inteira". Os dois em DOIS cliques: o primeiro troca o botão pelo aviso e
pelo par confirmar/cancelar, no mesmo lugar — sem diálogo por cima do painel, que já é a
camada de configuração. O aviso diz o que pode quebrar: hoje nada aponta para a base, mas
a ficha, o monstro, o combate e o escudo do mestre vão apontar.

Nenhuma das duas toca nas preferências: a base se refaz com uma sincronização; a largura
da coluna que a pessoa arrastou, não.

Apagar os aposentados sobe a **revisão** do `meta`, e é o que faz a lista reler a base sem
sincronizar — a versão da base, para a tela, é `syncedAt` + `revision`.

---

## 6k. A tela completa da entrada

**Decidido (Etapa 22b), pelo autor:** as três fontes grandes — ancestralidade, classe,
arquétipo — têm uma tela própria. A lista continua a lista de sempre, com filtro e
colunas; o painel lateral mostra o BÁSICO (a mecânica em campos e o resumo); e um botão —
no canto da linha ativa E na barra do painel, os dois fazendo a mesma coisa — troca a
lista e a lateral pela entrada inteira, com **abas em cima**, como o Archives of Nethys.

As regras (revistas na 22c, pelo autor):

- **Abre pelo botão da lateral ou pelo DUPLO CLIQUE na linha.** O botão na linha foi
  tentado e saiu: feio. O duplo clique já é "abrir de vez" em toda lista de arquivos.
- **O trilho de fontes não participa.** A tela completa ocupa as colunas da lista e da
  lateral (`grid-column: 2 / 4`); o trilho fica onde está. Clicar numa fonte ali sai da
  tela completa — inclusive na fonte JÁ aberta, que é "me leva para a lista dela".
- **A barra vai da área central até a lateral direita.** O Voltar tem a cara dos botões
  de recolher (é o padrão de "isto sai daqui"); depois o nome, a fonte, um fio vertical, e
  as ABAS logo ali (Etapa 24b, pelo autor: no canto elas ficavam longe do nome); o botão
  de tradução sozinho no canto direito.
- **Na aba de texto, a prosa fica onde a lista ficava e a lateral fica onde a lateral
  ficava** — a mesma lateral da lista, com a mecânica em campos. A pessoa não muda de
  lugar na tela para ler; muda só o que está escrito. A prosa usa a largura toda, com
  entrelinha 1,65; a medida de coluna de livro foi tentada e saiu.
- **Na aba de lista, a lateral é a da linha aberta** — a de sempre —, o filtro é TRAVADO
  (mostra que está travado, não deixa mexer) e as colunas são livres.
- **É estado, não rota.** A lista, o filtro e a linha escolhida continuam montados por
  baixo (o `SourcePane` só troca o que desenha); o Voltar devolve exatamente o que
  estava. Esc também volta.
- **Só entidade com abas abre tela completa.** Um talento aberto numa aba de lista não:
  ele não tem abas.

**Os títulos dentro da prosa** ("Society", "Sample Names") ganharam voz na 22c: `h2` em
18px na fonte de exibição, peso 400 — a voz do nome no cabeçalho —, com um fio embaixo;
`h3` em 15px. O espaço acima é maior que o abaixo: o título pertence ao que vem depois.
Até então quase não havia título em descrição; a página de ancestralidade tem sete.

As abas vêm da `spec` (`fullView.tabs`), como colunas e filtros: dado, com um desenhista
por espécie. A de texto (`kind: 'page'`, a página do jornal, com `fallback` para o resumo
quando não há página) e a de LISTA (`kind: 'list'`, Etapa 23): outra fonte com a trava
`{field, from, match}` — igualdade (`ancestry.slug` = o slug do Dwarf) ou pertencimento (o
traço `dwarf` nos `traits`). A aba de lista É o `SourcePane` com `lock`: mesma lista,
mesmas colunas, mesma lateral; a barra de filtros vira a etiqueta da trava (chip em bordô,
sem ×) mais Colunas, e os filtros gravados da fonte não entram. Aba com contagem, e aba
vazia não é desenhada. **A lista travada nasce por nível**, do mais baixo ao mais alto
(pedido do autor); onde não há nível, por nome.

A trava tem quatro formas: `equals`, `contains` (que aceita uma lista de onde travar — o
Aiuvarin conta como elfo, `countsAs: ['aiuvarin','elf']`, e leva os 50 talentos de elfo),
`is` (valor fixo) e `none-of` (a lista não tem nenhum valor de outra fonte — é como os 41
talentos universais se acham: de ancestralidade, sem traço de ancestralidade nenhuma).

**O apêndice "Mecânicas"** (Etapa 24, pelo autor): no fim da prosa da aba de texto, o
bloco de mecânica do livro como ele está escrito. A lateral mostra o que os campos dão; o
bloco tem o resto — 5 das 50 ancestralidades têm uma habilidade que só existe como texto.
Nasceu RECOLHIDO (a lateral já dizia o essencial); na 28 o autor o abriu de vez, para a
prosa ficar inteira no centro como na classe, onde nada recolhe. É `appendix` na aba de
texto: um campo de `desc/` e um rótulo, sob um fio e um título.

**A aba de lista anota e recorta** (Etapa 25b): `annotate` escreve numa CÓPIA de cada
linha um campo que só existe na aba — a origem do talento do arquétipo (próprio ou
adicional) — e o nível NO CONTEXTO (o Crossbow Ace é 1º como talento de ranger e 4º como
adicional do Archer; a aba ordena pelo 4). `columns` são colunas só da aba, sempre
visíveis e antes das outras; `filters` são os únicos que a barra travada mostra, com
estado local, não gravado. A fonte listada não sabe de nada disso.

**O arquétipo é a lateral mais a aba Talentos** (decisão do autor): a prosa e a dedicação
ficam na lateral; a tela completa é só a lista dos talentos, próprios e adicionais. A
origem (próprio/adicional) foi tentada como coluna e saiu: o Tipo do talento já diz.

**O pop-out leva à tela completa** (Etapa 25c, pelo autor): o link "Harrower" na
dedicação (o do meio do texto — o rodapé saiu na 26f) abre o arquétipo em flutuante, com
a lateral de sempre; o botão de tela completa
do flutuante troca a fonte, abre a entrada na tela completa dela — Talentos no arquétipo,
Detalhes na ancestralidade — e fecha o flutuante. Vale para toda entrada cuja fonte tem
tela completa. O pedido limpa o termo e os filtros da fonte de destino: entrada fora do
recorte não tem como abrir.

**A aba de ESCOLHA** (`kind: 'choices'`, Etapa 26a): a classe tem escolhas com lista —
a ordem do druida, a escola do mago, o instinto do bárbaro — e cada uma é uma aba com o
nome da habilidade que escolhe ("Druidic Order 9"). A spec não lista as abas: diz de onde
elas saem (`from: 'featureUuids'`, as habilidades da classe) e a tela EXPANDE — toda
habilidade cujo `ChoiceSet` filtra por `item:tag:X` vira uma aba de lista travada em
`tags ∋ X`. Uma aba por etiqueta, na ordem do nível da habilidade. É o mesmo desenhista da
aba de lista, com a trava `contains-value`; o que muda é que o rótulo vem do dado, não do
i18n — a habilidade já tem nome.

**A classe é a lateral básica mais a página** (decisão do autor): lista com atributo-chave,
PV, percepção e conjura; lateral com as proficiências iniciais; tela completa com Detalhes
(a página inteira do jornal, com as habilidades coladas), Habilidades por nível, Talentos,
Foco (as magias de foco com o traço da classe) e as abas de escolha.

**As proficiências, agrupadas pelo rank** (26b, pelo autor): uma linha por rank, do maior
para o menor, a caixinha do rank na frente e o que se é nele depois — "Especialista:
Vontade" em cima de "Treinado: Fortitude, Reflexos". É a ordem em que o livro escreve
("Expert in Will") e a ordem em que se procura: o olho acha o rank, não o nome. A forma
anterior ("Fortitude Treinado · Reflexos Treinado · Vontade Perito") lia ao contrário. Os
ranks em português: Destreinado, Treinado, Especialista, Mestre, Lendário.

**O atributo-chave que a subclasse abre** (26b): o pack diz `dex` para o ladino e nada
para o psíquico; a facção e a mente consciente é que abrem o resto, em
`subfeatures.keyOptions` das habilidades. A coluna diz "Des ou outro" (ladino) e "Int ou
Car" (psíquico). A lateral chegou a nomear o "outro" — cada atributo com as habilidades que
o abrem — e o autor tirou (26g): a facção é escolha da ficha, e a consulta só precisa
saber que existe. Fica a palavra; o dado continua em `keyAbilityOptions`.

**As perícias da classe numa linha** (26g, pelo autor): "Stealth · outro · +7" — as fixas
em caixinha, "outro" (apagado, em itálico) quando a escolha de 1º nível treina uma, e
"+N" para as à escolha. É o bloco "Skills" do livro em três caixinhas. O "outro" vem de
`subclassSkill`, derivado: alguma habilidade de 1º nível da classe é uma escolha e alguma
opção dela (pela etiqueta) mexe no rank de uma perícia nas regras — 10 das 29, e 9 batem
com o texto do livro ("trained in one skill determined by your druidic order"); o Ranger
entra pelo Vindicator, a única aresta que treina. É `kind: 'skills'` no detalhe.

**Atributos abreviados nas colunas** (26b, pelo autor, para todo o projeto): For, Des,
Con, Int, Sab, Car — a sigla da ficha. No detalhe, o nome por extenso continua em inglês,
como todo dado de jogo (OPEN-DECISIONS #4). Ver `attributeShort`; a perícia, cujo campo
vem escrito "Strength" da tabela do jornal, passa por `attributeShortByName` (26d).

**A lateral da classe com sub-abas** (26d/26e, pelo autor): na lista E na tela completa.
Em cima só a identidade — atributo-chave, PV, conjura, livro —; embaixo SUB-ABAS, com a
mesma barra das abas de cima em miniatura: **Detalhes** (a descrição de sempre, com
contexto e tudo — só na lista: na tela completa ela some, porque a página inteira está do
lado), **Progressão** (a tabela do livro, tirada da página do jornal pelo cabeçalho "Your
Level | Class Features" — 29 de 29, 20 níveis), **Proficiências** (percepção,
resistências, perícias, ataques, defesas — saíram de cima para não se repetirem) e
**Magias** (a tabela de magias por dia, "Your Level | Cantrips…" — 12 classes; a aba some
onde a tabela não existe, e por isso as tabelas são lidas antes de desenhar a barra). É
`side` na fonte: sub-abas de três espécies, `description`, `fields` e `table`; a tabela
vai para `desc/` porque é texto da Paizo, e a lateral a desenha compacta (fonte menor,
célula justa, rolagem lateral só se precisar — a de magias tem 12 colunas). O flutuante
de uma classe leva a mesma lateral. O autor viu a lateral da tela completa e a quis
também na lista: "ficou tão boa que é melhor ela nos dois".

**As abas de escolha na ordem da classe** (26e, pelo autor): não alfabéticas. A lista de
habilidades da classe sai por nível e, no mesmo nível, na ordem do pack — que é a do
livro: o Wizard ganha "arcane school, arcane bond, arcane thesis" nessa ordem, e o Psychic
"subconscious mind, conscious mind". As abas de escolha seguem essa lista.

**As barras de abas rolam com setas** (26f, pelo autor): as abas de cima e as sub-abas da
lateral ficavam engolidas numa janela estreita. As duas vão num `ScrollRail` — o mesmo
trilho dos filtros: degradê nas bordas e setas ‹ › só quando há o que rolar, cada uma
sumindo na ponta. O trilho toma o espaço entre a fonte e o Traduzir (`flex: 1`, base 0):
o nome não encolhe por ele.

**A rolagem da aba de texto é lembrada** (26c, pelo autor) enquanto a entrada está
aberta: ir a Habilidades e voltar a Detalhes devolve a altura. É um mapa que vive com a
tela (`useState(() => new Map())`, não ref — render não lê ref; quem lê é o efeito da
aba e quem escreve é o evento de rolar), com a chave `entrada/aba`. Morre ao voltar à
lista ou trocar de fonte; outra entrada na mesma tela (o pop-out que leva) começa do topo.
A devolução é um `useLayoutEffect` que espera a prosa chegar — a descrição vem do
armazenamento, e no primeiro render não há para onde rolar.

**Os cabeçalhos de tabela escritos para a ficha** (26c, pelo autor): "Your Level" vira
"Level" e "Class Features" vira "Features", na poda de leitura (`prune.ts`), só no texto
exato do `<th>`. Medido: 41 + 1 e 29 tabelas nos jornais.

**A dona da habilidade só dentro do Tipo** (26c, pelo autor): em Habilidades, a
ancestralidade dona e a classe dona são coluna e filtro por `kinds` — a primeira aparece
com só Ancestralidade marcada (rótulo "Ancestralidade"), a segunda com só Classe; na
visão geral, nenhuma das duas, e a coluna padrão é o Tipo, como em equipamento. Os
presets por Tipo ligam a dona sozinha. Numa aba travada não há Tipo marcado, e as duas
somem por conta própria.

**A aba de lista tem colunas padrão próprias** (`defaultColumns`, 26b): as habilidades da
classe não precisam de "de classe" — tudo ali é da classe — nem herdam o que a pessoa
ligou no trilho de Habilidades. A escolha de colunas da aba grava à parte (`aba:<fonte>:
<aba>`), com o padrão da aba; sem `defaultColumns`, o da fonte.

**Habilidades virou Características** (Etapa 33): a fonte `features` passou a se chamar
Características — "Característica de Classe" é como a tradução da comunidade escreve
`class feature`. Onde este arquivo diz "Habilidades" como nome de fonte ou de aba, leia
Características; o que era decisão continua valendo.

**Fonte fora do trilho** (`hidden`): a herança própria existe como fonte — carrega, indexa,
abre em flutuante, aparece na busca global — mas não é uma lista que se abre pelo trilho:
só faz sentido como aba de uma ancestralidade. Decisão do autor. A herança VERSÁTIL, que
não pertence a ancestralidade nenhuma, é Tipo da fonte de ancestralidade.

---

## 7. Preferências do usuário

Tudo que o usuário configura na tela **sobrevive** ao fechamento do app e às atualizações
da base. Guardado em `prefs/ui` no `StorePort` — chave própria, **fora** de `base/` e
`desc/`, porque preferência não é conteúdo da Paizo e não pode sumir numa sincronização.

| O que                            | Escopo    |
| -------------------------------- | --------- |
| Colunas visíveis e a ordem delas | por fonte |
| Último filtro aplicado           | por fonte |
| Largura da coluna de detalhe     | global    |
| Tamanho do pop-out               | global    |

Por fonte porque as colunas úteis de Talentos não são as de Magias, e os filtros nem
existem em comum. Global para o layout porque a largura confortável de leitura é da
pessoa, não do que ela está lendo.

**A posição do pop-out NÃO é preferência.** Tamanho é escolha sobre o painel; posição é
onde aquele painel está agora. Guardá-la faria dois pop-outs abertos juntos nascerem na
mesma coordenada, desfazendo a cascata.

### Contexto, com escrita adiada

`PreferencesProvider` envolve o app inteiro. Um `usePreference` por componente daria N
leituras do armazenamento e N escritores disputando o MESMO documento — a última gravação
apagaria as outras.

A gravação espera 400 ms de silêncio, e um `pagehide` força a pendente antes de a janela
fechar.

### Em curso não é assentado

O valor que o usuário está arrastando é **estado local**; ele só vira preferência quando o
gesto termina (`onEnd` do `usePointerDrag`). Gravar por quadro atualizaria o contexto por
quadro, e todo consumidor redesenharia junto — inclusive a lista, que tem 766 linhas em
Ações.

⚠️ **`onEnd` vem ANTES de `releasePointerCapture`.** Essa chamada LANÇA quando o elemento
não tem a captura, e ela pode não ter: o sistema cancela o ponteiro, o elemento sai da
árvore. Com a ordem invertida a exceção pulava o `onEnd` e o arrasto inteiro era descartado
em silêncio. Descoberto arrastando a lateral para 540, recarregando, e vendo 720.

### O decodificador é tolerante

O que está gravado veio de uma versão ANTERIOR do app: é entrada não confiável vinda do
passado. `readPreferences` nunca lança — campo que não reconhece é descartado, número
absurdo é recusado, e preferência ilegível vira preferência padrão. Uma exceção ali
derrubaria a tela na abertura, que é o pior momento possível.

### Colunas

O **nome** não é coluna escolhível: fica sempre primeiro, fora da lista. Uma linha de
resultado sem nome não identifica nada, e deixá-lo desmarcável faria alguém apagá-lo por
engano.

`SourceSpec.columns` é tudo que a fonte OFERECE; `defaultColumns` é o que aparece antes de
o usuário escolher. Separar as duas coisas permite oferecer uma coluna nova sem empurrá-la
para quem já configurou as dele.

Teto de **quatro** colunas ao lado do nome: a linha tem altura fixa e não quebra, então
sem teto o nome seria espremido até a primeira letra.

A ordem é editada com **setas**, não arrastando: são no máximo quatro itens, e setas
funcionam com teclado sem mecanismo extra.

### A linha da lista é uma GRADE

Era `flex` por linha, com `margin-left: auto` empurrando o que ia à direita. Aquilo desenha
uma linha e nada mais: cada linha resolvia o próprio espaço, então a coluna "categoria" da
linha 1 não caía sob a da linha 2, e **não havia onde pendurar um cabeçalho**.

Agora `grid-template-columns` é declarado uma vez, pelo componente (que é quem sabe quais
colunas estão ligadas), e vale para o cabeçalho e para todas as linhas. A linha em si usa
`display: contents`: ela não desenha caixa nenhuma, e as CÉLULAS dela participam da grade
do avô — é a única forma de células de linhas diferentes caírem na mesma trilha.

O fundo de seleção e o `hover` passam a ser de cada célula, já que a linha não tem caixa.

### As três colunas especiais

Elas pertencem ao NOME, e por isso ficam fora do teto de personalizadas:

```
 12  Godbreaker  ⌷R⌷  ⌷concentrate⌷ ⌷manipulate⌷ ⌷+2⌷
 ^   ^           ^     ^
calha nome   raridade  traços
```

| dado     | trilha                   | por quê                                      |
| -------- | ------------------------ | -------------------------------------------- |
| nível    | `3ch`, dígitos tabulares | largura fixa faz os nomes alinharem entre si |
| raridade | **nenhuma**              | etiqueta dentro da célula do nome            |
| traços   | **nenhuma**              | também na célula do nome, e por isso colados |

Raridade e traços não têm trilha própria porque, tendo, um nome curto deixaria os traços a
meia tela de distância dele. Na mesma célula, eles colam.

`SpecialColumns` no descritor diz quais a fonte TEM (`null` = não tem esse dado), e a
preferência guarda quais foram **desligadas** — assim a ausência já significa "todas
ligadas", e um dado fixo novo nasce visível sem migrar nada do gravado.

⚠️ **Quantos traços cabem é dinâmico, com UMA medição para a lista inteira.**

O elemento medido é a célula de TÍTULO do nome, que ocupa exatamente a trilha do nome. Uma
observação, e não uma por linha — 766 hoje, 6.284 nos talentos. Como o que se mede é a
trilha, a medida já responde a abrir a lateral, arrastar a borda e redimensionar a janela
sem saber que essas coisas existem. Cada linha só faz aritmética, a partir de constantes
medidas na tela: mono a 11px dá **6,6px por caractere**, Spectral a 15px dá **7,52px**.

A primeira medida é feita à mão em `useLayoutEffect`, e não esperada do observador. O
`ResizeObserver` avisa de MUDANÇAS, e há ambientes em que ele não roda — no painel de
automação do navegador, um observador avulso num elemento de 570px não disparou uma vez.
Confiando só nele, a largura ficava em zero e a lista mostrava um traço por linha achando
que não cabia mais nada.

O `+N` tem espaço RESERVADO sempre que ainda sobra traço: sem isso o último a caber
empurraria o `+N` para fora, e a linha mentiria por omissão.

⚠️ **A raridade é distinguida pela LETRA, não pela cor.** `I`, `R`, `U` em contorno de
latão; comum não desenha nada. O PF2e usa laranja/azul/roxo, mas o sistema tem seis cores
com trabalho definido. A cor sai de `--cor-raridade`, num lugar só, se o padrão do PF2e for
adotado depois.

Teto de personalizadas: **duas**. E o padrão de toda fonte é **nenhuma coluna ligada** —
só o nome e os dados fixos que ela tiver. Coluna é escolha, não herança.

O estado ABERTO/FECHADO do painel de detalhe é **derivado, nunca gravado**: ele está aberto
quando há o que mostrar (entrada escolhida ou camada aberta) e o usuário não o fechou.
Gravar isso fazia a página abrir com o painel escancarado e vazio — a escolha sobrevivia ao
recarregamento e a seleção não. O trilho de fontes é diferente: ele sempre tem conteúdo, e
ali "quero fechado" é preferência de verdade.

A largura da lateral tem teto de 640px **e nunca mais que metade da janela**: medido numa
janela de 900px com 640 guardados, sobravam 70px para a lista inteira.

### Recolher as laterais

As duas recolhem, e recolhidas viram uma **tira de 31px com o botão de reabrir**. A tira
existe para haver caminho de volta: devolvendo `null`, reabrir dependeria de alargar a
janela — impossível numa tela pequena.

O trilho de fontes recolhe **sozinho** abaixo de 900px, e isso **não vira preferência**.
São coisas diferentes: "eu quero ele fechado" é escolha e fica gravada; "não cabe agora" é
circunstância e passa quando a janela cresce. Guardar a segunda como se fosse a primeira
deixaria o trilho fechado depois, sem ninguém ter pedido.

Clicar numa entrada **reabre** o painel recolhido. A alternativa — abrir um pop-out — faria
o mesmo clique produzir coisas diferentes conforme um estado invisível, e cinco cliques
deixariam cinco janelas para fechar.

⚠️ **Nem toda leitura inicial vem do ouvinte.** `matchMedia` e `ResizeObserver` avisam de
MUDANÇAS. Uma janela que já nasce estreita nunca dispara uma, e uma trilha que já nasce
com 570px também não. Os dois hooks (`useNarrowScreen`, `useTrackWidth`) leem o valor na
hora e usam o ouvinte só para o que vier depois.

## 8. Pendências abertas

Feedback da conferência manual da Etapa 8, feita em 04/09/2026. Este bloco **encolhe**:
item feito sai daqui e o que virou regra sobe para as seções acima.

### Defeitos confirmados

Todos os onze foram corrigidos: nove na Etapa 8g, os dois de coluna na 8h.

### Decisões tomadas na conferência

- **Raridade: contorno de latão, miolo oco, letra em latão, canto cortado.** Medido, ela
  não é rara nas fontes que vêm: 53,6% das magias e 49,2% dos equipamentos são não-comuns
  (contra 0,3% das ações). Latão maciço em metade das linhas competiria com o nome. A cor
  sai de uma variável por raridade, para trocar num lugar só se o padrão do PF2e
  (laranja/azul/roxo) for adotado depois.
- **A prosa do detalhe não tem teto próprio; o painel para em 640px.**
- **Traços na coluna: orçamento de caracteres e um chip `+N`**, não rolagem por linha. Um
  trilho rolável por linha significa um `ResizeObserver` e um container de rolagem vezes
  766 linhas hoje e 6.284 quando chegarem os talentos.
- **Nível, Raridade e Traços ficam fora do teto de personalizadas**, que cai para duas.
- **Não existe ação de custo variável.** Medido nas 574 ações, 208 de aventura e 6.284
  talentos: `system.actions.value` é só `1`, `2`, `3` ou `null`. O filtro de custo cobre
  tudo, e o par E/OU continua sem sentido nele — nada tem dois custos ao mesmo tempo.

### Em desenho, aguardando decisão

- **Ordenação pelo cabeçalho** (possivelmente hierárquica). A linha de títulos já existe e
  é grade irmã das linhas, então a ordenação tem onde morar.
  _(Nada aberto no momento. As pendências abaixo foram decididas na abertura da Etapa 10.)_

### Decidido, e por quê

- **Texto justificado: NÃO.** Decisão do autor. A descrição segue alinhada à esquerda.
- **Traços em inglês.** Decisão do autor, fechando `OPEN-DECISIONS §4`: são chave de busca
  e é o que casa com o Archives of Nethys na hora de conferir.
- **Marcar os blocos de rótulo na máscara: depois.** Fica para quando soubermos quais
  rótulos as OUTRAS fontes omitem — marcar só o que conhecemos hoje daria uma máscara que
  teria de ser refeita a cada receita nova.
- **Pop-out a partir de referência em latão: depois.** Não é falta de índice, é falta de
  BASE: com três das doze fontes normalizadas, a maioria das referências apontaria para
  nada. Volta quando houver o que ligar.
- **Lista de packs a ignorar: não vai existir.** O aviso pode continuar como está, porque
  no fim quase tudo vai ser importado — traço de classe e afins precisam existir para
  serem referenciados pelas outras fontes.

### Entregue desde que esta lista foi escrita

- Coluna de traços com orçamento de caracteres — Etapa 8 (`fitTraits`).
- Virtualizar a lista — Etapa 9g: 42.905 nós no DOM viraram 416, e o refiltro dos 6.284
  talentos caiu de 266ms para 26ms.
- Ordenação por nome e por nível pelo cabeçalho — Etapa 9f.
- O botão de tradução segue desabilitado até a etapa da tradução.
