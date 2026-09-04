# Padrões de interface

Este arquivo é a **memória de trabalho da UI**. `ARCHITECTURE.md` guarda o porquê das
decisões de arquitetura; aqui ficam as regras que eu preciso reler antes de montar cada
uma das doze telas de listagem, para que a terceira saia igual à primeira.

Regra de ouro do projeto: **as listagens são o mesmo componente**. Mudam colunas, filtros
e algumas interações. Se uma tela precisar de um componente novo, ou o componente é
genérico o bastante para as outras onze, ou a diferença tem que estar escrita aqui.

---

## 1. Vocabulário visual

| Coisa                        | Significado                                                             | Onde                        |
| ---------------------------- | ----------------------------------------------------------------------- | --------------------------- |
| **Bordô** (`--color-state`)  | ESTADO da aplicação: selecionado, ativo, aposentado, barra do flutuante | nunca em dado de jogo       |
| **Latão** (`--color-accent`) | DADO DE JOGO: custo, referência cruzada, número que veio do Paizo       | nunca em estado             |
| Chanfro (`clip-path`)        | superfície clicável ou recorte de conteúdo                              | `chamfer-sm` / `chamfer-lg` |
| Spectral (`--font-display`)  | nomes de entrada e títulos                                              |                             |
| Mono (`--font-mono`)         | identificadores: traços, rótulos de campo, chaves                       |                             |

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

`@Localize` e `@Embed` puxam conteúdo de outro lugar. Enquanto não resolvem, aparecem
discretos com o alvo no `title` — mas **`@Localize` sozinho numa descrição é uma descrição
vazia**: a condição Sickened é exatamente isto, e na tela sai
`PF2E.condition.sickened.rules`. A chave existe na tabela de idioma que a receita já lê.

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

- A lateral tem **dois modos**, e o modo filtro é uma **pilha por cima**, não uma troca: ao
  fechar, a entrada anterior reaparece como estava, inclusive a rolagem.
- Um tópico aberto por vez. Abrir outro fecha o primeiro **sem limpar** o que foi marcado.
- Os filtros aplicados ficam visíveis fora do painel, com `×` individual e um "limpar
  todos" — é o que já existe hoje e continua.
- Cada tópico é um **módulo declarado como dado** (`FilterTopic`), não um componente por
  tela. As doze telas escolhem quais tópicos usam; o que não se aplica, some. Um tópico
  novo é um descritor novo, e nenhuma tela existente muda.

### Filtro de custo em ações

O filtro atual não distingue **quantas** ações. Precisa distinguir, e a forma é uma fileira
dos próprios glifos como alternadores: `◆` `◆◆` `◆◆◆` `◇` `↩` `—`. Marcar vários é **OU**.

Tópicos com muitas opções (traços, fonte) ganham o par **E / OU** explícito, como no AoN.
Onde só existe uma escolha sensata (raridade, custo) o par não aparece: controle que só
tem um valor possível é ruído.

---

## 7. Preferências do usuário

Tudo que o usuário configura na tela **sobrevive**: ao fechar o app e às atualizações da
base. Guardado por tipo de entidade — a preferência de Talentos não é a de Magias.

| O que                            | Persiste | Tem "limpar" |
| -------------------------------- | -------- | ------------ |
| Colunas visíveis e a ordem delas | sim      | sim          |
| Último filtro aplicado           | sim      | sim          |

Ordem das colunas é escolha explícita, não "ordem em que foi clicado". Clicar de novo no
mesmo atributo o remove.

Guardar onde: `StorePort`, chave própria, fora de `base/` e `desc/` — preferência não é
dado do Paizo e não pode ser apagada por uma sincronização.

---

## 8. Pendências abertas

Feedback das Etapas 8a/8b. Este bloco **encolhe**: item feito sai daqui e o que virou
regra sobe para as seções acima.

Feitos e removidos: **A** (máscara e campos) e **B** (costura e vocabulário) na Etapa 8c;
**C** (esqueleto da tela) na Etapa 8d. O que sobrou:

**D — o super filtro** (o maior; etapa própria)

1. Tópicos como dado (`FilterTopic`), painel do tópico ocupando a lateral (seção 6b).
2. Filtro de custo com os glifos; par E / OU onde faz sentido.

**E — preferências**

3. Seletor de colunas com preferência salva, por tipo de entidade, com ordem (seção 7).
4. Último filtro aplicado persistido, com "limpar".
5. A largura da lateral e o tamanho do pop-out ainda **não** persistem. Entram junto com
   as outras preferências, na mesma chave do `StorePort`.
