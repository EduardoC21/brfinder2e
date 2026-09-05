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
