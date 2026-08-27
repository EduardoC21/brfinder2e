import { useCallback, useEffect, useRef, useState } from 'react';

import { cx } from '@ui/cx';

import styles from './ScrollRail.module.css';

interface ScrollRailProps {
  readonly children: React.ReactNode;
  readonly label: string;
  readonly className?: string;
}

/**
 * Trilho que rola na horizontal, com degradê nas bordas e setas quando há o que rolar.
 *
 * Do artboard 2b: "O trilho rola na horizontal com degradê e setas ‹ ›, nunca quebra para
 * baixo." Quebrar para baixo mudaria a altura da barra conforme o número de filtros
 * ativos, e a lista de resultados pularia de posição a cada clique.
 *
 * As setas só aparecem quando são úteis — e cada uma some ao chegar na ponta. Seta inerte
 * é ruído, e pior: ensina o usuário a ignorar setas.
 *
 * Reutilizável: serve para os chips de filtro ativo, e vai servir para a linha de traços
 * na Etapa 10.
 */
export function ScrollRail({ children, label, className }: ScrollRailProps) {
  const track = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState({ left: false, right: false });

  const measure = useCallback(() => {
    const node = track.current;
    if (!node) return;
    const max = node.scrollWidth - node.clientWidth;

    /*
     * A folga é de 8px, e não de 1px, porque `scrollWidth` arredonda para cima: com flex
     * e `gap`, um trilho que cabe inteiro reporta uns 13px a mais. Com folga de 1px isso
     * virava uma seta que aparecia e não rolava nada — pior que não ter seta, porque
     * ensina o usuário a ignorá-las.
     */
    const FOLGA = 8;
    const left = node.scrollLeft > FOLGA;
    const right = node.scrollLeft < max - FOLGA;

    /*
     * A saída antecipada NÃO é otimização: sem ela isto é um laço infinito de renderização.
     *
     * Um literal `{ left, right }` nunca é `Object.is`-igual ao anterior, então o React
     * re-renderiza sempre; o efeito abaixo depende de `children`, que é novo a cada
     * render; o efeito chama `measure`, que chama `setOverflow` de novo. O componente
     * nunca assenta — e o sintoma é a rolagem se perdendo e os cliques não pegando, não
     * uma tela travada, o que torna a causa difícil de enxergar.
     */
    setOverflow((antes) =>
      antes.left === left && antes.right === right ? antes : { left, right },
    );
  }, []);

  useEffect(() => {
    const node = track.current;
    if (!node) return;

    measure();
    node.addEventListener('scroll', measure, { passive: true });

    // O conteúdo muda de largura sem a janela mudar: um chip a mais, um a menos.
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    for (const child of node.children) observer.observe(child);

    return () => {
      node.removeEventListener('scroll', measure);
      observer.disconnect();
    };
  }, [measure, children]);

  const nudge = (direction: -1 | 1): void => {
    const node = track.current;
    if (!node) return;
    // Rola 70% da largura visível: o suficiente para avançar sem perder o contexto do
    // que estava na borda.
    //
    // A suavidade é pedida AQUI, e não em `scroll-behavior` no CSS. No CSS ela vale para
    // toda rolagem do elemento, inclusive as que deveriam ser instantâneas — e transforma
    // qualquer leitura de `scrollLeft` numa corrida com a animação.
    /*
     * A suavidade é condicional. Além de respeitar quem pediu menos movimento no sistema,
     * isso é o que faz a seta funcionar onde animação não roda — num ambiente que não
     * compõe quadros, `behavior: 'smooth'` enfileira uma animação que nunca avança, e o
     * botão parece quebrado.
     */
    const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    node.scrollBy({
      left: direction * node.clientWidth * 0.7,
      behavior: reduzido ? 'auto' : 'smooth',
    });
  };

  return (
    <div className={cx(styles['rail'], className)}>
      {overflow.left && (
        <button
          type="button"
          className={cx(styles['arrow'], styles['left'])}
          aria-label={`${label}: rolar para a esquerda`}
          onClick={() => {
            nudge(-1);
          }}
        >
          ‹
        </button>
      )}

      <div
        ref={track}
        className={cx(
          styles['track'],
          overflow.left && styles['fadeLeft'],
          overflow.right && styles['fadeRight'],
        )}
      >
        {children}
      </div>

      {overflow.right && (
        <button
          type="button"
          className={cx(styles['arrow'], styles['right'])}
          aria-label={`${label}: rolar para a direita`}
          onClick={() => {
            nudge(1);
          }}
        >
          ›
        </button>
      )}
    </div>
  );
}
