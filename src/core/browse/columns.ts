/**
 * As colunas ESPECIAIS: nível, raridade e traços.
 *
 * Especiais porque não são coluna: são informações do próprio item, coladas ao nome.
 *
 *   ` 12  Godbreaker ⌷R⌷ ⌷concentrate⌷ ⌷manipulate⌷ ⌷+2⌷`
 *      ^  ^          ^   ^
 *   calha  nome  raridade  traços
 *
 * Por isso não têm título no cabeçalho, não entram no teto de colunas personalizadas e não
 * mudam de lugar — a posição delas em relação ao nome é fixa e significa algo. O que se
 * pode fazer é ligá-las e desligá-las.
 *
 * Aqui mora só o que é DADO. O desenho é da UI, como sempre.
 */

/**
 * Largura média de um caractere nos traços, medida na tela.
 *
 * IBM Plex Mono a 11px dá 6,6px por caractere — mono, então a média é o valor exato.
 */
export const TRAIT_CHAR_PX = 6.6;

/** Recheio e vão de uma caixinha de traço: 8px de cada lado mais 4px até a seguinte. */
export const TRAIT_CHIP_PX = 20;

/** Nome em Spectral a 15px: 7,52px por caractere, medido. É média, porque é serifada. */
export const NAME_CHAR_PX = 7.52;

export interface TraitBudget {
  /** Os traços que cabem, na ordem original. */
  readonly shown: readonly string[];
  /** Quantos ficaram de fora. Zero quando coube tudo. */
  readonly hidden: number;
}

function larguraDe(trait: string): number {
  return trait.length * TRAIT_CHAR_PX + TRAIT_CHIP_PX;
}

/**
 * Quantos traços cabem em `disponivel` pixels.
 *
 * ⚠️ A conta é feita no DADO, a partir de uma largura medida UMA vez — e não medindo cada
 * linha. Medir por linha exigiria um `ResizeObserver` por linha, vezes 766 hoje e 6.284
 * quando chegarem os talentos. Aqui a UI mede a trilha do nome uma vez (uma observação
 * para a lista inteira) e cada linha faz aritmética.
 *
 * O preço é ser estimativa: a largura do nome é média de caractere numa fonte serifada.
 * Erra alguns pixels, e o erro aparece como um traço a mais ou a menos — não como layout
 * quebrado, porque a célula corta o que passar.
 *
 * Quando nem UM cabe, a linha fica só com o `+N`. Foi decisão do autor, e é a certa: o
 * `+3` sozinho já diz "esta entrada tem traços, abra para ver", enquanto um traço espremido
 * até as reticências não diz nem isso e ainda empurra o nome.
 */
export function fitTraits(traits: readonly string[], disponivel: number): TraitBudget {
  if (traits.length === 0) return { shown: [], hidden: 0 };

  const shown: string[] = [];
  let usado = 0;

  for (let i = 0; i < traits.length; i++) {
    const trait = traits[i];
    if (trait === undefined) continue;

    /*
     * Guarda espaço para o `+N` sempre que ainda houver traço depois deste. Sem isso, o
     * último traço a caber empurraria o `+N` para fora — e a informação "tem mais" é a
     * que menos pode faltar.
     */
    const reserva = i < traits.length - 1 ? larguraDe('+99') : 0;

    if (usado + larguraDe(trait) + reserva > disponivel) break;
    shown.push(trait);
    usado += larguraDe(trait);
  }

  return { shown, hidden: traits.length - shown.length };
}

/**
 * O espaço que sobra para os traços numa linha, depois do nome e da raridade.
 *
 * A ORDEM em que as duas coisas cedem é a regra aqui, e ela é deliberada: o traço cede
 * primeiro, até sobrar só o `+N`, e só depois o nome começa a ser cortado.
 *
 * Antes o nome era limitado a 60% da trilha, o que garantia 40% aos traços sempre. Numa
 * janela estreita os dois encolhiam juntos, e a lista ficava com nome cortado E traço
 * cortado ao mesmo tempo — duas informações pela metade em vez de uma inteira.
 *
 * O piso de `+N` é o único espaço que o nome não pode tomar: "esta entrada tem traços"
 * cabe em 40px e não tem substituto. O resto é do nome enquanto ele precisar.
 */
export function traitSpace(larguraDaTrilha: number, name: string, temRaridade: boolean): number {
  const raridade = temRaridade ? 24 : 0;
  const cabeNaTrilha = larguraDaTrilha - raridade - 16;
  const sobraDepoisDoNome = cabeNaTrilha - name.length * NAME_CHAR_PX;
  return Math.max(0, Math.min(Math.max(sobraDepoisDoNome, larguraDe('+99')), cabeNaTrilha));
}

