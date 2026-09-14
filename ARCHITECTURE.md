# Arquitetura

Documento de decisões. Cada escolha aqui tem um motivo escrito; se o motivo deixar de
valer, a escolha pode cair.

---

## 1. A estrutura de pastas

```
brfinder2e/
├─ .github/workflows/ci.yml     CI: formato, lint, tipos, testes, build
├─ index.html                   a única página. É um app, não um site.
├─ vite.config.ts               build + configuração do Vitest, num arquivo só
├─ eslint.config.js             regras — inclusive a fronteira de arquitetura
├─ tsconfig.app.json            regras de tipo do código do app
├─ tsconfig.node.json           regras de tipo dos arquivos de configuração
├─ tsconfig.scripts.json        regras de tipo dos comandos (só aqui existe "node")
│
├─ scripts/                     comandos de linha (Node)
│  └─ list-packs.ts             `npm run packs` — Etapa 1
│
├─ src/
│  ├─ main.tsx                  ponto de entrada: monta o React na página
│  ├─ App.tsx                   componente raiz
│  │
│  ├─ core/                     DOMÍNIO PURO. Sem React, sem DOM.
│  │  ├─ source/                ONDE o dado está        (briefing 4.1)
│  │  ├─ selection/             O QUE entra             (briefing 4.3)
│  │  ├─ normalization/         COMO vira entidade      (briefing 5) — motor pronto
│  │  ├─ store/                 a saída gravada         (briefing 5.2)
│  │  ├─ markup/                parser das 10 sintaxes  (briefing 7.6)
│  │  ├─ search/                índice e consulta
│  │  ├─ glossary/              termos de jogo          (briefing 8.1)
│  │  └─ types/                 tipos compartilhados
│  │
│  ├─ ui/                       TUDO que é React
│  │  ├─ design/                tokens: cor, fonte, espaço
│  │  ├─ components/            peças burras e reutilizáveis
│  │  ├─ screens/               sincronização, busca, detalhe, filtros, paleta
│  │  └─ hooks/                 hooks compartilhados
│  │
│  ├─ platform/                 adaptadores das portas do core (I/O concreto)
│  │  └─ http-fetch.ts          HttpPort sobre o `fetch` global
│  │
│  ├─ i18n/                     texto de interface, um arquivo por idioma
│  └─ test/                     preparo do ambiente de teste (não os testes em si)
│
└─ src-tauri/                   a casca nativa (Rust). Ver src-tauri/README.md
```

### Por que `core/` e `ui/`, e não `components/` e `utils/`

`utils/` é onde código vai morrer: não tem critério de entrada, então entra tudo.
A divisão aqui tem um critério verificável: **`core/` não pode importar React.**

Isso importa por três razões concretas neste projeto:

1. **Velocidade de teste.** Os testes do core rodam em Node puro. Não há jsdom, não há
   render. Vamos rodar receitas de normalização sobre 17.191 documentos — se cada rodada
   carregar um DOM falso, o ciclo de trabalho da seção 3.2 do briefing fica lento demais
   para ser usado a cada campo.
2. **A lógica difícil fica isolada.** O parser de `@Damage[2d6[fire]]` com contagem de
   profundidade não tem nada a ver com React. Se ele estiver dentro de um componente,
   testá-lo exige montar tela.
3. **Reaproveitamento.** Se um dia rodarmos a importação num script de linha de comando,
   o core vai junto sem arrastar React.

**A regra é vigiada pelo ESLint, não pela boa vontade.** Em `eslint.config.js`, o bloco
"A FRONTEIRA" transforma `import React from 'react'` dentro de `src/core/` em erro de
lint. Comentário não segura arquitetura; regra segura.

### Correspondência com o briefing

O briefing (seção 4) nomeia as camadas em português. O código está em inglês (ver seção 2),
então esta é a tabela de tradução:

| Briefing        | Pasta            |
| --------------- | ---------------- |
| `fonte/`        | `source/`        |
| `selecao/`      | `selection/`     |
| `normalizacao/` | `normalization/` |
| `base/`         | `store/`         |

`base/` virou `store/` porque "base", em inglês, não carrega o sentido de "saída gravada".

---

## 2. Idioma: código em inglês, comentário em português

A regra, em uma frase: **tudo que o computador lê fica em inglês; tudo que só a pessoa lê
fica em português, com acento.**

| Em inglês                                                          | Em português                                |
| ------------------------------------------------------------------ | ------------------------------------------- |
| Pastas e nomes de arquivo                                          | Comentários no código                       |
| Identificadores: variável, função, tipo, componente                | Documentação `.md`                          |
| Tokens CSS (`--color-bg`, `--space-4`)                             | Mensagem de commit                          |
| Chaves de tradução (`app.name`, `skeleton.title`)                  | Os **valores** dentro de `src/i18n/` — a UI |
| Scripts do `package.json`, nomes de job no CI                      |                                             |
| Strings de erro voltadas ao desenvolvedor (`throw new Error(...)`) |                                             |

### Por que assim, e não tudo em português

O argumento decisivo é específico deste projeto: **o domínio já chega em inglês e assim
permanece.** `feat`, `spell`, `condition`, `heritage`, `trait`, `ChoiceSet`, `subfeatures`,
`system.publication` vêm dos packs do Foundry e, por decisão fechada (briefing, seção 8),
não são traduzidos. Português não compraria consistência — só trocaria um híbrido por outro:

```ts
// híbrido A — o que evitamos
nome: de('name'),
valorada: de('system.value.isValued', booleano).padrao(false),

// híbrido B — o que temos
name: from('name'),
valued: from('system.value.isValued', boolean).withDefault(false),
```

E troca pelo híbrido que atrapalha justamente a atividade mais repetida do projeto: auditar
campo por campo contra o JSON cru e contra o Archives of Nethys. Em inglês a conferência é
1:1.

Dois motivos secundários: identificador com acento quebra na prática (caminho no Windows,
import, git), o que forçaria escrever português errado — `normalizacao`, `padrao`, `opcao`;
e o ecossistema inteiro (`map`, `filter`, `useState`, mensagens de erro, documentação) é
inglês, então mistura produz `normalizacao.map(...)`.

O que se perde: o briefing deixa de ter correspondência literal com o disco. Custo pago com
a tabela de tradução da seção 1.

**Nota:** `.withDefault()` e não `.default()` — `default` é palavra reservada e, embora
funcione como nome de método, atrapalha ferramenta e leitura.

---

## 3. TypeScript: por que tanto rigor

O template do Vite nem liga o `strict`. Ligamos ele e mais cinco opções. Cada uma paga uma
dívida específica deste projeto:

| Opção                                   | O que impede                                                                                                                            |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `strict`                                | O básico: `null` e `undefined` deixam de ser invisíveis.                                                                                |
| `noUncheckedIndexedAccess`              | `list[0]` passa a ter tipo `T` ou `undefined`. **Vital aqui:** o JSON do Foundry está cheio de array que às vezes vem vazio.            |
| `exactOptionalPropertyTypes`            | Distingue "campo ausente" de "campo presente valendo `undefined`". A receita da seção 5 do briefing depende dessa diferença.            |
| `noPropertyAccessFromIndexSignature`    | Obriga `doc['system']` em vez de `doc.system` quando o tipo é um mapa aberto. Torna visível, no código, onde estamos adivinhando campo. |
| `noImplicitReturns`                     | Função que retorna em um ramo e esquece no outro. Clássico em normalizador com muitos `if`.                                             |
| `noUnusedLocals` / `noUnusedParameters` | Código morto some no ato, em vez de acumular.                                                                                           |

**Nota de migração:** `baseUrl` foi removido do `tsconfig.app.json` porque o TypeScript 6
o marca como deprecado (para de funcionar no 7). Os `paths` agora são relativos ao próprio
arquivo (`"./src/core/*"`), que é a forma suportada.

### Apelidos de caminho

`@core/*`, `@ui/*`, `@i18n/*`, `@test/*`. Declarados **só** em `tsconfig.app.json`; o
Vite 8 lê dali via `resolve.tsconfigPaths: true`. Um lugar só, valendo no editor, no build
e nos testes.

Evita `import { x } from '../../../core/markup/parser'` — que, além de ilegível, some com
o rastro de qual camada está chamando qual.

---

## 4. Lint: ESLint em vez do oxlint que veio no template

