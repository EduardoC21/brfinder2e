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

### 1.12 `ancestries` — `Awakened Animal`: `hp`, `size` e `speed` são marcadores

- **Caminho:** `system.hp` (6), `system.size` (`med`), `system.speed` (5)
- **O quê:** o livro diz PV pelo tamanho (6/6/8/10), tamanho à escolha e deslocamento 20
  (ou pela herança). No pack os três campos têm valores fixos que não são os do livro; a
  verdade está em `system.rules`: `ChoiceSet` de tamanho com `hitPoints`, `CreatureSize`
  e `BaseSpeed land 20`. Fleshwarp e Automaton também escolhem o tamanho por `ChoiceSet`
  com `size` fixo no campo. Merfolk e Athamaru têm `BaseSpeed swim 25` sem campo.
- **Como foi visto:** o autor comparou a lateral com o livro. Etapa 23d.
- **No app:** `sizes`, `hpOptions`, `speed` e `swim` derivados das regras.

### 1.13 `journals` — página `Guardian` (Multiclass Archetypes) sem o título da dedicação

- **Caminho:** `Archetypes` → `Multiclass Archetypes` → `Guardian`, `text.content`
- **O quê:** as outras 28 páginas de multiclasse abrem com `<h2>@UUID{X Dedication} Feat
2</h2>`; a do Guardian vai da prosa direto aos traços e ao texto da dedicação, sem o
  `<h2>` — o talento `Guardian Dedication` existe em `feats-srd`, só não é citado.
- **Como foi visto:** o autor viu o Guardian sem nível na lista de arquétipos. Etapa 25b.
- **No app:** recuperada pela tabela de talentos por nome ("Guardian Dedication"), aceita
  só porque o começo da descrição do talento está no texto da página (Etapa 25c).

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

### 2.7 `classes` — `keyAbility.selected` nulo em 4, e `trainedSkills.custom` em 7

- `system.keyAbility.selected: null` em Guardian, Runesmith, Commander e Necromancer (as
  quatro mais novas): cache de escolha da ficha, como o `traits.selected` das ações.
  `system.trainedSkills.custom` existe em 7 e vale `""` em 6; no Thaumaturge vale
  "Esoteric Lore". Etapa 26.
- **No app:** ignorados.

### 2.8 `classfeatures` — `system.actionCategory.value` vazio em 10

- As 10 modificações de inovação do Inventor (Razor Prongs, Hefty Composition…) trazem
  `actionCategory: {value: ""}`; nenhuma outra das 874 tem a chave. Etapa 26.
- **No app:** ignorado.

### 2.9 `classfeatures` — a habilidade compartilhada leva o livro de UMA classe

- Das 373 habilidades que as 29 classes apontam em `system.items`, 27 são compartilhadas
  por mais de uma classe (Weapon Specialization por 26, Weapon Expertise por 16,
  Perception Expertise por 15…), e cada documento tem UM `publication.title`: o da
  classe para a qual foi escrito primeiro. Resultado: em 161 pares classe→habilidade o
  livro da habilidade não é o da classe — o Weapon Specialization do Rogue (Player Core)
  diz "Guns & Gears"; a Perception Expertise do Sorcerer diz "Rage of Elements". E
  "Assured Runic Crafter" (Runesmith) tem o título VAZIO. Etapa 26b.
- **No app:** a coluna Livro da aba Habilidades da classe mostra o livro do DOCUMENTO,
  que é o que existe. Não há de onde tirar o livro "no contexto da classe".

### 2.10 `classes` — o Ranger sem Nature em `trainedSkills`

- A página do jornal diz "Trained in Nature, Trained in Survival"; o pack traz
  `trainedSkills.value: ['survival']`. Das 29, é a única em que o bloco "Skills" da página
  e o campo divergem. Etapa 26g.
- **No app:** a lateral mostra o campo (Survival). Não há de onde inferir sem ler a prosa.

### 2.6 `journals` — página `Kashrishi`: "Emphathic Sense"

- O bloco de mecânica escreve "Emphathic Sense" duas vezes; a habilidade em
  `ancestryfeatures` chama-se "Empathic Sense". Etapa 24.

### 2.4 `deities` — `system.traits` é objeto vazio em 473 e ausente em 7

- Forma comum dos itens sem conteúdo nenhum. Não é erro — é ruído. Etapa 17.

---

## 3. A varredura (Etapa 29)

