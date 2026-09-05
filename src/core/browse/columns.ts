/**
 * As colunas ESPECIAIS: nível, raridade e traços.
 *
 * Especiais porque não são "mais uma coluna à direita". Elas pertencem ao NOME:
 *
 *   ` 12  Godbreaker  ⌷R⌷  ⌷concentrate⌷ ⌷manipulate⌷ ⌷+2⌷`
 *      ^  ^           ^     ^
 *   calha  nome    raridade  traços
 *
 * O nível vem antes porque é por ele que se procura numa lista de talentos. A raridade
 * cola no nome, como etiqueta. Os traços vêm depois, porque são muitos e variam de
 * largura. E as três ficam FORA do teto de colunas personalizadas: elas não disputam o
 * espaço da direita, ocupam o espaço do meio.
 *
 * Aqui mora só o que é DADO. O desenho é da UI, como sempre.
 */

/**
 * Quantos caracteres de traço cabem antes de virar `+N`.
 *
 * ⚠️ O corte é por CARACTERE, e não por medição de tela. Medir exigiria um contêiner de
 * rolagem e um `ResizeObserver` por linha — vezes 766 linhas hoje e 6.284 quando chegarem
 * os talentos. A conta por caractere é feita no dado, é determinística, e não custa nada.
 *
 * O preço é que o corte não é exato: `manipulate` é mais largo que `fire` no mesmo número
 * de letras. Em fonte mono, que é onde os traços são desenhados, o erro é pequeno.
 */
export const TRAIT_BUDGET = 26;

export interface TraitBudget {
  /** Os traços que cabem, na ordem original. */
  readonly shown: readonly string[];
  /** Quantos ficaram de fora. Zero quando coube tudo. */
  readonly hidden: number;
}

/**
 * Corta a lista de traços no orçamento.
 *
 * Sempre mostra ao menos UM, mesmo que estoure: uma linha com `+3` e nenhum traço não diz
 * nada, e o primeiro traço é quase sempre o mais característico.
 */
export function budgetTraits(traits: readonly string[], budget = TRAIT_BUDGET): TraitBudget {
  if (traits.length === 0) return { shown: [], hidden: 0 };

  const shown: string[] = [];
  let usado = 0;

  for (const trait of traits) {
    const custo = trait.length + (shown.length === 0 ? 0 : 1);
    if (shown.length > 0 && usado + custo > budget) break;
    shown.push(trait);
    usado += custo;
  }

  return { shown, hidden: traits.length - shown.length };
}

export type Rarity = 'common' | 'uncommon' | 'rare' | 'unique';

/**
 * A letra que representa a raridade, ou `null` para comum.
 *
 * Comum não desenha nada: medido no `pf2e-8.5.0`, 87% dos talentos e 46% das magias são
 * comuns, e uma etiqueta em quase toda linha seria ruído, não sinal.
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
      return 'Ú';
    default:
      return null;
  }
}

/** Verdadeiro para as raridades que a tela desenha. */
export function isMarkedRarity(rarity: string): rarity is Exclude<Rarity, 'common'> {
  return rarityLetter(rarity) !== null;
}