O `create-vite` 9 passou a instalar **oxlint**, escrito em Rust e muito mais rápido.
Trocamos por **ESLint + typescript-eslint com regras "type-checked"**, e o motivo é
específico:

Regras type-checked consultam o **compilador**, não só a sintaxe. Duas delas justificam a
troca sozinhas neste projeto:

- `no-floating-promises` — a camada `source/` vai baixar 34 MB, descompactar e gravar. Um
  `await` esquecido produz bug silencioso e não-determinístico. O oxlint não pega.
- `no-unsafe-assignment` / `no-unsafe-member-access` — o documento do Foundry chega como
  `unknown`. Estas regras forçam validação explícita antes de tratar o campo como string.
  **É exatamente o erro que as tentativas anteriores cometeram.**

O custo é tempo: o lint fica na casa de segundos em vez de milissegundos. Aceitável.

**Prettier cuida do formato, ESLint cuida do sentido.** `eslint-config-prettier` entra por
último e desliga toda regra de estilo do ESLint, para os dois nunca brigarem.

**Nota de migração:** `tseslint.config()` está deprecado. A forma atual é `defineConfig`,
importado de `eslint/config` (núcleo do ESLint 10).

---

## 5. Testes: Vitest, com dois projetos

Vitest em vez de Jest porque compartilha a configuração e o pipeline do Vite — apelidos de
caminho, TypeScript e plugins já funcionam sem uma segunda configuração paralela.

A configuração declara **dois projetos**, espelhando a fronteira:

| Projeto | Ambiente | Arquivos                               |
| ------- | -------- | -------------------------------------- |
| `core`  | `node`   | `src/core/**/*.test.ts`                |
| `ui`    | `jsdom`  | o resto, com `src/test/setup.ts` no ar |

Os testes de contrato (`*.contract.test.ts`) ficam fora dos dois — ver seção 7.

Assim o teste de uma receita de normalização não paga o custo de montar um DOM falso.
`src/core/sanity.test.ts` **verifica que `document` não existe** no projeto do core — se
alguém trocar o ambiente sem querer, o teste acusa.

Os testes ficam **ao lado do código** (`parser.ts` e `parser.test.ts` na mesma pasta), não
numa árvore `test/` espelhada. Motivo: mover ou apagar um módulo leva o teste junto, e a
ausência de teste fica visível no próprio diretório. (`src/test/` guarda só o preparo do
ambiente, não testes.)

**Nota de migração:** `environmentMatchGlobs`, que aparece em tutoriais de Vitest 2 e 3,
foi **removido no Vitest 4**. `projects` é a API atual.

---

## 6. Centralização (briefing, seção 8)

Três arquivos concentram o que costuma vazar por todo lado:

| O que                   | Onde                         | Regra                                             |
| ----------------------- | ---------------------------- | ------------------------------------------------- |
| Cor, fonte, espaçamento | `src/ui/design/tokens.css`   | Nenhum componente escreve `#hex` ou pixel solto.  |
| Texto de interface      | `src/i18n/pt-BR.ts`          | Nenhuma string visível fica dentro de componente. |
| Onde o dado mora        | `src/core/source/` (Etapa 1) | Nenhuma URL do GitHub fora dali.                  |

Os tokens usam **CSS custom properties** (`--color-bg`) em vez de constantes TypeScript.
A alternativa seria exportar um objeto JS e usar estilo em linha. Fica pior aqui porque:
trocar de tema em runtime viraria re-render de React (com custom properties basta trocar o
valor no `:root`), e porque estado como `:hover` e `:focus-visible` não existe em estilo em
linha. O briefing pede tema trocável pelo usuário — custom properties entregam isso de
graça.

Os valores atuais em `tokens.css` são **provisórios**. A paleta real é decidida na Etapa 4.

---

## 7. A camada `source/` e a terceira pasta, `platform/`

Medido em 26/08/2026, direto contra o GitHub:

| Endpoint                           | CORS                             |
| ---------------------------------- | -------------------------------- |
| `api.github.com` (listar releases) | `Access-Control-Allow-Origin: *` |
| download do `json-assets.zip`      | **nenhum cabeçalho CORS**        |

Consequência: **o download não pode acontecer dentro do navegador.** Isso não estava no
briefing e é o fato que desenha a camada.

Por isso `core/source/ports.ts` define uma porta `HttpPort` em vez de chamar `fetch`
direto. O mesmo código de domínio roda em três hospedeiros:

| Host              | Adaptador                 | Quando                            |
| ----------------- | ------------------------- | --------------------------------- |
| Node              | `fetch` global            | hoje: `npm run packs` e os testes |
| Navegador em dev  | proxy do Vite             | Etapa 4                           |
| Tauri em produção | `@tauri-apps/plugin-http` | Etapa 15                          |

Os adaptadores moram em `src/platform/` — nem domínio (fazem I/O), nem UI (não são React).
A dependência aponta numa direção só: `platform/` conhece `core/`, nunca o contrário. A
regra da FRONTEIRA no ESLint também proíbe `core/` de importar `@platform/*`.

`src/platform/http-fetch.ts` não importa nada de `node:` de propósito: `fetch`, `Response`
e `Uint8Array` são APIs web, presentes no Node 18+, no navegador e na webview do Tauri.
Um arquivo, três hospedeiros.

### Ler o zip sem descomprimir

A biblioteca é a `fflate` — JavaScript puro, roda igual nos três hospedeiros. A alternativa
seria o `zlib` do Node, que resolveria hoje e obrigaria a uma segunda implementação na
Etapa 4.

O detalhe que faz diferença: `unzipSync` chama `filter` com os metadados de cada entrada
**antes** de inflar. Devolvendo `false` para tudo, lemos os 158 nomes e tamanhos em ~1 ms
sem materializar os 168 MiB descomprimidos.

### O teste de contrato

`src/core/source/source.contract.test.ts` bate no repositório de verdade (briefing 4.2).
Fica **fora** do `npm test` — toca a rede, baixa 34 MiB e depende da cota da API. Um teste
assim dentro da suíte normal transforma "meu código quebrou" em "às vezes falha", e aí
ninguém confia mais no verde.

Roda por `npm run test:contract`, semanalmente em CI, e em PR que mexa em `source/` ou
`platform/`. As asserções conferem **forma, não conteúdo**: contar 43 condições quebraria
a cada release sem que o contrato tivesse mudado.

---

## 8. O motor de receita (`core/normalization/`)

A receita é a **especificação legível** do briefing, seção 5: você lê a receita e vê a
regra, sem ler o normalizador. Três decisões tomadas na Etapa 2, com o autor:

**Os blocos têm o nome das pastas onde o resultado é gravado** (seção 5.2). Ler a receita
mostra na hora o que carrega no boot e o que é sob demanda:

| Bloco    | Vai para | O que é                                     |
| -------- | -------- | ------------------------------------------- |
| —        | `raw/`   | o documento inteiro. Não se declara.        |
| `base`   | `base/`  | leve, carrega no boot, alimenta a busca     |
| `desc`   | `desc/`  | pesado, carregado sob demanda               |
| `ignore` | —        | olhei e não serve. Com o motivo escrito     |
| `defer`  | —        | olhei, serve, mas não agora. Fica em `raw/` |

São **três** disposições, não duas (seção 3.2: "projeta / ignora com motivo / adia").
`ignore` e `defer` somem do relatório; a diferença é a intenção registrada.

**O decodificador é obrigatório em todo `from()`.** `from('name', text)`, nunca
`from('name')`. O JSON do Foundry chega sem tipo, e tratar campo não validado como string
foi o erro das duas tentativas anteriores.

**`fromLang()` lê da tabela de idioma**, com modelo resolvido contra o documento:
`fromLang('PF2E.condition.{system.slug}.summary', text)`. Existe porque há conteúdo que só
mora lá — `summary` está em 42 das 43 condições e em nenhum pack.

**`fromJournal()` lê uma página de jornal pelo nome**, da segunda tabela de consulta do
motor: `fromJournal('Ancestries', '{name}', html)`. Existe porque há entrada que mora em
DOIS lugares — a ancestralidade tem a mecânica no pack `ancestries` e o texto do livro no
jornal `Ancestries` (50 páginas com o mesmo nome, 4.693 a 13.239 caracteres, contra 231 a
1.123 do resumo do pack). Uma receita lê um documento; a página entra como a chave de
idioma entra: por tabela, resolvida contra o documento. `indexJournalPages` monta a tabela
uma vez por sincronização (`<jornal>/<página>` → HTML), e sem o pack `journals` ela fica
vazia e a página fica vazia — nada falha. Classe e arquétipo têm a mesma forma.

