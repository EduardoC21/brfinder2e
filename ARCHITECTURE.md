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

### A versão da base não é código

`KNOWN_GOOD_TAG` deixou de ser "a versão do app". A versão em uso fica no `meta` do
armazenamento, e o usuário sobe pela engrenagem, sem recompilar. A constante virou duas
coisas: rede de segurança da instalação nova, e alvo fixo do teste de contrato.

O fluxo, e por que ele preserva a decisão da seção 8 do briefing (a base do mestre e a dos
jogadores precisam bater durante a sessão):

| Ação                               | O que faz                                                                                                            |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `Sincronizar` numa instalação nova | pega a mais recente; se ela não decodificar, cai para `KNOWN_GOOD_TAG`                                               |
| `Sincronizar de novo`              | re-sincroniza a MESMA versão gravada. Nunca sobe sozinho                                                             |
| `Procurar versão nova`             | só o `system.json` (~50 KiB): diz se há release novo e se os packs que as receitas pedem continuam declarados        |
| `Atualizar para X`                 | roda a versão nova em modo estrito: **falha de decodificação impede a gravação**, e a base anterior continua valendo |

A checagem barata não pega campo que mudou de tipo — isso só aparece ao rodar as receitas.
Daí o modo estrito: o app segue na última versão compatível até o aplicativo ser
atualizado, que é exatamente o comportamento pedido. E o teste de contrato semanal avisa
antes de qualquer jogador ver o app quebrado.

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

## 12. O que a Etapa 0 não fez

- **Não compilou nada de Rust.** Rust não está instalado; decisão aprovada.
- **Não gerou ícones** do instalador. `bundle.icon` está vazio. Etapa 15.
- **Não criou o teste de contrato da fonte.** Depende da camada `source/`. Etapa 1.
- **Não definiu paleta nem tipografia.** Os tokens são provisórios. Etapa 4.
- **Não criou roteamento nem gerência de estado.** Não há telas ainda; escolher biblioteca
  antes de ter o problema é adivinhar.
- **Não criou nenhuma entidade, receita ou tipo de domínio.** As pastas do core estão
  vazias de propósito.