export type Rarity = 'common' | 'uncommon' | 'rare' | 'unique';

/**
 * As quatro raridades, da menor para a maior.
 *
 * Domínio FECHADO, e por isso escrito: raridade não é campo aberto como traço ou livro, em
 * que uma versão nova do sistema pode inventar valor. São quatro, o jogo as ordena, e o
 * filtro mostra as quatro mesmo com zero resultados — saber que NÃO há nada único ali é
 * informação, e uma lista que encolhe conforme o filtro obriga a reaprender onde clicar.
 */
export const RARITY_ORDER: readonly Rarity[] = ['common', 'uncommon', 'rare', 'unique'];

/**
 * A letra que representa a raridade, ou `null` para comum.
 *
 * Comum não desenha nada: medido no `pf2e-8.5.0`, 87% dos talentos são comuns, e uma
 * etiqueta em quase toda linha seria ruído, não sinal.
 *
 * A LETRA é o sinal, e não a cor. O PF2e usa laranja/azul/roxo, mas o sistema deste app
 * tem seis cores com trabalho definido — latão é dado de jogo, bordô é estado. Somar dois
 * matizes quebraria a regra. A letra distingue sem gastar o sistema, e ainda funciona para
 * quem não separa cores.
 */
export function rarityLetter(rarity: string): string | null {
  switch (rarity) {
    case 'uncommon':
      return 'I';
    case 'rare':
      return 'R';
    case 'unique':
      // `U` e não `Ú`: nada é único na base de hoje, e o acento só complicaria a leitura
      // de uma letra sozinha dentro de um quadrado de 16px.
      return 'U';
    default:
      return null;
  }
}

/** Verdadeiro para as raridades que a tela desenha. */
export function isMarkedRarity(rarity: string): rarity is Exclude<Rarity, 'common'> {
  return rarityLetter(rarity) !== null;
}

/* ── Largura de uma coluna extra ──────────────────────────────────────────── */

/**
 * Caixinha de coluna: IBM Plex Mono a 11px. Medido na tela, 6,60px por caractere — o mesmo
 * `TRAIT_CHAR_PX`, porque é a mesma fonte no mesmo tamanho.
 */
export const CELL_CHAR_PX = 6.6;

/** Recheio da caixinha: 7px de cada lado. Medido. */
export const CHIP_PAD_PX = 14;

/**
 * Cabeçalho: a mesma mono de 11px, mas com `letter-spacing: 0.08em`, o que dá 7,48px por
 * caractere. Medido: "Valorada", com 8 letras, ocupa 59,8px.
 */
export const HEADER_CHAR_PX = 7.48;

/** Recheio da célula, somando os dois lados. */
export const CELL_PAD_PX = 14;

/**
 * O multiplicador da cerca de Tukey. 3 é o "atípico extremo"; o 1,5 de praxe é agressivo
 * demais para dados em espeto, e o porquê está em `columnWidth`.
 */
export const TUKEY_K = 3;

/** O que uma coluna de símbolo ocupa: três losangos de 7px com 3px de vão. */
export const SYMBOL_PX = 27;

/**
 * A largura de uma coluna MODULAR, a partir do que ela vai DESENHAR.
 *
 * Só as modulares passam por aqui. O nome fica com o que sobrar (`1fr`), o nível tem
 * trilha fixa, e raridade e traços nem trilha têm — moram na célula do nome.
 *
 * ⚠️ Recebe o texto JÁ DESENHADO, e não o dado cru. O livro chega mascarado (`Highhelm`, e
 * não `Pathfinder Lost Omens Highhelm`) e o resto capitalizado — medir o cru daria uma
 * coluna larga demais para o que aparece nela.
 *
 * ── O corte: a CERCA DE TUKEY, com k = 3 ──────────────────────────────────────
 *
 * Q1 e Q3 são os valores que deixam 25% e 75% abaixo de si; a distância entre eles, o IQR,
 * é a largura do miolo dos dados. A cerca é `Q3 + k × IQR`, e é a régua de boxplot desde
 * os anos 70: deixa a coluna crescer um pouco além do miolo e corta só o que dispara.
 *
 * `k = 3` — o "atípico extremo" — e NÃO o 1,5 de praxe. Medido nos 6.284 talentos, sobre os
 * nomes de livro mascarados: Q1 = 13, Q3 = 16, IQR = 3. A distribuição não é um sino, é um
 * espeto: 77% dos livros têm entre 11 e 16 caracteres. Com o miolo tão estreito, a cerca de
 * 1,5 cai em 20,5 e passa a chamar de atípico o que é só um pouco maior — jogaria fora o
 * `Tian Xia Character Guide`, que são 295 linhas. Com k = 3 ela cai em 25, cobre 95,6% e
 * corta 279 linhas.
 *
 * O 25 não é sorte: é onde o custo por cobertura desaba. Até 16 caracteres cada 7px compra
 * 26 pontos de cobertura; de 17 a 23, menos de 4; em 24 e 25, 5,3 e 4,8; de 26 em diante,
 * décimos. O joelho da curva e a cerca de Tukey caem no mesmo lugar.
 *
 * ⚠️ O `min` com o maior valor real NÃO é zelo: a cerca pode ultrapassar o que existe.
 * Medido — na coluna `grupo` das condições, o maior valor tem 9 caracteres e a cerca manda
 * 36, o que daria 266px para um dado que nunca passa de 87. Seria criar o vazio gigante
 * pelo outro lado.
 *
 * O cabeçalho é PISO: uma coluna mais estreita que o próprio título não se identifica.
 *
 * Quartis por contagem de baldes, e não por ordenação: são 6.284 valores por coluna e o
 * comprimento de um nome cabe num byte — ordenar seria O(n log n) para O(n).
 */
