import type { BrowseEntity } from '@core/browse/index';

/**
 * Os painéis flutuantes abertos.
 *
 * `useReducer` e não seis `useState`: são seis transições (abrir, fechar, focar, e as
 * três que o próprio painel resolve por dentro) sobre uma LISTA, e estados separados
 * deixariam representável o que não pode existir — um `focado` apontando para um painel
 * já fechado, por exemplo. Com um reducer, cada transição é uma função pura testável, e
 * o estado inválido não tem como ser escrito.
 */

export interface Popout {
  /** Identidade do painel, não da entrada: a mesma entrada pode ter dois painéis. */
  readonly id: number;
  readonly entity: BrowseEntity;
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface PopoutState {
  readonly items: readonly Popout[];
  /** Cresce e nunca reinicia: serve de `id` novo e de `z` novo ao mesmo tempo. */
  readonly next: number;
}

export type PopoutAction =
  | { readonly kind: 'open'; readonly entity: BrowseEntity }
  | { readonly kind: 'close'; readonly id: number }
  | { readonly kind: 'focus'; readonly id: number }
  | { readonly kind: 'clear' };

export const EMPTY_POPOUTS: PopoutState = { items: [], next: 1 };

/** Deslocamento de cada painel novo em relação ao anterior. */
const CASCATA = 28;
const ORIGEM = { x: 120, y: 90 };

/**
 * Empilhamento por `z-index`, e não pela ordem da lista.
 *
 * Trazer o focado para a frente reordenando o array faria o React MOVER o nó no DOM. Com
 * `key` estável o estado do componente sobrevive, mas mover o nó interrompe um arrasto em
 * curso e zera a rolagem interna do painel. Um número crescente não toca no DOM.
 */
export function popoutReducer(state: PopoutState, action: PopoutAction): PopoutState {
  switch (action.kind) {
    case 'open': {
      /*
       * Cascata a partir de quantos já existem, e não do último `id`: fechar o do meio e
       * abrir outro devolve a vaga em vez de continuar empurrando para o canto da tela.
       */
      const passo = state.items.length % 8;
      return {
        items: [
          ...state.items,
          {
            id: state.next,
            entity: action.entity,
            x: ORIGEM.x + passo * CASCATA,
            y: ORIGEM.y + passo * CASCATA,
            z: state.next,
          },
        ],
        next: state.next + 1,
      };
    }

    case 'close':
      return { ...state, items: state.items.filter((item) => item.id !== action.id) };

    case 'focus': {
      const alvo = state.items.find((item) => item.id === action.id);
      // Já está na frente: devolver o MESMO objeto evita um render por clique.
      if (alvo === undefined || alvo.z === state.next - 1) return state;
      return {
        items: state.items.map((item) =>
          item.id === action.id ? { ...item, z: state.next } : item,
        ),
        next: state.next + 1,
      };
    }

    case 'clear':
      return { ...state, items: [] };
  }
}
