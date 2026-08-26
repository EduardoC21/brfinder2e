# Arquitetura

Documento de decisoes. Cada escolha aqui tem um motivo escrito; se o motivo deixar de
valer, a escolha pode cair.

---

## 1. A estrutura de pastas

```
brfinder2e/
├─ .github/workflows/ci.yml     CI: formato, lint, tipos, testes, build
├─ index.html                   a unica pagina. E um app, nao um site.
├─ vite.config.ts               build + configuracao do Vitest, num arquivo so
├─ eslint.config.js             regras — inclusive a fronteira de arquitetura
├─ tsconfig.app.json            regras de tipo do codigo do app
├─ tsconfig.node.json           regras de tipo dos arquivos de configuracao
│
├─ src/
│  ├─ main.tsx                  ponto de entrada: monta o React na pagina
│  ├─ App.tsx                   componente raiz
│  │
│  ├─ nucleo/                   DOMINIO PURO. Sem React, sem DOM.
│  │  ├─ fonte/                 ONDE o dado esta        (briefing 4.1)
│  │  ├─ selecao/               O QUE entra             (briefing 4.3)
│  │  ├─ normalizacao/          COMO vira entidade      (briefing 5)
│  │  ├─ base/                  a saida gravada         (briefing 5.2)
│  │  ├─ marcacao/              parser das 10 sintaxes  (briefing 7.6)
│  │  ├─ busca/                 indice e consulta
│  │  ├─ glossario/             termos de jogo          (briefing 8.1)
│  │  └─ tipos/                 tipos compartilhados
│  │
│  ├─ interface/                TUDO que e React
│  │  ├─ design/                tokens: cor, fonte, espaco
│  │  ├─ componentes/           pecas burras e reutilizaveis
│  │  ├─ telas/                 sincronizacao, busca, detalhe, filtros, paleta
│  │  └─ ganchos/               hooks compartilhados
│  │
│  ├─ idiomas/                  texto de interface, um arquivo por idioma
│  └─ testes/                   preparo do ambiente de teste (nao os testes em si)
│
└─ src-tauri/                   a casca nativa (Rust). Ver src-tauri/LEIA-ME.md
```

### Por que `nucleo/` e `interface/`, e nao `components/` e `utils/`

`utils/` e onde codigo vai morrer: nao tem criterio de entrada, entao entra tudo.
A divisao aqui tem um criterio verificavel: **`nucleo/` nao pode importar React.**

Isso importa por tres razoes concretas neste projeto:

1. **Velocidade de teste.** Os testes do nucleo rodam em Node puro. Nao ha jsdom, nao ha
   render, nao ha `await`. Vamos rodar receitas de normalizacao sobre 17.191 documentos —
   se cada rodada carregar um DOM falso, o ciclo de trabalho da secao 3.2 do briefing fica
   lento demais para ser usado a cada campo.
2. **A logica dificil fica isolada.** O parser de `@Damage[2d6[fire]]` com contagem de
   profundidade nao tem nada a ver com React. Se ele estiver dentro de um componente,
   testa-lo exige montar tela.
3. **Reaproveitamento.** Se um dia rodarmos a importacao num script de linha de comando,
   o nucleo vai junto sem arrastar React.

**A regra e vigiada pelo ESLint, nao pela boa vontade.** Em `eslint.config.js`, o bloco
"A FRONTEIRA" transforma `import React from 'react'` dentro de `src/nucleo/` em erro de
lint. Comentario nao segura arquitetura; regra segura.

### Por que os nomes estao em portugues

O briefing (secao 4) nomeia as camadas em portugues: `fonte/`, `selecao/`, `normalizacao/`,
`base/`. Manter metade em ingles produziria `src/nucleo/source/` — o pior dos dois mundos.
Ficam em ingles apenas os nomes que o ecossistema exige (`src`, `public`, `dist`,
`index.html`, `main.tsx`, `package.json`).

---

## 2. TypeScript: por que tanto rigor