Medida com `scripts/varredura-foundry.py` sobre o `pf2e-8.5.0`, cruzando o pack com ele
mesmo (a prosa do jornal contra os campos) e com o Archives of Nethys (baixado por
`scripts/aon-dump.py`, na mesma era: Remaster com Remaster, legado com legado). O
relatório inteiro fica em `.dados/varredura/relatorio.md` e `.json` (fora do git); aqui
ficam os números e os casos que valem abrir. **Nem toda divergência é do Foundry** — onde
o AoN costuma estar incompleto está dito. O PR ao pf2e se faz em outro chat, com o
repositório deles clonado; este arquivo é a lista de entrada.

### 3.1 Magias × AoN — 1.606 comparadas, 150 divergências

- **Rank:** Corpse Bloom `1` × AoN `3`.
- **Alcance:** Thief of Fortune `60` × `30`; Flame Barrier `30` × `60`.
- **Ações (14):** Cup of Dust `3` × `2`, Theogeny `2` × `3`, Wish Market `2` × `1`, Warning
  Stripes `2` × `1`, Sawtooth Terrain `2` × `3`, Far-Flung Fetch `2` × `1`, Timely Reminder
  `2` × `3`, Ember Doppelgänger `2` × `3`, Metal Merged `2` × `1`, Patron's Protector `2` ×
  `3`, Summon Oliphaunt of Jandelay `2` × `3`, Rune Trap `10 minutes` × `1 hour`; Splinter
  Volley e Howling Blizzard só diferem no "2 a 3".
- **Salvamento (16 + 23):** 16 em que o Foundry não tem `defense` e o AoN tem (Boots on the
  Ground `will`, Manifest Will `basic reflex`, Overwhelming Memory `will`, Cinder Swarm…) ou
  o tipo difere (Ymeri's Mark `basic reflex` × `fortitude`; Murderous Vine `fortitude-dc` ×
  `fortitude`, um valor que não é dos quatro); e 23 em que só o `basic` difere (Rouse
  Skeletons, Phantasmal Calamity, Floating Flame…: Foundry `basic`, AoN sem) — **a
  confirmar no livro**, o AoN abrevia.
- **Tradições (8):** Incarnate Draconic Legion `arcane` × as quatro; Fungal Exhalation,
  Mushroom Patch e Hedge Prison sem tradição × `primal`; Guiding Star sem `occult`;
  Banishing Touch, Bacchanalia e Frost's Touch com tradições × AoN vazio (aí é o AoN).
- **Raridade:** Adapt Self `common` × `uncommon`.
- **Traços (85):** quase todo o resto é o AoN sem `concentrate`/`manipulate` (25) ou sem
  `attack` (8), ou com o traço de classe `druid` (7) que o Foundry não põe em magia —
  ruído do AoN, não do Foundry.
- O que a Etapa 10c tinha visto ("Phase Bolt, nos dois sentidos") está coberto: o par
  Remaster/legado do AoN era o que confundia, e na mesma era o Phase Bolt bate.

### 3.2 Talentos × AoN — 4.677 comparados, 309 divergências

- **Nível (12):** Voice of the Elements `5` × `2`, Draconic Scent `5` × `4`, Practical
  Magic `6` × `1`, Animal Soul Siblings `5` × `1`, Devoted Focus `10` × `12`, Feathered
  Flechettes `6` × `8`, Death from Above `8` × `16`, Remote Detonation `1` × `8`, Basic
  Magus Spellcasting `6` × `4`, Dual-Weapon Reload `1` × `4`, Blade of Law `12` × `10`,
  Uplifting Winds `12` × `16`. Parte pode ser talento HOMÔNIMO de outro livro — ler.
- **Raridade (10):** Army of One, Death from Above, Crossbow Infiltrator Dedication e
  Jousting Mount `uncommon` × `common`; Spellshot Dedication, Remote Detonation,
  Sleepwalker Dedication, Ultimate Flexibility, Spell Mastery e Unstoppable Juggernaut
  `common` × `uncommon`.
- **Ações (68):** 11 sem custo no Foundry com `1` no AoN e 9 com `2`, 5 com `reaction`; 6
  com `2` no Foundry e nada no AoN; 4 `3` × `2`. Os "1 a 2" e "2 a 3" do AoN (17) o Foundry
  não modela — não contam.
- **Pré-requisitos, presença (54):** 35 o Foundry tem e o AoN não; 19 o AoN tem e o Foundry
  não (Draconic Scent "Dragon Disciple Dedication"…). Os 19 valem olhar.
- **Traços (165):** o grosso é o AoN pondo traço de ancestralidade ou de categoria que o
  Foundry guarda em campo — `locathah` (30), `universal-ancestry` (24), `skill` (10),
  `general` (9), `half-elf` (4) — ruído; e `metamagic`/`spellshape` que a mesma era
  já mistura. Sobra pouco de fato.

### 3.3 Equipamento × AoN — 3.526 comparados, 250 divergências