### A garantia de que nada some (seção 5.1)

O motor monta o inventário de todo caminho-folha do documento e subtrai o que a receita
cobriu. A diferença é o relatório de não mapeados, com frequência e exemplo.

A peça que faz isso funcionar são **dois tipos de cobertura**:

- `subtree` — o caminho e tudo abaixo. É o que um decodificador de folha faz.
- `exact` — só o caminho. É o que `shape` faz.

Por isso `shape({ license, title })` sobre `system.publication` **não** esconde
`system.publication.remaster` — que é falso em 5.872 entidades (7.8). Se `shape` cobrisse
a subárvore, esse campo sumiria calado.

O inventário percorre **todos** os elementos de cada array, não o primeiro. É o que faz
aparecer a chave que só existe em 3 dos 6.283 talentos.

E registra o caminho do **contêiner** — array ou objeto — sempre, cheio ou vazio. Sem isso
a frequência mente: `system.traits.selected` existe em 8 das 574 ações e aparecia como
"2/574", só os dois em que o objeto estava vazio. Para o nó de passagem não virar ruído,
`isCovered` o considera coberto quando algo DENTRO dele foi lido: `system` não precisa
aparecer no relatório só porque a receita leu `system.slug`.

### O tipo de saída vem da receita

`recipe<TBase, TDesc>({...})` recebe as interfaces de saída, e `FieldMapFor<T>` obriga cada
campo a produzir o tipo declarado. `from('system.value.isValued', text)` num campo
`boolean` vira erro de compilação, não surpresa em runtime.

O ganho aparece no consumidor: `entity.base.name` é `string`, não `unknown`. Sem isso, a
tela de busca começaria com `entity.base['name'] as string` em todo lugar — exatamente o
padrão que as regras de lint proíbem.

### Uma terceira fonte de campo: a pasta do compêndio

`fromFolder('folder', text)` lê o ID de pasta do documento e devolve o nome da pasta RAIZ,
resolvido por `<pack>_folders.json`. Mesma mecânica do `fromLang`, e pelo mesmo motivo: o
valor não está no documento, está numa tabela ao lado.

O briefing 7.2 manda ignorar esse arquivo — e está certo, não é entidade. Mas é o ÚNICO
dado da base que separa as 30 ações básicas das 196 de classe: nenhum traço marca uma ação
como básica. Não é entidade; é metadado, e metadado útil.

O leitor distingue **três** situações, e a diferença entre elas é decisão de receita:

| No documento               | Resultado                              | Por quê                                                                                                           |
| -------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| chave `folder` ausente     | **ausente** → vale o padrão da receita | o pack não organiza em pastas. É o que marca as 192 ações de aventura como `Adventure`                            |
| chave presente, sem tabela | presente, vazio                        | não dá para resolver; cair no padrão marcaria tudo como de aventura                                               |
| chave presente, pasta órfã | presente, vazio                        | `Disengage` aponta para uma pasta que não existe no arquivo. Defeito do dado do pf2e, não ausência de organização |

### Uma receita pode aceitar vários TIPOS

`RecipeInput.accepts` diz quais valores de `type` do Foundry alimentam a receita; ausente,
vale só o `type` dela. Existe desde a Etapa 12, e o motivo é equipamento: o pack
`equipment-srd` tem **nove tipos** — `equipment` 2394, `consumable` 1703, `weapon` 1018,
`ammo` 216, `armor` 211, `treasure` 153, `shield` 126, `backpack` 46, `kit` 2.

Nove receitas dariam nove fontes no trilho para responder "quanto custa uma espada longa?",
e a busca de uma fonte deixaria de achar as outras oito. O que separa os nove vira DADO, no
campo `kind`, que é o **Tipo** da tela.

⚠️ E equipamento é a primeira fonte em que **o Tipo não vem da pasta**: 5.706 dos 5.869 não
têm pasta nenhuma. A pasta responde 3% da base e vira o campo `family` (as famílias de item
mágico: `Aeon Stones`, `Spellhearts`, `Staves`…).

### Uma receita pode ler vários packs

`recipe.packs` é uma lista e o motor lê TODOS. `action` lê dois — `actionspf2e` (574) e
`adventure-specific-actions` (192 do tipo `action`, mais 16 do tipo `feat` que o filtro de
tipo descarta). A camada `raw/` grava um arquivo por pack.

### Formas alternativas

`oneOf({...})` para campo que muda de forma — o caso do briefing 7.8, com as cinco formas
de `ChoiceSet` em 641 ocorrências. Forma não reconhecida vira erro com o valor real, o que
impede uma sexta forma numa versão futura passar batido.

### As três camadas gravadas (seção 5.2)

`npm run normalize` grava em `.dados/`, que o `.gitignore` barra:

| Arquivo                   | O que é                                    |
| ------------------------- | ------------------------------------------ |
| `raw/conditionitems.json` | os bytes do pack, **idênticos** aos do zip |
| `base/condition.json`     | a projeção leve, com id e uuid             |
| `desc/condition.json`     | as descrições, chaveadas por UUID          |

`raw/` é gravado a partir dos bytes da entrada do zip, **antes** de qualquer projeção e
nunca a partir dela — há teste que confere byte a byte. É o que mantém aberta a porta da
exportação para o Foundry (OPEN-DECISIONS, item 1).

Gravar com `node:fs` é escolha do **comando**, não do domínio. A camada `core/store/` com
porta própria entra na Etapa 4, junto com a tela de sincronização que vai precisar dela.

### A tabela de talentos por nome

A terceira tabela de consulta (`normalization/feats-index.ts`), ao lado da de idioma e da
de jornais: nome → `{uuid, level, snippet}`. Nasceu para a dedicação que a página do
arquétipo não cita (o Guardian): a receita acha "<Nome> Dedication" e aceita só se o
começo da descrição do talento está no texto da página — a dupla verificação pedida pelo
autor. O trecho guardado é curto de propósito: é chave de conferência, não conteúdo.

### O campo derivado lê as tabelas

`fromDocument((document, tables) => …)`: o derivado recebe, além do documento, as tabelas
de consulta (`language`, `journals`). A primeira conta que precisou das duas coisas foi a
alteração de descrição (`normalization/alterations.ts`): o texto é uma chave de idioma
dentro de uma regra do documento. Continua sem marcar cobertura, pelo motivo de sempre.

### A revisão das receitas

A base é calculada na sincronização. Código novo com base velha mostra dado velho — e foi
assim que uma mudança de receita pareceu não ter acontecido (Etapa 22c). `RECIPES_REVISION`
(`core/sync/revision.ts`) sobe toda vez que uma receita muda o que grava; vai para o
`meta`; quando o do app é maior que o gravado, a barra de topo pede sincronização. Sobe por
mudança de `base`, `desc` ou `expand`; não sobe por mudança de tela.

### A quarta camada: o glossário (`core/glossary/`)

Desde a Etapa 15b há uma chave que **não é por tipo de entidade**: `glossary/traits`. É o
que cada traço quer dizer, para a caixinha que aparece ao passar o mouse.

Um traço não é documento de pack nenhum. O texto dele mora na **tabela de idioma** do
Foundry, em `PF2E.TraitDescription<Nome>` (536 no `pf2e-8.5.0`), e o rótulo em
`PF2E.Trait<Nome>` (908). A sincronização já funde essa tabela para as receitas; o
glossário é construído dela e gravado junto — nasce do mesmo zip e envelhece com ele.

Chave própria em vez de esconder dentro de `desc/`: `desc/` é chaveada por entidade, e um
traço não é uma. E **substituído inteiro** a cada sincronização, sem diff nem lápide: as
entradas têm as duas coisas porque uma ficha pode apontar para uma que sumiu, e nada
aponta para um traço além do mouse parado em cima.

A regra do **sufixo** mora em `lookupTrait`: `deadly-d8` não existe na tabela e `deadly`
existe, e a descrição de `deadly` foi escrita para isso ("of the listed size"). Medido:
36 traços parametrizados, 685 usos, nenhum com descrição própria. Cobertura final: 98,9%
dos 34.086 usos nas sete fontes importadas.