O template do Vite nem liga o `strict`. Ligamos ele e mais cinco opcoes. Cada uma paga uma
divida especifica deste projeto:

| Opcao                                   | O que impede                                                                                                                            |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `strict`                                | O basico: `null` e `undefined` deixam de ser invisiveis.                                                                                |
| `noUncheckedIndexedAccess`              | `lista[0]` passa a ter tipo `T` ou `undefined`. **Vital aqui:** o JSON do Foundry esta cheio de array que as vezes vem vazio.           |
| `exactOptionalPropertyTypes`            | Distingue "campo ausente" de "campo presente valendo `undefined`". A receita da secao 5 do briefing depende dessa diferenca.            |
| `noPropertyAccessFromIndexSignature`    | Obriga `doc['system']` em vez de `doc.system` quando o tipo e um mapa aberto. Torna visivel, no codigo, onde estamos adivinhando campo. |
| `noImplicitReturns`                     | Funcao que retorna em um ramo e esquece no outro. Classico em normalizador com muitos `if`.                                             |
| `noUnusedLocals` / `noUnusedParameters` | Codigo morto some no ato, em vez de acumular.                                                                                           |

**Nota de migracao:** `baseUrl` foi removido do `tsconfig.app.json` porque o TypeScript 6
o marca como deprecado (para de funcionar no 7). Os `paths` agora sao relativos ao proprio
arquivo (`"./src/nucleo/*"`), que e a forma suportada.

### Apelidos de caminho

`@nucleo/*`, `@interface/*`, `@idiomas/*`, `@testes/*`. Declarados **so** em
`tsconfig.app.json`; o Vite 8 le dali via `resolve.tsconfigPaths: true`. Um lugar so,
valendo no editor, no build e nos testes.

Evita `import { x } from '../../../nucleo/marcacao/parser'` — que, alem de ilegivel, some
com o rastro de qual camada esta chamando qual.

---

## 3. Lint: ESLint em vez do oxlint que veio no template

O `create-vite` 9 passou a instalar **oxlint**, escrito em Rust e muito mais rapido.
Trocamos por **ESLint + typescript-eslint com regras "type-checked"**, e o motivo e
especifico:

Regras type-checked consultam o **compilador**, nao so a sintaxe. Duas delas justificam a
troca sozinhas neste projeto:

- `no-floating-promises` — a camada `fonte/` vai baixar 34 MB, descompactar e gravar. Um
  `await` esquecido produz bug silencioso e nao-deterministico. O oxlint nao pega.
- `no-unsafe-assignment` / `no-unsafe-member-access` — o documento do Foundry chega como
  `unknown`. Estas regras forcam validacao explicita antes de tratar o campo como string.
  **E exatamente o erro que as tentativas anteriores cometeram.**

O custo e tempo: o lint fica na casa de segundos em vez de milissegundos. Aceitavel.

**Prettier cuida do formato, ESLint cuida do sentido.** `eslint-config-prettier` entra por
ultimo e desliga toda regra de estilo do ESLint, para os dois nunca brigarem.

**Nota de migracao:** `tseslint.config()` esta deprecado. A forma atual e `defineConfig`,
importado de `eslint/config` (nucleo do ESLint 10).

---

## 4. Testes: Vitest, com dois projetos

Vitest em vez de Jest porque compartilha a configuracao e o pipeline do Vite — apelidos de
caminho, TypeScript e plugins ja funcionam sem uma segunda configuracao paralela.

A configuracao declara **dois projetos**, espelhando a fronteira:

| Projeto     | Ambiente | Arquivos                                   |
| ----------- | -------- | ------------------------------------------ |
| `nucleo`    | `node`   | `src/nucleo/**/*.test.ts`                  |
| `interface` | `jsdom`  | o resto, com `src/testes/preparo.ts` no ar |

Assim o teste de uma receita de normalizacao nao paga o custo de montar um DOM falso.
`src/nucleo/sanidade.test.ts` **verifica que `document` nao existe** no projeto do nucleo —
se alguem trocar o ambiente sem querer, o teste acusa.

