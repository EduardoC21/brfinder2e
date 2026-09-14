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

**DECIDIDO na Etapa 11, com o autor: paleta**, no modelo do Quick Insert do Foundry e da
busca de guias do Opera. Nem campo fixo na barra (ocuparia altura permanente para uma coisa
usada em rajadas) nem aba (busca não é lugar, é gesto).

O atalho é **Ctrl+Q por ora**, e não o Ctrl+Espaço que o autor quer: enquanto o app roda
numa aba do navegador, Ctrl+Espaço é do navegador. **Muda para Ctrl+Espaço no
empacotamento (Etapa 15)**, onde a janela é nossa.

Fica em aberto uma coisa só: **não há entrada visível** para a paleta — só o atalho. Um
botão na barra de topo resolveria, e é uma linha; a dúvida é se ele merece o espaço.
**Decidir quando:** o autor sentir falta.

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

---

## 10. Tradução dos traços, e onde ela mora `novo`

Registrado pelo autor na Etapa 15b, para não se perder até a etapa da tradução.

**O problema:** a caixinha do traço mostra a descrição em inglês, vinda da tabela de idioma
do Foundry (`glossary/traits`). Quando a tradução sob demanda existir, como se pede a
tradução DESSE texto? Ele não é entrada — não tem botão "Traduzir" próprio.

**A proposta do autor:** ao traduzir uma entrada, traduzir junto as descrições dos traços
que ela tem. O traço `agile` é traduzido uma vez e vale para todo chip que o carregue.

**O que isso puxa atrás:** uma vez traduzido, o traço passaria a aparecer SEMPRE traduzido,
em toda entrada — inclusive nas que a pessoa ainda lê no original. Daí a segunda parte da
proposta: uma **configuração** para escolher entre "o que tiver tradução aparece
traduzido" e "o original primeiro, sempre". Vale para traço e provavelmente para tudo.

**Consequência provável:** o traço vai precisar de uma **tabela própria** — original,
tradução e de onde veio —, e não só da chave `glossary/traits` de hoje, que guarda só o
original. Quando as fontes forem setorizadas, ela ficaria numa categoria de "termos de
jogo" ou "core", junto com perícia e ação.

**DECIDIDO (Etapas 30 e 31):** a configuração existe — `translation.display`, "Original"
ou "Traduzido", global — e o traço traduzido vem do pacote da comunidade, gravado como um
segundo glossário (`trans/<língua>/glossary/traits`) que a tela põe por cima do original
quando a preferência é "Traduzido". Sem tabela própria por traço: o glossário original e o
traduzido são as duas colunas. Registrado em ARCHITECTURE §12.

---

## 11. O Escudo do Mestre como módulo montável `novo`

Registrado pelo autor na Etapa 19b, ao tirar os dois índices da fonte de Regras.

**A ideia:** um módulo próprio, no topo do app, onde o usuário monta o SEU escudo do mestre
— colando blocos de informação de forma modular ao longo da tela (uma tabela de DCs, uma
regra, uma lista de condições), escrevendo anotações próprias, ou só deixando links que
abrem pop-outs.

**O que já existe para isso:** as duas páginas-índice do jornal `GM Screen` (`GM Screen`,
com 55 links, e `Player Screen`, com 11) são exatamente um escudo montado pela Paizo. Elas
ficaram FORA da fonte de Regras porque só apontam para o que a seção já organiza — mas
podem servir de molde, ou de "escudo padrão", quando o módulo existir. A leitura delas
está pronta: `sectionPages` em `normalization/rules.ts` já reescreve as referências
relativas para a forma canônica.

**O que ele exigiria:** um lugar para guardar o que o usuário montou (é preferência, então
`prefs/`), um desenho de bloco reordenável, e a decisão de se o texto colado é cópia ou
referência viva à entrada.

**Decidir quando:** depois das três fontes grandes e da setorização do trilho.

## 13. Familiares específicos e companheiros: não estão no zip `novo`

