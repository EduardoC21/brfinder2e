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

**DECIDIDO na abertura da Etapa 10, com o autor: inglês**, como já estava. O chip foi
desenhado na Etapa 8 e a decisão ficou pendente enquanto o dado já rodava em inglês por
omissão — agora é escolha.

---

## 5. Pop-out: painel dentro da janela ou janela do sistema? `novo`

**Decidido na Etapa 8b:** painel flutuante DENTRO da janela do app (`FloatingPanel`), não
uma segunda janela do sistema operacional.

O que fica em aberto é a promoção: o Tauri sabe abrir uma segunda janela nativa, e ela
teria uma vantagem real — ficar por cima de OUTROS programas, o que serve para consultar
uma condição com o Foundry na frente. O custo é que a segunda janela é outro processo de
interface: o estado tem que atravessar, e nada do que temos hoje atravessa.

Não vale gastar isso antes de saber se alguém quer. **Decidir quando:** Etapa 15, com o
empacotamento na mesa, e só se o uso pedir.

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

---

## 9. O Archives of Nethys como fonte: dá, mas não é a mesma coisa `novo`

Levantado na Etapa 10f, quando o dado do Foundry errou o traço de quatro magias e deixou
de declarar a CA em 82. O AoN transcreve o livro à mão e acerta os três casos que o autor
conferiu — a pergunta virou se dá para puxar dali.

**Dá, e é barato.** O site tem um Elasticsearch público em
`https://elasticsearch.aonprd.com/aon/_search`, sem chave e sem autenticação, que é o mesmo
que a busca do site usa. Medido em 2026-09-07:

|                                             |                                                      |
| ------------------------------------------- | ---------------------------------------------------- |
| documentos no índice inteiro                | 45.547 (todas as categorias)                         |
| magias                                      | 2.762 — legado E remaster, ligados por `remaster_id` |
| lote de 1.000 magias com o texto completo   | 5,8 MB em ~3 s                                       |
| lote de 1.000 só com os campos estruturados | 1,3 MB em ~3 s                                       |
| todas as magias                             | ~16 MB em 3 requisições                              |
| `robots.txt`                                | não existe (404) — nada proíbe, e nada autoriza      |

E o dado é **melhor exatamente onde o nosso dói**: `saving_throw` vem como o livro escreve
(`"AC and basic Fortitude (see text)"`, em Pulverizing Wake), `area` + `area_type` +
`area_raw` vêm separados, `range` vem numérico ao lado do `range_raw`, e `spell_type`
já diz Focus/Ritual/Spell — o setor, de graça.

**O que impede de trocar a base por ele:**

1. **Não é artefato versionado.** O Foundry publica um `.zip` de release, com tag, que a
   gente fixa (`KNOWN_GOOD_TAG`), rebaixa quando quebra e testa contra. O AoN é um SERVIÇO
   vivo: o índice se chama `aon-20260902-190924` e é reconstruído sem changelog, sem
   promessa e sem cópia offline. Toda a política de versão do app supõe a primeira coisa.
2. **É endpoint não documentado.** Pode fechar, virar autenticado ou passar a limitar taxa
   sem aviso — e aí o app quebra sem ninguém ter mexido nele.
3. **A estrutura é mais fina.** `saving_throw` é uma FRASE, não `{statistic, basic}`.
   Ótimo para mostrar, pior para filtrar: voltaríamos a analisar prosa, que é o que a
   receita existe para evitar.
4. **O texto vem em marcação própria** (`<title>`, `<traits>`, `<trait label= url=>`,
   `<row>`, `<column>`), uma segunda linguagem para o `core/markup/` além do HTML do
   Foundry.
5. **Não tem o grafo de `@UUID`.** As referências cruzadas do AoN são links
   `/Spells.aspx?ID=1159`; o pop-out por referência que a gente quer construir se apoia nos
   UUIDs do Foundry.
6. **Traz legado e remaster juntos** — 2.762 contra as nossas 1.994.

**Recomendação: não trocar, e não sincronizar dele em produção.** O caminho barato é usar o
AoN como **folha de conferência**: um script de desenvolvimento que baixa uma vez, compara
campo a campo com a nossa base e escreve um relatório de divergências. Era exatamente isso
que teria apontado os quatro traços errados sem a gente adivinhar. Assim ele vira TESTE, e
não dependência de execução — e nada do conteúdo entra no repositório, como já vale para o
Foundry.

**Decidir quando:** quando a divergência voltar a doer. Enquanto for uma linha de defesa em
quatro magias, o custo de manter duas fontes é maior que o erro.