---

## 9. A camada de UI

O sistema de design vem do mockup "Forja PF2e — Consulta", artboard 1a, transcrito em
`src/ui/design/tokens.css`. A regra que mais decide: **bordô só carrega estado** (seleção,
foco, progresso) e **latão só carrega dado de jogo** (nível, custo em ações, raridade,
contagem de entradas). Nenhuma cor é decorativa.

### Fontes embarcadas, não CDN

O app é offline. O mockup carregava Spectral e IBM Plex do `fonts.googleapis.com`; sem
rede, as duas somem e o sistema de dois papéis cai inteiro no fallback. Os `.woff2` moram
em `src/ui/design/fonts/` — 10 arquivos, 214 KiB, ambas as famílias sob OFL 1.1 (a licença
está junto). `IBM Plex Sans` é variável: um arquivo por subset cobre 400, 500 e 600.

### Estilo: CSS Modules

Um arquivo `.module.css` ao lado de cada componente. Classe com escopo local, zero runtime,
suporte nativo do Vite. As alternativas ficam piores aqui: CSS global colide em nome com
vinte componentes; estilo em linha não faz `:hover` nem `:focus-visible`; CSS-in-JS traz
runtime e dependência sem resolver problema nenhum que a gente tenha.

O custo aparece no acesso: um CSS Module chega tipado como `Record<string, string>`, então
com `noPropertyAccessFromIndexSignature` e `noUncheckedIndexedAccess` a leitura é
`styles['panel']` e o tipo é `string | undefined`. É honesto — a chave não é verificada
mesmo — e o `cx()` de `src/ui/cx.ts` absorve o `undefined` ao juntar classes. Se um dia
incomodar, a saída é gerar `.d.ts` das classes, não afrouxar as regras.

### O chanfro

`clip-path: polygon(...)`, não `border-radius` — arredondamento não faz corte assimétrico.
Três utilitários globais em `base.css` (`.chamfer-sm/md/lg`) porque a forma vale para
qualquer elemento e não deve ser reimplementada por componente. O `clip-path` recorta
sombra e borda junto, o que aqui não custa nada: o sistema separa superfície por cor.

### Estado

`useReducer` num hook (`useSync`), com o estado modelado como união discriminada. Estado
inválido — "carregando e com erro ao mesmo tempo" — deixa de ser representável, e o
`switch` na tela fica exaustivo. Biblioteca de estado seria peso sem problema: este estado
pertence a um componente, não ao aplicativo.

O `useSync` mora na barra de topo e não dentro do painel, porque a barra também mostra o
resultado. Dentro do painel, fechar a engrenagem desmontaria o componente e zeraria a
sincronização.

### Persistência: `core/store/`

A porta é deliberadamente pequena — `get`, `put`, `delete`, `keys`, `clear`. Uma porta com
um método por camada (`readBase`, `writeDesc`…) obrigaria os três adaptadores previstos
(Node, IndexedDB, memória) a reimplementar a mesma lógica de chave. Quem sabe o que cada
chave significa é `store/layers.ts`, comum a todos.

O adaptador é **IndexedDB**. `localStorage` só guarda string e para em ~5 MB; OPFS é mais
rápido para arquivo grande mas tem API mais crua e suporte irregular fora do Chromium.
Para ~20 MB de JSON, IndexedDB basta, e guarda objeto e `Uint8Array` sem serializar à mão.

Duas sutilezas do adaptador viraram código com comentário: a conexão é aberta uma vez e
reaproveitada (a sincronização faz uma dezena de gravações seguidas), e em escrita a
Promise só resolve quando a TRANSAÇÃO completa, não quando o pedido responde — sem isso,
uma leitura logo depois pode não enxergar o que acabou de ser gravado.

### O relatório de diferença

`persistSync` lê a base anterior, compara, e só então sobrescreve. Invertido, a comparação
seria contra o que acabou de ser gravado e o relatório diria "nada mudou" para sempre —
tem teste dedicado a essa ordem.

A comparação usa `stableStringify`, com as chaves ordenadas. Com `JSON.stringify` direto,
mexer a ordem de duas linhas numa receita marcaria as 6.283 entidades como "atualizadas"
sem nenhuma ter mudado.

As colunas `novas`, `mudaram` e `sumiram` só aparecem quando alguma linha tem valor: numa
sincronização repetida seriam três colunas de zero, que não informam nada.

### A lápide: entrada que some da fonte

Medido entre `pf2e-7.9.1` e `pf2e-8.4.1` — sete meses, 21 releases: **4 talentos sumiram**
de 5.845, e nenhum existe hoje em pack nenhum. Outros **15 mudaram de nome mantendo o
`_id`**, o que valida chavear por UUID: renomear chega como atualização, não como remoção
mais inclusão.

Entrada que some **não é apagada**. Ela fica em `base/` com `retiredIn: "<tag>"`, sai da
busca e continua resolvendo por UUID; a descrição é mantida em `desc/`; e o documento cru
vai para `raw/retired/<chave>` **antes** de `raw/<pack>` ser sobrescrito — é a última
janela em que ele existe.

Por que não apagar: a ficha do Foundry embute cópias completas dos itens, não referências
(medido em `iconics`). Guardando o documento cru, a ficha exportada continua carregando o
item inteiro mesmo que ele não exista mais no compêndio. Apagar fecharia essa porta para
sempre, e o briefing (seção 1) diz que o mestre precisa abrir a ficha de um jogador e
auditar.

Uma entrada que volta a existir na fonte perde a lápide — há teste, porque a primeira
versão gravava a entrada duas vezes, viva e aposentada.

**O aposentado é renormalizado a cada sincronização**, pela receita ATUAL, a partir de
`raw/retired/<tipo>/<chave>`. Sem isso a projeção dele ficaria congelada na receita da
época em que sumiu, e mudar a receita — como a de `feat` vai mudar na Etapa 9 — deixaria
`base/` com duas formas do mesmo tipo. **A camada de UI lê uma forma só**: viva e
aposentada saem da mesma receita, na mesma execução, e a única diferença entre elas é a
presença de `retiredIn`.

O `retiredIn` preservado é o da vez em que a entrada sumiu, não o da sincronização de
agora.

Se a receita atual NÃO conseguir reler um aposentado, ele mantém a projeção anterior e é
contado em `staleRetired`. Isso não é estado a contornar: é sinal de que a receita exige um
campo que nem sempre existiu, e o conserto é marcar o campo como opcional.

### Como o sistema distingue o que é o quê

Esta é a seção para reler antes de acrescentar uma fonte. Medido no `pf2e-8.5.0`, são
**quatro eixos automáticos e um manual**:

| A pergunta                               | Quem responde                                                                            | Automático? |
| ---------------------------------------- | ---------------------------------------------------------------------------------------- | ----------- |
| É de monstro ou de jogador?              | **A estrutura**: habilidade de criatura é item EMBUTIDO num `npc`, não documento de topo | **sim**     |
| É glossário de bestiário ou coisa de PJ? | **O pack**. Nenhum campo distingue                                                       | **não**     |
| É de classe, perícia, arquétipo?         | **A pasta** (`fromSector`)                                                               | **sim**     |
| De qual livro veio?                      | `system.publication.title`                                                               | **sim**     |
| É legado ou pós-Remaster?                | `system.publication.remaster`                                                            | **sim**     |

**Habilidade de criatura não é documento.** No pack `the-dead-gods-hand-bestiary`, os 40
documentos de topo são 29 `npc`, 10 `hazard` e 1 `vehicle`; as **129 ações e 97 magias**
daquelas criaturas vivem dentro do `npc`, em `items[]`. O motor filtra documentos de topo
(`documentType(document) === recipe.type`), então item embutido é invisível **por
construção** — não há regra escrita para isso, e não há como esquecer de escrevê-la.

**O tipo NÃO basta para escolher o que importar.** As 1.414 ações moram em cinco packs, e
nada dentro do documento separa `Power Attack` (do glossário de bestiário) de `Fling Magic`
(ação de PJ): mesmo `category`, mesmos traços, mesma forma. O manifesto declara só `name`,
`path`, `label` e `type: "Item"` — idêntico para os dois. **O pack é a única informação**, e
por isso a lista de packs de cada receita é escrita à mão.