Medido na análise contra o AoN, Etapa 21 (11/09/2026).

**Familiares específicos:** o AoN lista 37 (Aeon Wyrd, Calligraphy Wyrm, Imp, Poppet…),
cada um com número de habilidades exigido, habilidades concedidas e 1–5 únicas. No zip,
**zero** como entidade — nem o nome aparece. O que existe são 10 habilidades únicas na
pasta `Specific Familiary Abilities` (Pot of Tea, Vina Song, Seal-Bearer…), que apontam
para familiares que o pack não tem. No Foundry o familiar é um ator que o jogador monta.

**Companheiros:** o AoN lista 97 (animais, elementais, mortos-vivos, avançados, únicos; 32
_Legacy_), 5 opções de avanço (Nimble, Savage, Indomitable, Genie-Touched, Unseen) e 11
especializações (Ambusher, Bully, Racer…). No zip, **nenhum pack** — "animal companion"
aparece 166 vezes em `feats` e 45 em `journals`, sempre como texto, nunca como bloco. O
"Wolf" que existe é o monstro do Monster Core. O sistema deixa companheiros para módulo à
parte; qual módulo, e se o dado dele serve, **não foi medido** — é a pesquisa do autor.

**Decidido por ora:** só a divisão de tipo das habilidades (Etapa 21). Familiares
específicos e companheiros esperam uma fonte: ou o módulo da comunidade tem JSON
aproveitável, ou é o AoN — e aí é a decisão do item 9.

**Decidir quando:** depois das três fontes grandes, com a pesquisa de companheiros feita.

## 14. As alterações de descrição que dependem da ficha `novo`

Registrado na Etapa 22e, a pedido do autor.

**O que é:** das 503 alterações de descrição (`ItemAlteration`, `property: description`)
nas fontes que temos ou vamos ter, 91 são estáticas e já se aplicam na consulta (o Change
Shape do Anadi). As outras **412** têm predicado sobre o ESTADO do personagem —
`item:tag:amped`, `spellshape:*`, `class:witch` + `item:trait:hex`,
`self:condition:sickened`, `{item|flags…}`, `item:granter:id:{item|id}` — e fora da ficha
não têm resposta.

**Decidido:** ficam para a ficha. A consulta mostra a entrada como o livro a imprime.

**O que já existe:** o dado em `raw/` (`system.rules` está em `defer` em toda receita) e o
leitor de blocos em `normalization/alterations.ts`, que resolve chave de idioma, título e
divisor. O que falta é o avaliador de predicado contra a ficha — `item:*`, `self:*`,
`class:*`, os `{…}` de interpolação — e rodar as alterações na abertura a partir da ficha,
com o mesmo `contextFor`.

**Decidir quando:** ao montar a validação da ficha.

## 15. O motor de tradução: o local (Bergamot) contra o do navegador `novo`

Registrado na Etapa 40, a pedido do autor: "se a do navegador na parte do texto livre for
muito superior, a gente cogita deixar o aplicativo como navegador só para ter acesso a
essa capacidade".

**A medição (14/09/2026):** 8 parágrafos de texto livre, de 8 tipos, traduzidos pelo
provedor local (Bergamot + glossário + blindagem) e pelo Google Tradutor na web — o mesmo
serviço da "traduzir página" do Chrome. A extensão do Chrome não estava conectada; a API
`Translator` no dispositivo (Chrome 138+) existia no painel mas `availability()` não
respondeu, então ficou sem medir.