Os testes ficam **ao lado do codigo** (`parser.ts` e `parser.test.ts` na mesma pasta), nao
numa arvore `tests/` espelhada. Motivo: mover ou apagar um modulo leva o teste junto, e a
ausencia de teste fica visivel no proprio diretorio.

**Nota de migracao:** `environmentMatchGlobs`, que aparece em tutoriais de Vitest 2 e 3,
foi **removido no Vitest 4**. `projects` e a API atual.

---

## 5. Centralizacao (briefing, secao 8)

Tres arquivos concentram o que costuma vazar por todo lado:

| O que                   | Onde                              | Regra                                             |
| ----------------------- | --------------------------------- | ------------------------------------------------- |
| Cor, fonte, espacamento | `src/interface/design/tokens.css` | Nenhum componente escreve `#hex` ou pixel solto.  |
| Texto de interface      | `src/idiomas/pt-BR.ts`            | Nenhuma string visivel fica dentro de componente. |
| Onde o dado mora        | `src/nucleo/fonte/` (Etapa 1)     | Nenhuma URL do GitHub fora dali.                  |

Os tokens usam **CSS custom properties** (`--cor-fundo`) em vez de constantes TypeScript.
A alternativa seria exportar um objeto JS e usar estilo em linha. Fica pior aqui porque:
trocar de tema em runtime viraria re-render de React (com custom properties basta trocar o
valor no `:root`), e porque estado como `:hover` e `:focus-visible` nao existe em estilo em
linha. O briefing pede tema trocavel pelo usuario — custom properties entregam isso de
graca.

Os valores atuais em `tokens.css` sao **provisorios**. A paleta real e decidida na Etapa 4.

---

## 6. Tauri: presente na estrutura, ausente na compilacao

`src-tauri/` esta escrito e configurado, mas **nao compila nesta maquina** — falta o Rust.
Isso e decisao, nao esquecimento (briefing, secao 8).

As Etapas 1 a 13 rodam no navegador com `npm run dev`, que recarrega em milissegundos.
Compilar Rust a cada mudanca so atrasaria. Na Etapa 15 instalamos a cadeia (`rustup` +
MSVC Build Tools) e `npm run tauri dev` sobe a janela nativa apontando para o **mesmo**
servidor Vite, sem mexer em nada do frontend.

A porta 5173 esta fixada (`strictPort: true`) justamente porque `tauri.conf.json` aponta
para ela.

O Tauri v2 **nega toda capacidade por padrao**. `src-tauri/capabilities/default.json` hoje
concede so `core:default`. Ler arquivo, baixar da rede e escrever em disco entram ali, uma
a uma, quando a Etapa 1 precisar.

---

## 7. CI

`.github/workflows/ci.yml` roda formato, lint, tipos, testes e build — nessa ordem, do mais
barato para o mais caro, para falhar cedo.

Usa `npm ci` (nao `npm install`): instala exatamente o que esta no `package-lock.json`, sem
resolver versoes de novo. CI que resolve versoes sozinho quebra sem ninguem ter mudado nada.

**Ainda nao existe** o teste de contrato da fonte (briefing, secao 4.2) — o que bate no
GitHub do Foundry semanalmente e falha quando a disposicao mudar. Ele entra na Etapa 1,
junto com a camada `fonte/` que ele valida.

---

## 8. O que a Etapa 0 nao fez

- **Nao compilou nada de Rust.** Rust nao esta instalado; decisao aprovada.
- **Nao gerou icones** do instalador. `bundle.icon` esta vazio. Etapa 15.
- **Nao criou o teste de contrato da fonte.** Depende da camada `fonte/`. Etapa 1.
- **Nao definiu paleta nem tipografia.** Os tokens sao provisorios. Etapa 4.
- **Nao criou roteamento nem gerencia de estado.** Nao ha telas ainda; escolher biblioteca
  antes de ter o problema e adivinhar.
- **Nao criou nenhuma entidade, receita ou tipo de dominio.** As pastas do nucleo estao
  vazias de proposito.