**O conteúdo de livro novo cai em pack EXISTENTE.** Os packs são organizados por espécie,
não por livro: 171 livros distintos alimentam seis packs. `Pathfinder Impossible Magic` já
está na base, espalhado por `feats`, `spells`, `classes`, `actions` e `heritages`, sem pack
novo nenhum. Pack novo acontece essencialmente para bestiário de aventura — que, pelo
parágrafo acima, contribui zero.

#### O setor: pasta, com carimbo do pack como piso

⚠️ `sector` é o nome no CÓDIGO, e continua sendo — é o que a receita lê da pasta do
compêndio. Na TELA ele se chama **Tipo**, e é o primeiro filtro de toda fonte que o tenha:
ele responde "que espécie de coisa é esta" (magia de foco, ritual, talento de classe), que
é o corte mais grosso que existe. "Setor" era vocabulário de dentro da normalização.

`fromSector()` resolve nesta ordem:

```
documento numa pasta conhecida   o nome da pasta RAIZ
documento sem chave `folder`     o carimbo declarado no pack
pasta órfã (id fora da tabela)   vazio — defeito do dado, e carimbar seria esconder
```

A pasta cobre onde mais importa, e cobre inteiro: **6.284 talentos com 7 raízes e zero sem
pasta**; 574 ações com 20 raízes e zero sem pasta; 1.994 magias com 4 raízes e zero sem
pasta. Onde ela não cobre — `class-features` tem 778 de 874 sem pasta, `equipment` tem
5.706 de 5.869 — responde o carimbo do pack (`RecipePack.sector`).

⚠️ Isto substituiu um `withDefault('Adventure')` que funcionava por **coincidência**: havia
dois packs, um com pastas e um sem, então "sem pasta" e "de aventura" eram a mesma coisa.
Um terceiro pack sem pastas viraria "Adventure" por engano.

E o carimbo **nunca vence a pasta**: um documento que declara `folder` está dizendo que ESTÁ
organizado, e carimbá-lo contradiria o dado.

Por isso o motor recebe os documentos **agrupados por pack** (`PackDocuments`), com a
tabela de pastas de cada um. Achatados numa lista só, a origem se perdia — e a origem é
informação.

#### O aviso de pack não lido

A lista de packs é manual, e o problema nunca foi ela existir: foi ela ser **silenciosa**.

`core/sync/unread-packs.ts` cruza o que existe no release com o que as receitas leem, e a
tela de configurações mostra o que sobrou. Não importa nada sozinho — importar habilidade
de monstro na lista do jogador seria pior que não avisar — mas põe a decisão na frente de
quem sincroniza. É a mesma filosofia do relatório de campos não mapeados.

Hoje ele acusa quatro, e todos são verdadeiros: `bestiary-family-ability-glossary` (482
`action`), `familiar-abilities` (111 `action`, que a fonte Familiar vai querer),
`bestiary-ability-glossary-srd` (55 `action`) e `campaign-effects` (1 `condition`, a
`Malevolence`).

Custa ~1,1 s por sincronização — 98 packs, 29.617 documentos — dentro de uma operação que
já baixa 36 MiB.

### A política de versão: mira na mais nova, cai para a última que deu certo

`KNOWN_GOOD_TAG` deixou de ser "a versão do app". A versão em uso fica no `meta` do
armazenamento, e o app sobe sozinho quando a mais nova funciona.

**A regra, em uma frase: a prioridade é a versão MAIS NOVA, e o piso é a última que deu
certo.** O piso não é a constante — é a tag gravada no `meta`, que só chega lá depois de
uma normalização limpa. A constante é consultada num caso só: instalação nova, onde não há
histórico nenhum.

A decisão mora em `core/sync/policy.ts` como função pura, e não dissolvida em `if`s dentro
do callback de sincronização. Ela tem cinco casos:

| Situação                                         | Resultado                               |
| ------------------------------------------------ | --------------------------------------- |
| decodificou limpa                                | **adota**                               |
| falhou, e há base gravada de OUTRA versão        | **fica** na gravada, sem gravar nada    |
| falhou, e é a MESMA versão já gravada            | **adota** — está reparando o que tem    |
| falhou, instalação nova, ainda não tentou o piso | **cai** para `KNOWN_GOOD_TAG`           |
| falhou, instalação nova, piso já tentado         | **adota** — parcial serve mais que nada |

A tolerância a falhas é **derivada**, nunca escolhida por quem chama. Antes era um
parâmetro booleano (`strict`) ao lado de um `fallback`, e nada impedia pedir a combinação
sem sentido. Hoje o plano é uma união nomeada (`newest` ou `pinned`) e a tolerância sai da
comparação entre o alvo e o que está gravado.

Por que tolerar ao reparar a mesma versão: recusar prenderia o usuário a uma base
corrompida sem nenhum caminho para refazê-la.

Por que recusar ao trocar: não vale trocar uma base boa por uma pior.

| Ação                   | O que faz                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| `Sincronizar`          | mira na mais nova. Se ela não decodificar limpa, a mesa fica onde está e a tela diz em qual versão ficou      |
| `Procurar versão nova` | só o `system.json` (~50 KiB): diz se há release novo e se os packs que as receitas pedem continuam declarados |
| `Atualizar para X`     | fixa uma versão específica, em modo estrito. É como a mesa se realinha depois de alguém divergir              |

Uma subida que EXPLODE não é erro, é uma subida que não aconteceu: `runSync` lança quando o
release novo deixa de declarar um pack que a receita pede, e havendo base gravada a mesa
simplesmente continua nela. Erro vermelho fica para quem não tem base nenhuma.

⚠️ **O que se perdeu ao trocar o clique deliberado pela subida automática.** Antes, subir
era um ato, e isso fazia a mesa inteira subir junta — a seção 8 do briefing pede que a base
do mestre e a dos jogadores batam durante a sessão. Agora quem sincroniza na terça pode
pegar um release publicado depois de quem sincronizou na segunda. Foi decisão consciente do
autor, porque a mesa joga sempre na versão atual. A defesa é a mesma de antes: a versão
fica visível na barra de topo, e `Atualizar para X` permite realinhar todo mundo numa tag.

A checagem barata não pega campo que mudou de tipo — isso só aparece ao rodar as receitas.
E o teste de contrato semanal avisa antes de qualquer jogador ver o app quebrado.

### O analisador de marcação (`core/markup/`)

⚠️ A armadilha, e a razão do arquivo existir: **a marcação aninha colchetes.**

```
@Damage[(4d6+@actor.abilities.str.mod)[bludgeoning]|options:area-damage]
[[/r 2d6[fire]]]
```

Uma expressão regular ingênua (`\[[^\]]*\]`) para no PRIMEIRO `]` e corta o token no
meio. O texto continua aparecendo na tela, então ninguém percebe — e o invariante de ida
e volta quebra em silêncio. Por isso o analisador conta PROFUNDIDADE, caractere a
caractere, com o mesmo algoritmo para `@Nome[...]` e para `[[/cmd ...]]`.

São três camadas, nunca duas (briefing 7.6): `raw` nunca modificado, `tokens` com o `raw`
de cada um, e o `render` — que é a Etapa 8.

**O invariante**, afirmado sobre a base inteira no teste de contrato:

```
join(tokens.map((t) => t.raw)) === texto original
```

Medido no `pf2e-8.4.1`: **2.869.851 strings varridas nos 97 packs, 64.932 com marcação,
zero quebras, zero tokens desconhecidos** — o que confirma o "exatamente dez sintaxes".

Token com forma de marcação e nome desconhecido vira `kind: 'unknown'` e não texto. Ele
desenha igual (cru, como o briefing manda), mas pode ser CONTADO: sintaxe nova numa versão
futura do Foundry aparece no relatório em vez de se esconder no meio do texto.

O teste de contrato também reproduz as contagens da seção 7.6 sobre os 25 packs de `Item`,
com diferença máxima de 22 em dezenas de milhares — `@Embed` e `[[/br` batem exato.
Reproduzir os números do briefing com um analisador escrito do zero é a melhor prova de
que os dois estão certos.

### A listagem é dirigida por dados

A tela de consulta não sabe o que é uma condição. Ela recebe um **descritor de fonte**
(`core/browse/spec.ts`) e desenha o que ele declarar:

```ts
{ id: 'conditions', entityType: 'condition',
  columns: [{ kind: 'name' }, { kind: 'chip', field: 'group', align: 'end' }],
  filters: [{ kind: 'options', field: 'group' }, { kind: 'boolean', field: 'valued' }, …],
  searchFields: ['name', 'summary'] }
```

Acrescentar talento na Etapa 9 é escrever um descritor, não uma tela. Não há
`if (tipo === 'condition')` em lugar nenhum da camada de UI.

**A regra da fronteira desenhou isso.** `core/` não pode importar React, e portanto não
pode devolver um componente — então coluna e filtro tiveram que virar DADO, e a UI ficou
com um desenhista por `kind`. O que parecia limitação virou o seam certo: o core diz o
quê, a UI diz como. Acrescentar uma coluna é um caso na união mais um caso no `switch`, e
o compilador cobra o segundo assim que você escreve o primeiro.

O que NÃO foi abstraído, porque exigiria adivinhar: o modo `cards` da Classe (é outra
tela, não uma variação da lista), o alternador OU/E dos traços, e o trilho horizontal de
filtros com setas — com três filtros não há o que rolar.

### A busca

MiniSearch, ~10 KiB. Duas configurações não são padrão e vieram do briefing 7.8:

- **Acento**: `processTerm` normaliza para NFD e apaga os diacríticos, então "ilusao" acha
  "Ilusão" e vice-versa. O dado dos packs é inglês, mas a tradução sob demanda vai trazer
  português.
- **Apóstrofo**: o tokenizador padrão QUEBRA em `'`, e "Archwizard's Spellcraft" viraria
  `["archwizard", "s", "spellcraft"]` — digitar "archwizards" não acharia nada. Aqui o
  apóstrofo é REMOVIDO antes de tokenizar.

A tolerância a erro de digitação é proporcional ao tamanho do termo: nenhuma até 4 letras,
0,2 acima disso. Sem esse teto, "cat" casaria com meia base.

Filtro e busca são coisas separadas (`query.ts` e `search.ts`): a busca ordena por
relevância, o filtro só inclui ou exclui. Sem termo, a ordem é alfabética; com termo, é a
da relevância e o filtro apenas recorta.

Valores de filtro saem do PRÓPRIO dado, com contagem — não há lista fixa em lugar nenhum,
então um grupo novo numa versão futura do Foundry aparece sozinho. Mesmo campo soma como
OU, campos diferentes cruzam como E.

### O teclado mora no campo de busca

O briefing (Anexo A) pede "digita, desce com as setas, abre com Enter, sem tocar no mouse".
Se o foco pulasse para a lista na primeira seta, continuar digitando exigiria voltar — por
isso o foco fica no `<input>`, a lista é um `listbox` comandado por
`aria-activedescendant`, e as linhas são `option` em vez de botões.

`useDeferredValue` no termo, e não debounce: o campo desenha a letra nova de imediato e a
lista é recalculada com prioridade menor. Nada é adiado por tempo, e o resultado nunca
fica atrasado — só cede a vez. Importa quando a lista for 6.283 talentos.

### O detalhe da entrada, e por que a rolagem é da coluna inteira

O painel de detalhe (`DetailPanel`) é uma coluna que rola inteira. Até a Etapa 26d era um
grid de duas linhas — cabeçalho fixo, corpo rolando —, para nome e custo ficarem à vista
durante a leitura. O autor a desfez: numa janela baixa, com uma classe de dez campos em
cima, sobravam três linhas para a descrição. Rolar tudo devolve a altura à leitura; o nome
está a um gesto de rolagem. A sub-tela da perícia (o painel embutido) virou um trecho da
mesma coluna, sem altura nem rolagem próprias.

O mesmo componente serve as **duas** molduras, lateral e flutuante. Ele não pergunta onde
está: recebe `onPopOut` opcional, e a ausência do callback é o que apaga o botão. Um
componente que se pergunta "estou flutuando?" vira dois desenhos que divergem no primeiro
ajuste.

Os campos do cabeçalho são **dado**, não JSX: `DetailFieldSpec` em `core/browse/spec.ts`,
com um desenhista por espécie na UI. É a mesma regra das colunas e dos filtros — a
FRONTEIRA (seção 4) proíbe React em `core/`, e isso é o que faz as doze fontes caberem no
mesmo componente.

### O pop-out flutuante

`FloatingPanel` é arrastado por eventos de **ponteiro**, não de mouse: `pointerdown` cobre
mouse, caneta e toque com um código só, e `setPointerCapture` mantém o arrasto quando o
cursor sai do elemento — sem isso, mover rápido "solta" o painel.

A posição é aplicada por `transform`, não por `left`/`top`: `transform` não força
recálculo de layout a cada quadro. E o arrasto é preso dentro da janela, deixando sempre
uma faixa visível — a posição vive no componente, então um painel arrastado para fora
nunca mais voltaria, nem recarregando.

Rolagem em **um** lugar só: o flutuante corta (`overflow: hidden`) e entrega a altura ao
detalhe, que rola por dentro. Duas rolagens encaixadas dariam duas barras na mesma coluna,
e ninguém sabe qual delas move o texto.

Abrir o flutuante **fecha** a lateral. São estados exclusivos porque é o mesmo detalhe
mudando de moldura, não um segundo detalhe.

### Os rótulos dos tokens de referência

Quando a descrição foi ligada pela primeira vez, apareceu na tela: _"roll a
flat|showDC:all|dc:15 to see if you recover"_. Não é caso raro — medido na base inteira, a
esmagadora maioria destes tokens **não traz rótulo escrito à mão**:

| token       | sem rótulo | com rótulo |
| ----------- | ---------: | ---------: |
| `@Check`    |     17.434 |        140 |
| `@Damage`   |     14.545 |      1.362 |
| `@Template` |      4.544 |        506 |

`core/markup/label.ts` gera o texto de leitura: `DC 15 Flat`, `2d6 fire damage`,
`10-foot emanation`. Três regras que valem a pena registrar:

- A CD só entra quando é **número literal**. 15.696 tokens trazem `dc`, e parte vem como
  `dc:{societyDC}` — variável que só o Foundry resolve. Chave crua é pior que omissão.
- 2.378 fórmulas de dano referem `@actor` ou `@item`, que só existem com uma ficha na mão.
  Nesses casos a fórmula é **omitida** e sobra o tipo: `persistent acid damage` é verdade,
  `(1d6 + @item.system.runes.potency) acid damage` é ruído.
- O texto gerado sai em **inglês**, porque o texto ao redor está em inglês. Palavra em
  português no meio de frase inglesa seria pior que a frase inteira em inglês. A tradução
  é a Etapa 15, e é dela o trabalho de traduzir a frase toda.

### O proxy do Vite

`server.proxy` reescreve `api.github.com` e `github.com` para caminhos locais, e o Vite
refaz o pedido pelo lado Node, onde CORS não existe (ver seção 7). Vale só em
desenvolvimento: em produção quem sai para a rede é o Rust, pelo plugin HTTP do Tauri —
mesma porta `HttpPort`, outro adaptador.

---

## 10. Tauri: presente na estrutura, ausente na compilação

`src-tauri/` está escrito e configurado, mas **não compila nesta máquina** — falta o Rust.
Isso é decisão, não esquecimento (briefing, seção 8).

As Etapas 1 a 13 rodam no navegador com `npm run dev`, que recarrega em milissegundos.
Compilar Rust a cada mudança só atrasaria. Na Etapa 15 instalamos a cadeia (`rustup` +
MSVC Build Tools) e `npm run tauri dev` sobe a janela nativa apontando para o **mesmo**
servidor Vite, sem mexer em nada do frontend.

A porta 5173 está fixada (`strictPort: true`) justamente porque `tauri.conf.json` aponta
para ela.

O Tauri v2 **nega toda capacidade por padrão**. `src-tauri/capabilities/default.json` hoje
concede só `core:default`. Ler arquivo, baixar da rede e escrever em disco entram ali, uma
a uma, quando a Etapa 1 precisar.

---

## 11. CI

`.github/workflows/ci.yml` roda formato, lint, tipos, testes e build — nessa ordem, do mais
barato para o mais caro, para falhar cedo.