| Trecho                              | Local (Bergamot)                                                      | Google                                                           |
| ----------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------- |
| "take a –4 status penalty to AC"    | "toma uma penalidade de estado –4 no para CA"                         | "sofre uma penalidade de -4 nos testes de resistência de CA"     |
| "you fall Prone and drop items"     | "você cair Prostrado e drop itens"                                    | "você cai no chão e deixa cair os itens"                         |
| "Stride twice"                      | "Avançar duas vezes"                                                  | "Dê dois passos"                                                 |
| "Burrowing, Climbing, Flying…"      | "o Burrowing, Escalada, Voar ou Nadar em vez de estriturar"           | "escava, escala, voa ou nada em vez de caminhar"                 |
| "Longswords, also known as…"        | "Longas palavras, também conhecidas como espadas armadas"             | "Espadas longas, também conhecidas como espadas de armar"        |
| "well-earned reputation… anvils"    | "reputação bem-gansa… ensconced… clanníveis… quentes… batendo anvils" | "reputação merecida… abrigado… clânicos… calorosos… em bigornas" |
| "brush off frightening experiences" | "eliminar experiências assustadoras"                                  | "evitar experiências assustadoras"                               |
| "Heightened (+1)"                   | "Elevada +1 dano (+1)"                                                | "Elevado (+1)"                                                   |

**O que a medição diz:** na PROSA LIVRE o Google é claramente superior — fluente, sem
palavra em inglês sobrando, sem "Longas palavras". Nos TERMOS DE JOGO é o contrário: o
Google perde o nome da condição ("cai no chão" por Prostrado), troca a ação ("Dê dois
passos" por Avançar duas vezes — Step não é Stride), dilui os nomes de ação ("escava,
escala, voa") e erra a sigla ("testes de resistência de CA"). O local acerta os termos
porque o glossário e a blindagem os seguram — e isso vale para QUALQUER motor que preserve
HTML, inclusive o do navegador.

**O que "virar navegador" custaria, de fato:**

- A "traduzir página" do Chrome traduz o DOM, na hora, pela nuvem: não grava, não edita,
  não funciona sem internet, e não existe no WebView2 do Tauri — só no Chrome aberto como
  site. O executável offline deixaria de ser o produto.
- A API `Translator` no dispositivo (Chrome 138+) é outra conversa: programática (a
  blindagem e o glossário se aplicam, o resultado se grava), offline depois do modelo, mas
  só no Chrome — não no WebView2, não no Firefox. Poderia ser um TERCEIRO provedor,
  "tradutor do navegador", disponível quando o app roda no Chrome, e indisponível no
  executável. A qualidade dela não é a do Google na nuvem — é de modelo local, como o
  Bergamot — e não foi medida.

**A API `Translator` do Chrome, medida (14/09/2026, Chrome 152, extensão conectada):**
modelo baixado com um clique (exige gesto do usuário), 8 parágrafos em **0,74 s** no
total. Qualidade ENTRE o Bergamot e o Google: "merecida reputação… martelos batendo nas
bigornas" (bom), mas "cai de bruços", "condições cegas e desprevenidas", "Passe duas
vezes" por Stride, "swing" sem traduzir, "armação de espadas". Não é um tradutor de HTML:
traduz o que está dentro de `translate="no"` (irrelevante — a blindagem descarta o
conteúdo) e MANGLA marca crua (`@Damage` virou `@damage`, o UUID perdeu a caixa) — mas
preservou os elementos da blindagem (`<x-tok>`, `<x-ref>`, `<span i>`) no teste. Serve
como provedor com a mesma blindagem, disponível quando o app roda no Chrome.

**O autor respondeu (Etapa 40):** o offline não importa; o executável era só distribuição.
Quer o melhor dos dois mundos, de graça para ele e para quem usa. Os caminhos estão na
conversa e a decisão fica para a próxima etapa.

**Recomendação (antes da resposta do autor):** não trocar de casa por causa disto. O caminho que não perde o offline
é (1) medir a API `Translator` no Chrome de verdade (extensão conectada, ou o app aberto
no Chrome com um botão de teste nas configurações), e se ela for melhor que o Bergamot,
entrar como provedor com a mesma blindagem; (2) o modelo de linguagem BYOK, que já estava
no plano, é o que dá prosa de qualidade Google-ou-melhor com o glossário no contexto —
para quem quiser pagar por ele.

**Decidir quando:** depois da medição da API `Translator` no Chrome.