- **Preço (27), os que parecem dígito trocado:** Ring of Fair Assessment `350 gp` × `35 gp`;
  Hollow Robes `3.000 gp` × `300 gp`; Traitor's Ring `15 gp` × `1,5 gp`; Digly's Oil of
  Sympathy (Minor) `4 gp` × `40 gp`; One Day's Breath `60 gp` × `6 gp`; Look-Me-Not `300 gp`
  × `150 gp`; Fearcracker `25 gp` × `5 gp`; Gakgung `2 gp` × `6 gp`; Chakri `20 cp` × `2 cp`;
  Bellows Pipes `140 gp` × `50 gp`; Tales in Timber `1.000 gp` × `850 gp`; Bleeding Canines
  `320 gp` × `520 gp`; Lattice Armor `6 gp` × `9 gp`; Fan of Falling Words `900 gp` × `1.300
gp`; Elven Chain (Standard-Grade) `740 gp` × `2.500 gp` e (High-Grade) `16.800 gp` ×
  `52.000 gp`; Aeon Stone (Peering) `8.500 gp` × `9.500 gp`; Slumber Arrow `11 gp` × `10 gp`;
  Undertaker's Manifest `200 gp` × `220 gp`; Rusting Ammunition (Greater) `600 gp` × `3.600
gp`; Mentalist's Staff (Greater) `450 gp` × `460 gp`; Sanguine Pendant (Greater) `17.000
gp` × `13.000 gp`. E 5 com preço ZERO no Foundry e preço no AoN: Whispering Veil (2.600
  gp), Hero Killer (120 gp), Panaceatic Salve (155 gp), Arclord Eye (350 gp), e Scroll
  Robes/Gi sem preço nenhum.
- **Nível (35):** materiais em ingote/pedaço/lenho com nível `0` no Foundry e o nível do
  material no AoN (Orichalcum 17, Adamantine/Dawnsilver/Duskwood/Peachwood 8, Cold Iron/
  Silver 2 — 13 itens: modelagem do Foundry, não erro); e os que valem olhar: Lifebloom `6`
  × `8`, Irritating Seedpod `7` × `3`, Stolen Countenance `13` × `11`, Atmospheric Staff `8`
  × `4`, Fey Dragonet Liqueur `12` × `7`, Vernai Shell `16` × `15`, Reaper's Sigh `7` × `8`,
  Chimera Thread `5` × `4`, Blood-Drinker `18` × `16`, Harpy's Talon `1` × `2`, Beekeeper's
  Smoker `1` × `2`, Traveler's Chair `0` × `1`; e 8 com nível `1` no Foundry e `0` no AoN
  (Repeating Crossbow, Repeating Hand Crossbow, Aldori Dueling Sword, 8-Round Magazine,
  Flying Talon, Serene Smelling Salts, Atmospheric Breathing Suit `3`, War Saddle `5`,
  High-contrast Goggles `4`).
- **Arma:** Chakri `martial 1d6` × `Advanced 1d4 S`; Feng Huo Lun `1d4` × `1d6 S`; Panabas
  grupo `axe` × `Sword`; Tri-bladed Katar `knife` × `Brawling`; Repeating Heavy Crossbow,
  Rotary Bow, Taw Launcher e Repeating Hand Crossbow grupo `crossbow` × `Bow` (o AoN é que
  está velho: são bestas); Blowgun e Dart Umbrella dano `1d` × `1 P` (o Foundry guarda `1`
  sem dado — modelagem). Buckle Armor categoria `light` × `Unarmored`.
- **Raridade (30):** Execution Powder, Phantom Fang, Thousand-Blade Thesis, Dezullon
  Fountain, Dragontooth Club, 8-Round Magazine, Lethargy Poison `uncommon` × `common`;
  Irritating Seedpod, Dragon Rune Bracelet, Poet's Fritter (3), Sure-Step Crampons, Beetle
  Gel, Repeater Bandolier, Bola `common` × `uncommon`; Moritype `rare` × `uncommon`;
  Addiction Suppressant (4), The Kardosian Fragments, Beloved's Bracelets, Chromatic Robe,
  Doomsday Door, One Day's Breath `rare` × `common`; Forgefather's Seal `rare` × `unique`;
  Candlecap `common` × `unique`; Aeon Stone (Western/Eastern Star) `rare` × `uncommon`.
- **Volume (144):** quase todo `L` × `—` e `1` × `L` — o AoN escreve o volume de itens
  vestidos e o Foundry o do item solto, ou vice-versa. Só com o livro. Lista no JSON.

### 3.4 Antecedentes × AoN — 248 comparados, 53 divergências

- **Aumento (3):** Archival Assistant `Con/Sab` × `Int/Sab`; Absalom Street Preacher
  `Con/Int` × `Con/Sab`; Feral Child três fixos × AoN vazio.
- **Talento (17):** 10 o Foundry concede e o AoN não lista (Hired Killer, Tech-Reliant,
  Planar Migrant, Tree Friend, Eagle Hunter, Driver, Pilgrim, Returned, Belkzen
  Anthropologist…) — provável AoN; 7 o AoN lista e o Foundry não concede: Anti-Thrune
  Saboteur (Lengthy Diversion), Nomad, Stargazer, Aeronaut, Farmhand, Scholar (Assurance),
  Haunted (Diehard), Alloysmith (Specialty Crafting) — **valem olhar**.
- **Perícias (33):** Anti-Thrune Saboteur `Cheliax Lore, Engineering Lore` × `Deception,
Thievery` (o único caso de perícia trocada); Hermit sem nada × `Nature, Occultism`; Kaiju
  Stalker com `Athletics, Kaiju Lore` × vazio; e erros de grafia no Foundry: "Gladatorial
  Lore" (Gladiator) e "Gladitorial Lore" (Clockfighter), "Theatre Lore" (Entertainer, o AoN
  escreve Theater). O resto é o Saber que um lado nomeia e o outro não.

### 3.5 Ancestralidades × AoN — 31 comparadas, 2 divergências

- Só o Awakened Animal, que no AoN não tem PV nem deslocamento numérico (item 1.12). PV,
  deslocamento, tamanho, aumentos, falha e idiomas batem nas outras 30.

### 3.6 Classe: página do jornal × campos — 29, 1 divergência

- Só o Ranger sem Nature (item 2.10). PV, percepção, resistências, perícias extras, ataques
  e defesas batem nas 29.

### 3.7 Classe: habilidades por nível × tabela de progressão — 29, 34 nomes que não batem

- Nenhum NÍVEL errado: são NOMES que a tabela escreve de um jeito e o item de outro —
  "Reflex Expertise" × "reflex expert", "Greater Rogue Reflexes" × "improved rogue
  reflexes", "Perception Mastery" × "vigilant senses", "Bloodline Spells" × "bloodline",
  "Psi Cantrips and Amps", "Oracular Curse" × "curse", "Second Gate's Threshold" × "gate's
  threshold". 34 casos em 11 classes (Rogue 5, Thaumaturge 6, Oracle 4, Swashbuckler 4,
  Sorcerer 3, Kineticist 3…). É a tabela do livro velho contra o item renomeado — para o
  PR, se eles quiserem a tabela no vocabulário do Remaster.

### 3.8 Ancestralidade: bloco de mecânica do jornal × campos — 50, 0 divergências

### 3.9 Divindades: texto × domínios — não se aplica

- A descrição da divindade no pack não repete os domínios em texto; não há o que cruzar.

### 3.10 As quatro pendentes, medidas

- **Pasta × traços (163 em pasta, 36 sem eco):** 35 Aeon Stones e 1 em Materials. A pasta
  é organização do compêndio, não traço — não é defeito. Fecha o que a Etapa 12g viu.
- **Traços compostos `integrated-*`:** 8 itens — Klar, Sanguine Klar (2), Hippopotamus
  Klar, Razor Disc, Highhelm War Shield (3). É modelagem do dano integrado do escudo, não
  erro.
- **Traços sem `PF2E.TraitDescription` (403 usados, 21 sem):** `guardian` (83 usos — o traço
  da classe Guardian sem descrição), `harrow-court` (54), `yaksha` (30), `yaoguai` (27),
  `jotunborn` (27), `sarangay` (26), `tanuki` (25), `naari` (25), `dragonet` (20),
  `hungerseed` (11), `trial` (5), `pervasive-magic` (4), `additive1`/`additive2` (6),
  `stamina` (3), `spellshot` (3), `circus` (1); e os quatro de alinhamento legado (`good`
  16, `evil` 11, `chaotic` 3, `lawful` 1). Os de ancestralidade e o `guardian` valem PR.
- **Defesa das magias:** é o 3.1.

---

## Como medir de novo

Todo número acima sai de `npm run test:contract` ou de um script sobre o zip em
`.dados/json-assets-<tag>.zip`. A seção 3 sai de dois scripts, que ficam no repositório:

    python scripts/aon-dump.py spell feat weapon armor shield equipment background ancestry class
    python scripts/varredura-foundry.py .dados/json-assets-pf2e-8.5.0.zip

O primeiro baixa do Archives of Nethys só os campos comparados (em `.dados/aon/`, fora do
git); o segundo escreve `.dados/varredura/relatorio.md` e `.json`. Antes de abrir o PR,
rodar contra a tag mais nova: parte disso pode já ter sido corrigida lá.