Usa `npm ci` (não `npm install`): instala exatamente o que está no `package-lock.json`, sem
resolver versões de novo. CI que resolve versões sozinho quebra sem ninguém ter mudado nada.

`.github/workflows/contract.yml` roda o teste de contrato da fonte (briefing, seção 4.2)
toda segunda-feira, e também em PR que mexa em `source/` ou `platform/`.

---

## 12. A tradução (Etapa 30)

O texto do jogo está em inglês e a tradução é **sob demanda** — por entrada, quando a
pessoa pede. O esqueleto entrou na Etapa 30; os provedores entram um a um depois.

### As formas, e por que são uma lista ordenada

Há mais de um jeito de obter uma tradução, e eles não valem o mesmo. Por isso as formas
são uma **hierarquia** nas preferências (`translation.methods`, só as ligadas, na ordem):
ao traduzir, a primeira disponível responde; ao mostrar, a tradução gravada por uma forma
mais alta sobrescreve a de uma mais baixa. O que cada uma é, medido contra o que existe:

| forma       | o que é                                                     | escopo    | internet |
| ----------- | ----------------------------------------------------------- | --------- | -------- |
| `manual`    | o que a pessoa escreveu ou corrigiu; nunca é sobrescrita    | prosa     | não      |
| `community` | a tradução pt-BR do sistema pf2e para o Foundry (mclemente) | só termos | não      |
| `llm`       | um modelo de linguagem por API, com a chave da pessoa       | prosa     | sim      |
| `local`     | um modelo de tradução dentro do app (Bergamot, WASM, en→pt) | prosa     | não      |

**O pacote da comunidade é lido como glossário, por decisão do autor.** O repositório
ainda tem os arquivos do Babele (nomes, e descrições parciais de antes do Remaster), mas
o que se tira dele são o CORE — nomes e descrições de traços, os termos do sistema — e os
PADRÕES de tradução: o nome em português de cada talento, magia e item (8.801 nomes na
v8.1.2.0) e as frases fixas de duração, alcance e alvo (`dictionary.json`). É o
vocabulário que a comunidade brasileira usa, e é isso que vai alimentar o contexto dos
modelos de linguagem para acertarem a escrita do RPG em português. As descrições do
pacote ficam de fora. Baixado A PEDIDO nas configurações, na tag do último release —
conteúdo de terceiros, nunca embutido —, e gravado sob `trans/<língua>/glossary/…`, ao
lado das traduções, porque `glossary/` é prefixo da base e `clearData` o apaga.

**O modelo de linguagem é da pessoa** (decisão do autor): o app dá suporte às ferramentas
mais conhecidas — a pessoa escolhe o provedor e o modelo, põe a própria chave e gasta os
próprios créditos. O app não paga tradução para ninguém.

**O executável muda as contas.** O app é Tauri e funciona sem internet depois de
sincronizado. Um modelo local é o único caminho para prosa offline: o motor de tradução
do Firefox (Bergamot) roda em WASM dentro da webview, com o par en→pt em uns 20 MB
baixados uma vez — qualidade de tradutor automático, serve para ler. O modelo por API dá
a melhor prosa, mas precisa de internet e de uma chave, que fica no **cofre do sistema**
(plugin do Tauri), nunca em `prefs/`. As duas coexistem na lista: quem tem chave e
internet usa a API; sem uma das duas, cai no local.

**Os termos aparecem traduzidos pela preferência, não por pedido** (Etapa 31): com
"Traduzido" e o pacote baixado, o rótulo do chip e a caixinha do traço saem em português
(o glossário do pacote por cima do original; o que o pacote não tem fica em inglês). Com
"Original", o pacote está lá e não aparece. É a resposta à OPEN-DECISIONS #10 — o traço
não tem botão próprio, e a preferência global decide.

**A busca acha pelos dois nomes** (Etapa 32, pelo autor): com o pacote baixado, a lista e
a paleta indexam o nome em português como SEGUNDO NOME, com o mesmo peso do original —
"guerreiro" e "fighter" levam ao Fighter, "bola de fogo" ao Fireball. Independe da
preferência de visualização: quem procura em português não quer decidir antes como vai
ler. A tela continua mostrando o nome original. É o campo `alias` de `createSearchIndex`
e de `createTextIndex`; quem sabe o segundo nome é a tela, que tem o pacote — o índice só
indexa.

