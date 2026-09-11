# Inconsistências no dado do Foundry

Defeitos encontrados no pacote `pf2e` do Foundry VTT enquanto as receitas eram escritas,
para virar um pull request ao repositório deles. **Só entra aqui o que foi medido** — o
número está no código, num teste de contrato ou num commit. Lembrança sem número não entra;
a varredura completa fica para o fim.

Cada item diz **onde** (pack e caminho), **o quê**, **como foi visto** e **o que o app faz**
enquanto isso. A versão medida é sempre a do `KNOWN_GOOD_TAG` em `core/source/`.

Versão medida: **`pf2e-8.5.0`**.

---

## 1. Dado errado ou inconsistente

### 1.1 `equipment-srd` — `Juggling Club`: `splashDamage.value` é string vazia

- **Caminho:** `system.splashDamage.value`
- **O quê:** vale `""` num único item; nos outros 995 que têm a chave, é número.
- **Como foi visto:** a receita de equipamento falhava a entrada inteira com "esperado
  inteiro, recebido string". Etapa 12g.
- **No app:** `toSplash` trata string como zero.

### 1.2 `equipment-srd` — `Worldscale Shield`: escudo com dureza e PV zero

- **Caminho:** `system.hardness`, `system.hp.max`
- **O quê:** é o único dos 126 escudos com os dois zerados. Escudo sem PV não existe no
  jogo.
- **Como foi visto:** contagem no contrato de equipamento (125 de 126). Etapa 12f/12g.
- **No app:** zero vira nulo e a linha some.

### 1.3 `feats-srd` — `system.rarity` contradiz `system.traits.rarity` em 10 talentos

- **Caminho:** `system.rarity` (chave morta) vs `system.traits.rarity` (a viva)
- **O quê:** nas máscaras de `Vigilant Mask` a `Tireless Guide's Mask` (10 talentos), a chave
  morta diz `common` e a viva diz `rare`. Resto de migração.
- **Como foi visto:** relatório de não mapeados na receita de talento. Etapa 9.
- **No app:** ignorada; a autoridade é `traits.rarity`.

### 1.4 `actionspf2e` — `system.traits.selected` contradiz `system.traits.value`

- **Caminho:** `system.traits.selected` (8 das 574)
- **O quê:** cache de interface que vazou para o compêndio. Em pelo menos três contradiz o
  `value`: `Steel Your Resolve` tem `value` vazio e `selected: ["general"]`;
  `Soaring Flight` tem `transmutation` só no `selected`.
- **Como foi visto:** relatório de não mapeados na receita de ação. Etapa 6.
- **No app:** ignorada.

### 1.5 `actionspf2e` — `Disengage`: `folder` aponta para pasta que não existe

- **Caminho:** `folder`, contra `actionspf2e_folders.json`
- **O quê:** a chave existe mas o id não está no arquivo de pastas. É a única ação assim.
- **Como foi visto:** o setor saiu vazio para uma entrada só. Etapa 6.
- **No app:** setor vazio.

### 1.6 `spells-srd` — 4 magias com o traço `attack` sem ataque nenhum

- **Caminho:** `system.traits.value`
- **O quê:** `Incarnate Ancestry` e `Lucky Month` (que têm `attack` como ÚNICO traço, o que
  denuncia o erro), `Unseen Heralds` e `Shambling Horror` trazem o traço `attack` sem que o
  texto peça jogada de ataque.
- **Como foi visto:** o filtro de defesa, que lê o traço para inferir CA, dava "CA" a
  quatro magias que o Archives of Nethys não dá. Conferido entrada a entrada no AoN.
  Etapa 10c.
- **No app:** o erro passa para a tela (o filtro de defesa as marca como CA).

### 1.7 `backgrounds` — `trainedSkills.lore` com erro em 11 antecedentes

- **Caminho:** `system.trainedSkills.lore` (a descrição escreve certo em todos)
- **O quê:** três famílias de defeito, todas no CAMPO:
  - **grafia:** `Gladatorial Lore` (`Ruby Phoenix Enthusiast`, `Gladiator`,
    `Sleepless Suns Star`), `Gladitorial Lore` (`Clockfighter`), `Geneaology Lore`
    (`Songsinger in Training`), `UndeadLore ` sem espaço e com espaço no fim
    (`Once Bitten`), `Theatre Lore` onde o texto diz `Theater` (`Entertainer`);
  - **dois Saberes numa string só:** `Art Lore and Underworld Lore`
    (`Undercover Lotus Guard`), `Gladatorial Lore or Genealogy Lore` (`Sleepless Suns Star`);
  - **marcação e prosa dentro do campo:** `**Boneyard Lore (with Additional Lore perks)`
    (`Returned`), `Settlement or Terrain Lore` (`Free Spirit`),
    `Lore associated with the chosen energy` (`Energy Scarred`).
- **Como foi visto:** ao decidir tirar o Saber do detalhe, medi se a descrição o citava:
  416 de 427. Os 11 listados aqui um a um. Etapas 15a e 18.
- **No app:** o campo (com o erro) é coluna e filtro; a descrição é o que se lê.

### 1.8 `backgrounds` — 25 talentos citados por nome, sem `@UUID`

