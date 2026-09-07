import { useLayoutEffect, useState } from 'react';

/** A fatia de linhas que vale a pena existir no DOM, e o vazio que sobra em cima e embaixo. */
export interface Janela {
  readonly start: number;
  readonly end: number;
  /** Altura, em px, das linhas que ficaram acima da fatia. */
  readonly before: number;
  /** Altura, em px, das que ficaram abaixo. */
  readonly after: number;
}

/**
 * Quantas linhas desenhar fora da tela, de cada lado.
 *
 * Zero faria a linha aparecer no mesmo quadro em que entra na tela, e a rolagem rápida
 * mostraria faixas em branco. Doze cobre uma rolada de roda inteira, e custa 24 linhas de
 * DOM em vez de 6.284.
 */
const FOLGA = 12;

/**
 * Quem rola: o próprio elemento, ou o ancestral mais próximo que role.
 *
 * ⚠️ Começava no PAI, e isso valia enquanto o único uso era a lista de consulta — lá a
 * grade não rola, quem rola é a caixa em volta. A paleta da busca global inverte: a caixa
 * que rola É o elemento medido. Sem achá-lo, o cálculo caía no ramo "nada rola" e devolvia
 * a lista inteira como janela — 9.087 linhas no DOM e 1,3 s de tela travada ao abrir.
 */
function roladorDe(no: HTMLElement | null): HTMLElement | null {
  let atual = no;
  while (atual !== null) {
    const overflow = getComputedStyle(atual).overflowY;
    if (overflow === 'auto' || overflow === 'scroll') return atual;
    atual = atual.parentElement;
  }
  return null;
}

/**
 * Desenha só as linhas visíveis, e mede o resto com dois espaçadores.
 *
 * O problema: 6.284 talentos davam 42.905 nós no DOM e 266ms para refiltrar. A lista
 * inteira existia mesmo com 22 linhas na tela.
 *
 * ⚠️ NÃO é uma biblioteca de virtualização, e o motivo é a arquitetura da lista: as linhas
 * são `display: contents` para que as células caiam todas na MESMA grade do cabeçalho — é
 * o que mantém as colunas alinhadas. Uma linha assim não tem caixa, e todo virtualizador
 * de prateleira posiciona caixas. `content-visibility` esbarra no mesmo.
 *
 * O que funciona é isto: desenhar a fatia visível e pôr, antes e depois, um elemento que
 * atravessa todas as colunas (`grid-column: 1 / -1`) com a altura do que ficou de fora. A
 * barra de rolagem continua do tamanho certo e a grade continua inteira.
 *
 * Exige altura de linha FIXA, e a lista tem: `--row-height`, constante em toda a base.
 *
 * Acha o rolador sozinho, subindo do próprio elemento da grade. Recebê-lo por prop faria a
 * tela inteira saber quem rola só para contar isso à lista.
 */
/**
 * Quantas linhas a janela tem ANTES de alguém medir a tela.
 *
 * ⚠️ Não é `total`, e a diferença custava **1,1 segundo** de tela travada ao entrar em
 * talentos. O estado inicial valia a lista inteira, e a lista só é montada QUANDO a base
 * chega — ou seja, o primeiro render desenhava as 6.284 linhas, e só então o efeito de
 * layout cortava para 47. Medido: 6.287 nós removidos num lote só.
 *
 * O efeito roda antes da PINTURA (`useLayoutEffect`), então esta janela provisória nunca
 * chega aos olhos de ninguém: ela só precisa ser pequena. 60 cobre a tela mais folga em
 * qualquer altura de janela razoável, e se a tela for maior o efeito corrige no mesmo
 * quadro.
 */
const JANELA_INICIAL = 60;

export function useWindowedRows(
  grade: React.RefObject<HTMLElement | null>,
  total: number,
  rowHeight: number,
): Janela {
  const [janela, setJanela] = useState<Janela>(() => {
    const fim = Math.min(total, JANELA_INICIAL);
    return { start: 0, end: fim, before: 0, after: Math.max(0, total - fim) * rowHeight };
  });

  /*
   * UM efeito, e a função de recálculo definida DENTRO dele.
   *
   * Tentei primeiro com `useCallback` mais dois efeitos, e o compilador do React recusou:
   * ele não consegue preservar memoização manual de uma função que lê `ref.current`. Aqui
   * não há o que preservar — o efeito roda quando o que ele lê muda, e o navegador é quem
   * guarda o ouvinte.
   *
   * `useLayoutEffect` e não `useEffect`: o cálculo acontece ANTES da pintura. Num efeito
   * comum, a lista apareceria por um quadro com a janela do render anterior — o que numa
   * troca de fonte significa mostrar as linhas erradas antes de mostrar as certas.
   */
  useLayoutEffect(() => {
    const gradeEl = grade.current;
    const alvo = roladorDe(gradeEl);

    /*
     * Onde a grade começa DENTRO do rolador.
     *
     * `offsetTop` não serve: ele mede contra o `offsetParent`, que aqui não é o rolador —
     * medido, dava 143px contra um pai posicionado que não é quem rola. A diferença entre
     * os dois retângulos mais o `scrollTop` dá a distância certa, e é invariante à rolagem.
     *
     * Calculado UMA vez: a grade não muda de lugar dentro do rolador enquanto se rola, e
     * ler retângulo a cada evento de rolagem força o navegador a refazer layout.
     *
     * Não desconta a altura do cabeçalho (26px, menos de uma linha): o erro cabe inteiro na
     * folga de 12 linhas e nunca chega a aparecer.
     */
    const topoDaGrade =
      gradeEl === null || alvo === null
        ? 0
        : gradeEl.getBoundingClientRect().top - alvo.getBoundingClientRect().top + alvo.scrollTop;

    const recalcular = (): void => {
      // Nada rola: não há o que janelar, e a lista inteira é a janela.
      if (alvo === null || rowHeight <= 0) {
        setJanela((atual) =>
          atual.start === 0 && atual.end === total
            ? atual
            : { start: 0, end: total, before: 0, after: 0 },
        );
        return;
      }

      const rolagem = Math.max(0, alvo.scrollTop - topoDaGrade);
      const primeira = Math.max(0, Math.floor(rolagem / rowHeight) - FOLGA);
      const cabem = Math.ceil(alvo.clientHeight / rowHeight) + FOLGA * 2;
      const ultima = Math.min(total, primeira + cabem);

      setJanela((atual) =>
        atual.start === primeira && atual.end === ultima
          ? atual
          : {
              start: primeira,
              end: ultima,
              before: primeira * rowHeight,
              after: (total - ultima) * rowHeight,
            },
      );
    };

    recalcular();
    if (alvo === null) return;

    /*
     * `passive: true` promete ao navegador que este ouvinte não cancela a rolagem, e ele
     * então não precisa esperar a função terminar para rolar a tela.
     */
    alvo.addEventListener('scroll', recalcular, { passive: true });
    const observador = new ResizeObserver(recalcular);
    observador.observe(alvo);
    return () => {
      alvo.removeEventListener('scroll', recalcular);
      observador.disconnect();
    };
  }, [grade, total, rowHeight]);

  return janela;
}
