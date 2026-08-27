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

## 2. Fase da ficha: reimplementar regras, portar do pf2e, ou nenhum dos dois? `novo`

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

## 3. A receita lê só o documento, ou também a tabela de idioma? `novo`

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

## 4. Traços: inglês ou português? `§9`

São dado (`traits.value: ["fighter", "flourish"]`) mas quem desenha o chip é a interface.
Ficam exatamente na fronteira.

**Recomendação do briefing: manter em inglês** — são a chave de busca e o que casa com o
Archives of Nethys na hora de conferir. Como passam pelo glossário de qualquer jeito,
inverter depois é trocar uma coluna.

**Decidir quando:** ao desenhar o chip de traço (Etapa 10).

---

## 5. Detalhe da entrada: painel lateral ou tela cheia? `§9`

Argumentar a escolha ao propor a tela. **Decidir quando:** Etapa 8.

---

## 6. Busca global: campo na barra, paleta de comandos, ou aba? `§9`

**Recomendação do briefing:** campo na barra que abre a paleta, e o mesmo Ctrl+K de
qualquer lugar. **Decidir quando:** Etapa 11.

---

## 7. Sistema operacional dos jogadores `§9`

Confirmar se algum usa macOS ou Linux **antes de prometer suporte**. No Windows, binário
não assinado mostra o aviso do SmartScreen — aceitável para cinco pessoas. No macOS o
atrito é maior (Gatekeeper).

**Decidir quando:** antes da Etapa 15. É pergunta para as pessoas, não para o código.

---

## 8. Fundo da tela `§9`

Não podemos distribuir arte da Paizo nem de banco de imagem. Ou um fundo gerado por
código, ou o usuário aponta a própria imagem.

**Decidir quando:** Etapa 4, junto com o sistema de design.
