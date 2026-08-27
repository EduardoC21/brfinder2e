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
│  │  ├─ normalization/         COMO vira entidade      (briefing 5)
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

## 8. Tauri: presente na estrutura, ausente na compilação

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

## 9. CI

`.github/workflows/ci.yml` roda formato, lint, tipos, testes e build — nessa ordem, do mais
barato para o mais caro, para falhar cedo.

Usa `npm ci` (não `npm install`): instala exatamente o que está no `package-lock.json`, sem
resolver versões de novo. CI que resolve versões sozinho quebra sem ninguém ter mudado nada.

`.github/workflows/contract.yml` roda o teste de contrato da fonte (briefing, seção 4.2)
toda segunda-feira, e também em PR que mexa em `source/` ou `platform/`.

---

## 10. O que a Etapa 0 não fez

- **Não compilou nada de Rust.** Rust não está instalado; decisão aprovada.
- **Não gerou ícones** do instalador. `bundle.icon` está vazio. Etapa 15.
- **Não criou o teste de contrato da fonte.** Depende da camada `source/`. Etapa 1.
- **Não definiu paleta nem tipografia.** Os tokens são provisórios. Etapa 4.
- **Não criou roteamento nem gerência de estado.** Não há telas ainda; escolher biblioteca
  antes de ter o problema é adivinhar.
- **Não criou nenhuma entidade, receita ou tipo de domínio.** As pastas do core estão
  vazias de propósito.