**Os termos do sistema seguem a nomenclatura da comunidade** (Etapa 33, pelo autor: "usar
no sistema as traduções corretas"). Duas coisas: (1) os rótulos FIXOS do app foram
alinhados ao módulo — "Características" no lugar de "Habilidades" (`Característica de
Classe`), "círculo" no lugar de "ranque" (`PF2E.Item.Spell.Rank.Label`), "Média/Enorme/
Imenso" nos tamanhos, "Recipientes" nos `backpack`; (2) os VALORES de dado de jogo que
ficavam em inglês ganharam uma tabela de termos (`browse.terms`: perícias, atributos,
tradições, tipos de dano, categorias e grupos de arma e armadura, Tipos), copiada do
módulo, que só entra com a preferência "Traduzido" — no "Original" o dado fica em inglês,
como sempre. O modo é um estado de módulo em `ui/text.ts` (`setTermMode`), lido no render
da tela de consulta e não um hook: `fieldText` é chamada em dezenas de lugares sem React
por perto; a lista remonta pela `key` quando o modo muda.

### O provedor local: o carro-chefe (Etapa 34)

**Decisão do autor:** a tradução "grátis e constante" é o caminho principal; os modelos
de linguagem são aprimoramento. É o motor de tradução do Firefox — Bergamot,
`@browsermt/bergamot-translator`, WASM num Web Worker dentro da webview: sem servidor,
sem chave, sem custo. Medido: 5,7 s na primeira tradução (com o download do modelo
en→pt, 22 MB), **20 a 35 ms por parágrafo** depois.

Três peças, e a fronteira entre elas:

- **`platform/translator-bergamot.ts`** é a porta (`MachineTranslator`): sabe do WASM, do
  trabalhador (copiado de `node_modules` para `public/bergamot/` no `postinstall`, porque
  ele carrega dois irmãos por caminho relativo que o empacotador não segue) e do modelo.
  O registro e os três arquivos do modelo ficam GUARDADOS no armazenamento local
  (`bergamot/…`, fora dos prefixos da base) — é o que faz o executável traduzir offline
  depois da primeira vez. Uma subclasse de `TranslatorBacking` troca `fetch` e
  `loadModelRegistery` por versões que passam pelo armazenamento antes da rede.
- **`core/translation/shield.ts`** é a BLINDAGEM: o texto passa pelo mesmo tokenizador da
  leitura (`parseMarkup`), e cada marca do Foundry vira um elemento inline que o modo HTML
  do Bergamot preserva — `@UUID[…]{Fireball}` → `<x-ref i="1">Fireball</x-ref>` (o rótulo
  traduz), `@Damage[…]` → `<x-tok i="2"></x-tok>` (nada traduz). `restore` refaz cada
  marca com o rótulo traduzido; se uma marca sumiu, FALHA, e nada se grava. O rótulo que o
  pacote da comunidade conhece pelo nome entra pronto e protegido ("Sneak Attack" →
  "Ataque Furtivo").
- **`core/translation/phrases.ts`** é o GLOSSÁRIO FIXO: termos que o tradutor genérico
  erra — medido: "Strike" virou "greve", "Cast" virou "elenco", "saving throw" virou
  "salvar joga", "Fortitude" virou "fortaleza". Uma passada só, do termo mais longo ao
  mais curto, só em texto (nunca dentro de uma tag); `exact` nos nomes capitalizados de
  uma palavra ("Strike" é o golpe, "strike" é o verbo). Um termo não pode existir duas
  vezes em caixas diferentes — há teste.

`core/translation/local.ts` compõe as três: blinda, traduz pela porta, refaz.

**Como o termo viaja (mudou na 35 e de novo na 37 — tudo medido no motor).** Na 34 o
termo ia já em português dentro de `<span translate="no">`, e o Bergamot **realinhava as
palavras** ("talento de perícia" → "de talento perícia"). A 35 tentou um elemento próprio
(`<x-g>`), e a amostra da 37 mostrou o custo: elemento DESCONHECIDO é **bloco** para o
motor — quebra a frase ao redor ("Faça um corpo a corpo Golpe. ."). O que ficou:

- **Termo do glossário**: `<span translate="no" i="n">skill feat</span>`, com o INGLÊS
  dentro. Inline (a frase fica inteira), o motor lê a frase natural, e o conteúdo que
  ele devolver é descartado — `restore` põe o da comunidade, na caixa do original (caixa
  alta inclusive: "STRENGTH" → "FORÇA"). Duplicata do motor sai; espaço engolido volta
  ("vaziocura" → "vazio cura"). Termo engolido não é erro.
- **Número com sinal** ("+2", "–4") vai protegido do mesmo jeito: "a –4 status penalty"
  virava "de de 4 euros".
- **Referência**: `<x-ref>`, BLOCO, sempre. Inline o motor às vezes duplicava o elemento
  — "de {Bola de Fogo} de {Bola de Fogo}" — e link duplicado é dado quebrado; em bloco,
  1.762 marcas da amostra voltaram uma a uma. O rótulo que o pacote conhece pelo nome
  (ou o glossário inteiro, ou "Nome N" como "Enfeebled 2") volta por ele; o que ninguém
  conhece **fica no original** — o motor sozinho fazia de "Aonaurious" "Amenitário".
- **Rótulo de bloco** (`<strong>Trigger</strong> A creature…`, `<strong>Sacred
Animal</strong> fox`): um negrito curto no começo de bloco, item ou frase, seguido de
  texto, vira `<x-lab>` — bloco — e rótulo e valor traduzem cada um sozinho. Inline, o
  motor engolia o rótulo, trocava rótulo e valor de lugar ("raposa <strong>animal
  sagrada</strong>") ou duplicava a tag. Rótulo que sumiu é texto perdido: falha.
- O ". ." que o motor deixa depois de um bloco (30 de 105 entradas) vira ".".

**A amostra (Etapa 37):** 105 entradas de 15 tipos (as 4 com mais marcas de cada tipo e
3 a passos fixos), 273 mil caracteres, 1.762 marcas do Foundry: zero falhas, zero marcas
perdidas ou com alvo trocado, zero ". .", 3 entradas com um `<em>`/`<strong>` a mais que
o motor duplicou (cosmético). ~54 s no total, ~0,5 s por entrada.

**O glossário aprendido do pacote (Etapa 35).** O glossário fixo tem 90 termos; o pacote
da comunidade tem os outros. Três fontes, todas em `core/translation/terms.ts`:

- **As famílias de termos.** A tabela de idioma do sistema (`lang/en.json`) e a da
  comunidade (`pt-BR.json`) têm as MESMAS chaves — `PF2E.ConditionTypeFrightened` é
  "Frightened" numa e "Amedrontado" na outra. `pickTerms` guarda só as famílias que são
  vocabulário do jogo (condições, traços, grupos de arma e armadura, perícias,
  salvamentos, graus, atributos, tipos de dano, categorias de talento, domínios,
  durações, áreas…; a lista é fechada por prefixo, porque "Save" → "Salvar" numa
  descrição seria um estrago). O lado inglês vai com a base na sincronização
  (`glossary/terms-en`, revisão 16; medido: 1.239 chaves); o lado português, no download
  do pacote (`trans/<língua>/glossary/terms`; medido: 998). `pairTerms` junta pela chave —
  medido: **899 pares** diferentes, 97 iguais dos dois lados (fora) — e descarta o que é
  curto demais sem ser nome ("air", "day", "Cha").
- **O dicionário do pacote** (`dictionary.json`: duração 75, alcance 56, fonte 112, tempo
  19), sem caixa.
- **Os nomes**: condição e ação, exatos quando são uma palavra e em qualquer caixa quando
  são duas ou mais ("reactive strike" na tabela de progressão); as habilidades de classe
  com duas ou mais palavras (as de uma ficam fora: "Battle" é "Mistério de Batalha"); e
  "<classe> feat" → "talento de <Classe>", porque o motor separava a classe do talento.

Os fixos do app vêm antes e vencem no empate. Conferido na tabela de progressão do
Guerreiro: "Golpe Reativo, talento de Guerreiro, bloqueio com escudo" onde antes saía
"greve reativa, Guerreiro talento, bloco Escudo".

**O botão Traduzir, e o escopo dele (Etapa 35, pelo autor: "cada botão respeitando todo o
seu escopo").** O botão da lateral (e do flutuante) traduz o que a lateral mostra: o
`main` E as tabelas das sub-abas (a progressão da classe). O botão da tela completa, no
canto, traduz o centro E a lateral: a página (ou a reserva dela), o apêndice e as
tabelas — e a lateral ali NÃO tem botão próprio (`translationShowing` vem da tela). Os
campos vão juntos ao provedor (`useTranslate().translate(tipo, chave, campos[])`), e um
campo já traduzido do mesmo original é pulado — a lateral pode ter traduzido a tabela
antes. As traduções gravadas se leem por entrada (`useStoredTranslations`), campo a
campo. Quem clica em Traduzir vê a tradução, seja qual for a preferência; com tradução
gravada o mesmo botão alterna "Ver original" / "Ver tradução", nascendo na preferência a
cada entrada; acima do texto, "Tradução: modelo local", e "o original mudou desde a
tradução" quando a impressão digital não bate mais.

**Os nomes na tela (Etapa 36).** `translation.names` é preferência separada de `display`:
dá para ler a prosa em inglês com os nomes em português. O mecanismo é o mesmo do modo dos
termos: a tela de consulta chama `setNameTable` no render (a tabela de nomes do pacote, ou
nada), e `displayName(tipo, nome)` — em `ui/text.ts`, sem hook — devolve o nome do pacote
ou o original. A lista remonta pela `key` quando a preferência muda, e `sortEntities`
recebe o nome VISTO como critério (`nameOf`), senão "Guerreiro" ficaria onde "Fighter"
fica. Os dados não mudam: o nome original continua sendo o que se grava, se exporta e se
busca (a busca já acha pelos dois desde a 32).

### Onde a tradução mora: a quinta camada

    trans/<língua>/<tipo>    { [chave]: { [campo]: { html, method, at, sourceHash } } }

Fora de `desc/` de propósito: `desc/` é o que veio do Foundry e é reescrito a cada
sincronização; a tradução é trabalho da pessoa (ou pago, ou baixado) e **sobrevive à
sincronização**, como as preferências — `clearData` apaga por prefixo da base e não a
toca. Uma língua por chave: a pessoa pode usar mais de uma, e cada uma é um conjunto
inteiro. Cada tradução guarda de onde veio (`method`) e uma impressão digital do original
(`sourceHash`, FNV-1a): quando o Foundry muda o texto numa versão nova, a tela pode avisar
que a tradução é de um texto que já não existe. A forma `manual` nunca é sobrescrita por
outra (`writeTranslation`).

### As preferências

`translation.display` — o que aparece quando a entrada **tem** tradução: o original
("traduzo quando quero ler") ou a tradução ("li uma vez, quero sempre"). Sem tradução
gravada é sempre o original: nada se traduz sem pedir. `translation.language` — a língua.
`translation.methods` — a hierarquia. O setor Tradução das configurações edita as três; o
setor Sincronização é o painel que sempre existiu.

### O contrato do provedor

`TranslationProvider { id, availability(language), translate(request) }` em
`core/translation/methods.ts`. `availability` responde antes de traduzir — é o que as
configurações mostram ao lado de cada forma ("sem chave", "modelo não baixado"). `translate`
recebe o HTML original e devolve o HTML traduzido preservando as marcas do Foundry
(`@UUID`, `@Embed`, `@Damage`), que nunca se traduzem. Nenhum provedor existe ainda; o
botão Traduzir continua desligado até o primeiro.

## 13. O que a Etapa 0 não fez

- **Não compilou nada de Rust.** Rust não está instalado; decisão aprovada.
- **Não gerou ícones** do instalador. `bundle.icon` está vazio. Etapa 15.
- **Não criou o teste de contrato da fonte.** Depende da camada `source/`. Etapa 1.
- **Não definiu paleta nem tipografia.** Os tokens são provisórios. Etapa 4.
- **Não criou roteamento nem gerência de estado.** Não há telas ainda; escolher biblioteca
  antes de ter o problema é adivinhar.
- **Não criou nenhuma entidade, receita ou tipo de domínio.** As pastas do core estão
  vazias de propósito.
