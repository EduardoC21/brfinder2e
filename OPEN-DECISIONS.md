# Decisões em aberto

Coisas que ainda não foram decididas, e que se perdem se não ficarem escritas.

Quando uma for decidida: mova o texto para `ARCHITECTURE.md` (se for arquitetura) ou para
a mensagem do commit que a implementa, e **apague a entrada daqui**. Este arquivo deve
encolher, não crescer.

Origem de cada item: **§9** = seção 9 do briefing. **novo** = apareceu durante o trabalho.

---

## 1. Exportar ficha para o Foundry VTT — escopo indefinido `novo`

**Situação.** O briefing menciona isso uma única vez, na seção 5.2 (_"`raw/` — o documento
como veio, byte a byte. É ele que volta num export para o Foundry"_), como justificativa
para guardar o original. **Não está na escada da seção 6 nem nas decisões fechadas da
seção 8.** É uma intenção preservada pela arquitetura, não uma funcionalidade com prazo.

**O que foi apurado contra o dado real** (26/08/2026, release `pf2e-8.4.1`):

O sistema embarca **140 personagens reais** nos packs `iconics` e `paizo-pregens`. O
formato-alvo não é hipótese: está dentro do dado que já baixamos.

Comparando o item `Dwarf` embutido em `Nhalmika (Level 1)` com o `Dwarf` do compêndio:

```
embutido no personagem : _id, _stats, effects, img, name, sort, system, type
no compêndio           : _id, _stats, effects, img, name,       system, type

_id igual?        NÃO   (czTdyMxPKvbeL5LE vs BYj5ZvlXZdpaEgA6)
system idêntico?  NÃO
  só no compêndio : hands
  valor diferente : boosts["2"].selected = "str"   ← a escolha do jogador
```

Três consequências:

1. **O personagem embute cópias completas dos itens, não referências.** Todos os 27 itens
   da Nhalmika trazem o documento inteiro. Exportar exige emitir documentos completos —
   que é exatamente o que `raw/` guarda.
2. **A cópia embutida não é byte a byte.** Ganha `sort`, ganha `_id` novo, perde algum
   campo, e a escolha do jogador é gravada **dentro da própria cópia**.
3. `_stats.compendiumSource` está em 27/27 — a procedência de cada item fica registrada.

**Conclusão: `raw/` é condição necessária, não suficiente.** Exportar é
`raw` + escolhas + `_id` novo + `sort`. É uma transformação a escrever.

**Requisito que isso cria, e que não é opcional:** a Etapa 3 tem que **gravar `raw/`**.
É o que mantém a porta aberta a custo zero. Jogar fora na importação é irreversível.

**Critério de pronto, quando entrar no escopo:** teste de ida e volta contra os 140
personagens de `iconics` + `paizo-pregens`, no mesmo espírito do teste de contrato da
Etapa 1.

⚠️ **Limitação medida:** nenhum dos 140 personagens usa `flags.system.rulesSelections`
(nem a forma antiga `flags.pf2e`). Eles validam o **esqueleto** do documento, mas **não**
cobrem o mecanismo de escolha de `ChoiceSet`. Essa parte só se prova importando num
Foundry de verdade.

**Decidir:** entra na escada depois da ficha de personagem, ou fica fora do produto?

---

## 2. O que fazer com entrada que some da fonte `novo`

**Hoje não há nada previsto.** `persistSync` sobrescreve `base/<tipo>`, `desc/<tipo>` e
`raw/<pack>` inteiros, então o que sumiu desaparece das três camadas. O relatório da
engrenagem conta em `sumiram`, mas o dado já foi.

Enquanto não houver ficha de personagem isso é inofensivo. Deixa de ser no instante em que
uma ficha referenciar uma entrada por UUID.

### Quanto isso acontece, medido

Comparando `pf2e-7.9.1` (17/01/2026) com `pf2e-8.4.1` (17/08/2026) — sete meses, 21
releases:

|                                   | condições | talentos               |
| --------------------------------- | --------- | ---------------------- |
| sumiram (`_id` deixou de existir) | 0         | **4** de 5.845 (0,07%) |
| novos                             | 0         | 442                    |
| mesmo `_id`, **nome mudou**       | 0         | **15**                 |

Dois fatos que isso estabelece:

1. **Renomear preserva o `_id`.** Os 15 casos (`Sense Chaos` → `Sense Iniquity`,
   `Skill Mastery (Rogue)` → `Skill Mastery`) chegam como ATUALIZAÇÃO, não como
   remoção mais inclusão. Chavear por UUID está certo.
2. **Sumir é raro e é definitivo.** Os quatro (`Expanded Luck`,
   `Evasiveness (Swashbuckler)`, `Skill Mastery (Investigator)`, `Deepest Wellspring`)
   não existem em nenhum pack do 8.4.1, nem por `_id` nem por nome. Foram consolidados
   em outros talentos, e não há link automático para onde foram.

### Não há urgência, e o motivo importa

A versão é **fixada** (`PINNED_TAG`). Sincronizar duas vezes a mesma tag nunca remove
nada — o teste no navegador confirmou. Remoção só acontece quando alguém troca a tag de
propósito, que hoje é mudança de código. É migração controlada, não evento aleatório.

### As saídas

|       | O quê                                                                                                                    | Custo                    | Problema                                                                                                                                            |
| ----- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A** | Apagar e deixar a ficha quebrar (comportamento de hoje)                                                                  | zero                     | O briefing (seção 1) diz que o mestre precisa abrir a ficha de um jogador e auditar. Referência pendurada é exatamente a falha que estraga a sessão |
| **B** | **Lápide**: a entrada fica em `base/`, marcada `retiredIn: "pf2e-8.5.0"`. Some da busca por padrão, mas resolve por UUID | ~4 entradas por semestre | A busca precisa filtrar                                                                                                                             |
| **C** | Versionar tudo: `raw/<tag>/<pack>`                                                                                       | ~35 MiB por versão       | Guardar 35 MiB para preservar 4 entradas                                                                                                            |
| **D** | **B mais o `raw` do que morreu**: lápide em `base/` e `desc/`, e o documento cru da entidade em `raw/retired/<uuid>`     | praticamente zero        | Um passo a mais no `persistSync`                                                                                                                    |

**Recomendação: D.** É a única que mantém as três garantias juntas — a ficha não quebra,
a tela de detalhe ainda tem o que mostrar, e a exportação para o Foundry (item 1) continua
possível para a entrada aposentada. O custo é uma passada a mais sobre a base anterior,
que o `persistSync` já lê para calcular a diferença.

Esboço: as chaves da base anterior ausentes na nova são copiadas para a nova com
`retiredIn = <tag do release>`; o `desc` delas vai junto; e o documento cru vai para
`raw/retired/<uuid>` antes de `raw/<pack>` ser sobrescrito.

**Decidir quando:** antes de trocar `PINNED_TAG` pela primeira vez, ou ao começar a ficha
de personagem — o que vier primeiro. Ver também o item 1 (exportação) e o item 9 (política
de atualização da base).

---

## 3. Fase da ficha: reimplementar regras, portar do pf2e, ou nenhum dos dois? `novo`

**Não é decisão da Etapa 2.** Fica aqui para não se perder até a ficha entrar em escopo.

**Reusar o motor do Foundry inteiro não é opção.** O código do sistema pf2e é Apache 2.0,
então copiar é permitido — o problema não é licença. O problema é que ele é um plugin de
uma plataforma fechada:

```
ConditionPF2e extends AbstractEffectPF2e extends ItemPF2e extends Item
                                                                  └── classe global do
                                                                      núcleo do Foundry
```

`Item`, `Actor`, `Document`, `foundry.data.fields`, `Roll`, `ChatMessage`, `game`,
`CONFIG` e `Hooks` não existem no repositório do pf2e: vêm do bundle do Foundry, que é
licenciado e não redistribuível. Hospedar o código deles exigiria reimplementar esse
núcleo — projeto maior que este app, e alvo móvel a cada versão do Foundry.

Escala medida (branch `v14-dev`): **833 arquivos TypeScript, 4,8 MiB, ~131 mil linhas**,
dos quais 124 arquivos são só código de migração histórica.

**O que já reusamos, e é o caminho certo: os dados.** Briefing 7.5 — o item de classe já
traz `hp`, `perception`, `savingThrows`, `defenses`, `attacks`, `classFeatLevels` e os
features por nível. Lemos a regra em vez de reescrevê-la.

**O que é legítimo portar** (Apache 2.0, com atribuição), quando o algoritmo for difícil:
o parser das dez sintaxes (7.6), a matemática de proficiência, as cinco formas de
`ChoiceSet` (7.8).

**Requisito que isso cria para a Etapa 3, e que não é opcional:** `system.rules` — o array
de rule elements — tem que ser **adiado, não descartado**. É mecânica de VTT, inútil para
consulta, essencial se a ficha um dia aplicar regras. Com `raw/` preservado (ver item 1) e
`rules` marcado como adiado, a porta fica aberta a custo zero.

**Decidir quando:** ao abrir a fase da ficha, depois da Etapa 15.

---

## 4. A receita lê só o documento, ou também a tabela de idioma? `novo`

**Decidir na Etapa 2**, porque muda o motor.

Medido no `pf2e-8.4.1`: `lang/en.json` traz `PF2E.condition.<slug>` com três campos —
`name`, `rules` e **`summary`**. O `summary` **não existe no pack**: é uma frase de uma
linha ("Fear makes you less capable of attacking and defending"), presente em 42 das 43
condições. Para uma linha de resultado de busca, é exatamente o texto que se quer.

Já o `rules` do arquivo de idioma **não** substitui a descrição do pack: em 40 das 43
condições os textos diferem, e a diferença é que a versão do idioma é achatada — perde os
links `@UUID` (27 dos 40 casos têm) e troca o travessão por hífen. O pack é o canônico.

Comparação em `Blinded`:

```
PACK : ... Blinded overrides @UUID[Compendium.pf2e.conditionitems.Item.TkIyaNPgTZFBCCuh]{Dazzled}.
LANG : ... Blinded overrides dazzled.
```

**A questão:** o motor de receita aceita campo vindo da tabela de idioma, ou a receita lê
só o documento e um passo posterior enriquece? A primeira é mais direta de ler; a segunda
mantém a receita com uma fonte só.

---

## 5. Traços: inglês ou português? `§9`

São dado (`traits.value: ["fighter", "flourish"]`) mas quem desenha o chip é a interface.
Ficam exatamente na fronteira.

**Recomendação do briefing: manter em inglês** — são a chave de busca e o que casa com o
Archives of Nethys na hora de conferir. Como passam pelo glossário de qualquer jeito,
inverter depois é trocar uma coluna.

**Decidir quando:** ao desenhar o chip de traço (Etapa 10).

---

## 6. Detalhe da entrada: painel lateral ou tela cheia? `§9`

Argumentar a escolha ao propor a tela. **Decidir quando:** Etapa 8.

---

## 7. Busca global: campo na barra, paleta de comandos, ou aba? `§9`

**Recomendação do briefing:** campo na barra que abre a paleta, e o mesmo Ctrl+K de
qualquer lugar. **Decidir quando:** Etapa 11.

---

## 8. Sistema operacional dos jogadores `§9`

Confirmar se algum usa macOS ou Linux **antes de prometer suporte**. No Windows, binário
não assinado mostra o aviso do SmartScreen — aceitável para cinco pessoas. No macOS o
atrito é maior (Gatekeeper).

**Decidir quando:** antes da Etapa 15. É pergunta para as pessoas, não para o código.

---

## 9. Fundo da tela `§9`

Não podemos distribuir arte da Paizo nem de banco de imagem. Ou um fundo gerado por
código, ou o usuário aponta a própria imagem.

**Decidir quando:** Etapa 4, junto com o sistema de design.

---

## 10. Política de atualização da base `novo`

`PINNED_TAG` em `src/core/source/channels.ts` fixa a versão em `pf2e-8.4.1`. Fixar é
decisão fechada (briefing, seção 8): a base do mestre e a dos jogadores precisam bater
durante a sessão.

O que **não** está decidido: como o usuário sobe de versão. Hoje é editar a constante e
recompilar. Alternativas: o app oferecer quando detectar release novo; ou um comando
explícito.

**Decidir quando:** Etapa 4, ao desenhar a tela de sincronização.
