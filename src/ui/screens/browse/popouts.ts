import type { BrowseEntity, DescriptionContext, DetailFieldSpec } from '@core/browse/index';

/**
 * Os painéis flutuantes abertos.
 *
 * `useReducer` e não seis `useState`: são seis transições (abrir, fechar, focar, e as
 * três que o próprio painel resolve por dentro) sobre uma LISTA, e estados separados
 * deixariam representável o que não pode existir — um `focado` apontando para um painel
 * já fechado, por exemplo. Com um reducer, cada transição é uma função pura testável, e
 * o estado inválido não tem como ser escrito.
 */

/**
 * A entrada MAIS o que é preciso para desenhá-la.
 *
 * O painel carrega o próprio tipo e os próprios campos porque a busca global abre coisa de
 * QUALQUER fonte: um flutuante de magia pode ficar aberto enquanto a tela mostra talentos.
 * Lendo o descritor da fonte em vigor, ele passaria a desenhar campos de talento numa
 * magia no instante em que a pessoa trocasse de fonte.
 */
export interface PopoutSubject {
  readonly entity: BrowseEntity;
  readonly entityType: string;
  readonly fields: readonly DetailFieldSpec[];
  /**
   * De onde a entrada foi aberta, quando isso muda o que ela diz: o Change Shape aberto
   * pelo Anadi tem o texto do Anadi. Ausente na abertura comum. Ver `contextFor`.
   */
  readonly context?: DescriptionContext;
}

/** O assunto de um painel, sem o resto do painel — para empilhar e para trocar. */
function assuntoDe(item: PopoutSubject): PopoutSubject {
  return {
    entity: item.entity,
    entityType: item.entityType,
    fields: item.fields,
    ...(item.context === undefined ? {} : { context: item.context }),
  };
}

export interface Popout extends PopoutSubject {
  /** Identidade do painel, não da entrada: a mesma entrada pode ter dois painéis. */
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /**
   * Por onde este painel JÁ passou, do mais antigo para o mais recente.
   *
   * O painel navega no lugar: clicar numa referência dentro dele troca o que ele mostra,
   * como um navegador. A pilha é o que dá sentido ao botão de voltar — sem ela, cada
   * clique dentro de um painel seria um caminho sem volta.
   *
   * Vazia é o normal: 100% dos painéis nascem assim, e o botão de voltar não aparece.
   */
  readonly back: readonly PopoutSubject[];
}

export interface PopoutState {
  readonly items: readonly Popout[];
  /** Cresce e nunca reinicia: serve de `id` novo e de `z` novo ao mesmo tempo. */
  readonly next: number;
}

export type PopoutAction =
  | ({ readonly kind: 'open' } & PopoutSubject)
  /** Troca o que UM painel mostra, guardando de onde veio. Ver `Popout.back`. */
  | ({ readonly kind: 'navigate'; readonly id: number } & PopoutSubject)
  /** Desfaz o último `navigate` daquele painel. Sem histórico, não faz nada. */
  | { readonly kind: 'back'; readonly id: number }
  | { readonly kind: 'close'; readonly id: number }
  | { readonly kind: 'focus'; readonly id: number }
  | { readonly kind: 'clear' };

export const EMPTY_POPOUTS: PopoutState = { items: [], next: 1 };

/** Uma referência estável para "sem histórico". */
const VAZIO: readonly PopoutSubject[] = [];

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
            ...assuntoDe(action),
            x: ORIGEM.x + passo * CASCATA,
            y: ORIGEM.y + passo * CASCATA,
            z: state.next,
            back: VAZIO,
          },
        ],
        next: state.next + 1,
      };
    }

    /*
     * Navegar TROCA o conteúdo e empilha o anterior. A posição, o tamanho e o `z` ficam:
     * é o mesmo painel, na mesma janela, mostrando outra coisa — mover ou reempilhar aqui
     * faria a janela fugir debaixo do cursor no instante do clique.
     */
    case 'navigate': {
      const { id, ...assunto } = action;
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === id
            ? {
                /*
                 * O assunto novo INTEIRO, e não `...item, ...assunto`: o contexto do
                 * anterior não pode vazar para o próximo. Aberto pelo Anadi e navegado
                 * para outra coisa, o texto do Anadi fica para trás — com o Voltar.
                 */
                id: item.id,
                x: item.x,
                y: item.y,
                z: item.z,
                ...assuntoDe(assunto),
                back: [...item.back, assuntoDe(item)],
              }
            : item,
        ),
      };
    }

    case 'back': {
      const alvo = state.items.find((item) => item.id === action.id);
      // Sem para onde voltar: devolve o MESMO estado, e o React não redesenha nada.
      if (alvo === undefined || alvo.back.length === 0) return state;
      const anterior = alvo.back[alvo.back.length - 1];
      if (anterior === undefined) return state;
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.id
            ? {
                id: item.id,
                x: item.x,
                y: item.y,
                z: item.z,
                ...assuntoDe(anterior),
                back: item.back.slice(0, -1),
              }
            : item,
        ),
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