- **Caminho:** `system.description.value` vs `system.items`
- **O quê:** o antecedente concede o talento (está em `items`, com UUID), mas a descrição o
  escreve como texto puro em vez de link. Os 25: `Acupuncturist` → Battle Medicine,
  `Silk Farmer` → Specialty Crafting, `Gossip` → Hobnobber, `Bachuan Revolutionary` → Sign
  Language, `Traveling Gourmand` → Forager, `Tiffin Box Deliverer` → Streetwise,
  `School Medic` → Battle Medicine, `Runaway Noble` → Bon Mot, `Party Scholar` → Charming
  Liar, `Eagle Hunter` → Train Animal, `Ocean Diver` → Underwater Marauder,
  `Remittance Agent` → Experienced Professional, `Respected Mentor` → Fascinating
  Performance, `Convocation Scout` → Group Impression, `Ambitious Knave` → Dirty Trick,
  `Ghostwriter` → Experienced Professional, `Weaver` → Specialty Crafting,
  `Town Troublemaker` → Dirty Trick, `Demon Hunted` → Intimidating Glare,
  `Working Student` → Streetwise, `Streetfood Vendor` → Seasoned, `Jeweler` → Crafter's
  Appraisal, `Wish for Riches` → Subtle Theft, `Academic Scion` → Arcane Sense,
  `Library Dweller` → Additional Lore.
- **Como foi visto:** 379 dos 404 trazem o `@UUID` no texto. Etapas 15a e 18.
- **No app:** por isso a linha TALENTO ficou no detalhe.

### 1.9 `deities` — 3 domínios citados sem página no jornal `Domains`

- **Caminho:** `system.domains.primary` / `alternate` vs páginas do jornal
- **O quê:** `void` (29 divindades), `wyrmkin` (24) e `delirium` (25) são citados e não têm
  página. Os outros 61 têm.
- **Como foi visto:** contrato de divindade/domínio. Etapa 17.
- **No app:** ficam como texto, sem abrir nada.

### 1.10 `deities` — divindades sem atributo divino

- **Caminho:** `system.attribute`
- **O quê:** vazio em 7 (`Asmodeus` entre eles) e com UM só em 2 (`Kabriri`: dex,
  `Tolte Coatl`: con). O livro dá dois a todo deus; vale conferir se as 7 são só as
  filosofias ou se `Asmodeus` está mesmo faltando. **A conferir no livro.**
- **Como foi visto:** contagem na receita de divindade. Etapa 17.
- **No app:** a linha some.

### 1.11 `familiar-abilities` — as 14 habilidades de MESTRE não têm marca

- **Caminho:** `system.category` (vale `familiar` nas 111), `system.traits.value`, `folder`
- **O quê:** o livro divide as habilidades em "familiar abilities" e "master abilities"
  (Player Core pg. 212–214); o pack tem as 63 do livro (49 + 14, conferidas nome a nome
  contra o AoN) e nenhum campo diz qual é qual. A única pista é prosa: 3 descrições dizem
  "master ability" (`Spell Battery`, `Versatile Form`, `Spirit Touch`). A pasta única
  (`Specific Familiary Abilities`, 10 documentos) marca outra coisa.
- **Como foi visto:** análise de familiar contra o AoN, depois da Etapa 20b.
- **No app:** por ora nada; a tela de familiar não separa. Quando separar, a lista das 14
  terá de ser nossa.

---

## 2. Chaves mortas e erros de grafia

### 2.1 `backgrounds` — `system.trainedSkills.custom` vale `""` em 156 dos 520

- Chave do Saber escrito à mão de antes do Remaster, substituída por `trainedSkills.lore`.
  Vazia em todos que a têm. Etapa 14.

### 2.2 `familiar-abilities_folders.json` — pasta `Specific Familiary Abilities`

- "Familiary" com erro de grafia. Etapa 16.

### 2.3 `lang/en.json` — 14 traços com descrição e sem rótulo

- Existe `PF2E.TraitDescription<Nome>` e não existe `PF2E.Trait<Nome>` para: `hefty`,
  `boost`, `class`, `coatl`, `critical`, `deflecting`, `entrench`, `entu`, `integrated`,
  `monk-weapon`, `none`, `peachwood`, `professional`, `shield-throw`. Etapa 15b.

### 2.5 `ancestries` — o link de rodapé sem rótulo em Tripkee e Kholo

- O resumo dos 50 termina com `@UUID[…JournalEntryPage…]{Nome}` para a página do jornal.
  Em `Tripkee` e `Kholo` o `{Nome}` falta (e em Kholo o link vem dentro de `<em>`): no
  Foundry aparece o UUID cru. Etapa 22b.
- **No app:** o rodapé sai do resumo nos 50 (`semRodape`), com ou sem rótulo.

### 2.4 `deities` — `system.traits` é objeto vazio em 473 e ausente em 7

- Forma comum dos itens sem conteúdo nenhum. Não é erro — é ruído. Etapa 17.

---

## 3. Para a varredura final

Coisas que foram VISTAS mas não medidas o bastante para entrar acima. Não afirmar nada
delas sem medir de novo.

- Equipamento: a pasta do compêndio (`family`) parecia discordar dos traços em parte dos
  163 itens que a têm. Foi o motivo de tirá-la (Etapa 12g), mas os casos não foram
  listados.
- Magias: além das 4 do item 1.6, a defesa de outras magias divergia do AoN "nos dois
  sentidos" na Etapa 10c (Phase Bolt entre elas). Os casos exatos precisam ser recontados.
- Traços parametrizados de escudo (`integrated-1d6-s`, `integrated-1d6-s-versatile-p`):
  slug composto que nenhuma regra de sufixo alcança. 2 usos. Pode ser modelagem, não erro.
- 33 traços usados nas fontes importadas sem `PF2E.TraitDescription` (`jotunborn`,
  `naari`, `yaksha`…). Provavelmente traços de criatura sem texto de propósito.

---

## Como medir de novo

Todo número acima sai de `npm run test:contract` ou de um script sobre o zip em
`.dados/json-assets-<tag>.zip`. Antes de abrir o PR, rodar contra a tag mais nova: parte
disso pode já ter sido corrigida lá.
