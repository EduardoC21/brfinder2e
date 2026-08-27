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

## 2. Traços: inglês ou português? `§9`

São dado (`traits.value: ["fighter", "flourish"]`) mas quem desenha o chip é a interface.
Ficam exatamente na fronteira.

**Recomendação do briefing: manter em inglês** — são a chave de busca e o que casa com o
Archives of Nethys na hora de conferir. Como passam pelo glossário de qualquer jeito,
inverter depois é trocar uma coluna.

**Decidir quando:** ao desenhar o chip de traço (Etapa 10).

---

## 3. Detalhe da entrada: painel lateral ou tela cheia? `§9`

Argumentar a escolha ao propor a tela. **Decidir quando:** Etapa 8.

---

## 4. Busca global: campo na barra, paleta de comandos, ou aba? `§9`

**Recomendação do briefing:** campo na barra que abre a paleta, e o mesmo Ctrl+K de
qualquer lugar. **Decidir quando:** Etapa 11.

---

## 5. Sistema operacional dos jogadores `§9`

Confirmar se algum usa macOS ou Linux **antes de prometer suporte**. No Windows, binário
não assinado mostra o aviso do SmartScreen — aceitável para cinco pessoas. No macOS o
atrito é maior (Gatekeeper).

**Decidir quando:** antes da Etapa 15. É pergunta para as pessoas, não para o código.

---

## 6. Fundo da tela `§9`

Não podemos distribuir arte da Paizo nem de banco de imagem. Ou um fundo gerado por
código, ou o usuário aponta a própria imagem.

**Decidir quando:** Etapa 4, junto com o sistema de design.

---

## 7. Política de atualização da base `novo`

`PINNED_TAG` em `src/core/source/channels.ts` fixa a versão em `pf2e-8.4.1`. Fixar é
decisão fechada (briefing, seção 8): a base do mestre e a dos jogadores precisam bater
durante a sessão.

O que **não** está decidido: como o usuário sobe de versão. Hoje é editar a constante e
recompilar. Alternativas: o app oferecer quando detectar release novo; ou um comando
explícito.

**Decidir quando:** Etapa 4, ao desenhar a tela de sincronização.