export function columnWidth(drawn: readonly string[], headerLength: number): number {
  const piso = headerLength * HEADER_CHAR_PX + CELL_PAD_PX;

  /*
   * ⚠️ O VAZIO NÃO CONTA.
   *
   * Uma célula vazia não desenha nada e não ocupa largura — pô-la na distribuição é medir
   * ausências. E numa coluna esparsa ela domina: 5.659 dos 6.284 talentos não têm
   * frequência, ou seja 90% da população, o que levava Q1 e Q3 a ZERO e a cerca junto. A
   * coluna caía no piso do cabeçalho, 89px, e truncava TODAS as 625 frequências que
   * existem. Ignorando os vazios ela vai a 160px e mostra as 625 inteiras.
   */
  const valores = drawn.filter((texto) => texto !== '');
  if (valores.length === 0) return Math.ceil(piso);

  const MAX = 256;
  const baldes = new Uint32Array(MAX);
  for (const texto of valores) {
    const balde = Math.min(texto.length, MAX - 1);
    baldes[balde] = (baldes[balde] ?? 0) + 1;
  }

  /* O comprimento na posição `p` da lista ordenada, sem ordenar. */
  const quantil = (p: number): number => {
    const alvo = Math.max(1, Math.ceil(valores.length * p));
    let acumulado = 0;
    for (let i = 0; i < MAX; i++) {
      acumulado += baldes[i] ?? 0;
      if (acumulado >= alvo) return i;
    }
    return MAX - 1;
  };

  let maior = 0;
  for (let i = MAX - 1; i >= 0; i--) {
    if ((baldes[i] ?? 0) > 0) {
      maior = i;
      break;
    }
  }

  const q1 = quantil(0.25);
  const q3 = quantil(0.75);
  const cerca = q3 + TUKEY_K * (q3 - q1);
  const comprimento = Math.min(maior, cerca);

  const conteudo = comprimento * CELL_CHAR_PX + CHIP_PAD_PX + CELL_PAD_PX;
  return Math.ceil(Math.max(conteudo, piso));
}

/**
 * A largura que cabe o MAIOR valor real, sem cerca nenhuma.
 *
 * Para colunas em que cortar o fim muda o SIGNIFICADO, e não só encurta a leitura. O caso
 * é o dano: `1 Acid +4d6` cortado em `1 Acid +…` deixa os quatro graus do Acid Flask
 * idênticos na lista, que é o defeito que a fórmula veio consertar.
 *
 * A cerca de Tukey existe para colunas de PROSA — nome de livro, uso —, onde o valor
 * atípico é longo e raro e cortá-lo custa pouco. Aqui a distribuição não tem atípicos: tem
 * duas populações (952 armas com `1d8 S`, 138 com dano composto), e a segunda não é ruído.
 *
 * Sem risco de coluna gigante, e isso é MEDIDO, não esperado: no `pf2e-8.5.0` o maior dano
 * desenhado tem **16 caracteres** (`1d6 P +1d6 Bleed`), contra os 11 que a cerca permitia.
 */
export function exactColumnWidth(drawn: readonly string[], headerLength: number): number {
  const piso = headerLength * HEADER_CHAR_PX + CELL_PAD_PX;
  let maior = 0;
  for (const texto of drawn) maior = Math.max(maior, texto.length);
  const conteudo = maior * CELL_CHAR_PX + CHIP_PAD_PX + CELL_PAD_PX;
  return Math.ceil(Math.max(conteudo, piso));
}
