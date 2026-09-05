import { useLayoutEffect, useState, type RefObject } from 'react';

/**
 * A largura de UM elemento, em pixels, acompanhando mudanças de tamanho.
 *
 * Existe para a lista saber quanto espaço tem para os traços, e o ponto é o singular:
 * **uma** observação serve a lista inteira. Observar cada linha daria 766 `ResizeObserver`
 * hoje e 6.284 quando chegarem os talentos — cada um com callback e agendamento próprios.
 *
 * O elemento observado é a célula de título do nome, que ocupa exatamente a trilha do
 * nome na grade. Assim a medida é a real, e não uma conta a partir da largura da janela:
 * ela já responde a abrir a lateral, arrastar a borda dela e redimensionar a janela, sem
 * saber que essas coisas existem.
 *
 * ⚠️ A PRIMEIRA medida é feita à mão, e não esperada do observador.
 *
 * O `ResizeObserver` avisa de MUDANÇAS, e há ambientes em que ele simplesmente não roda —
 * o painel de automação do navegador é um deles: um observador avulso num elemento de
 * 570px não disparou uma única vez. Confiando só nele, a largura ficava em zero para
 * sempre, e a lista mostrava um traço por linha achando que não cabia mais nada.
 *
 * Medindo em `useLayoutEffect`, o valor certo existe antes do primeiro desenho — o
 * observador vira o que ele é de fato: uma atualização, não a fonte.
 */
export function useTrackWidth(ref: RefObject<HTMLElement | null>): number {
  const [largura, setLargura] = useState(0);

  useLayoutEffect(() => {
    const alvo = ref.current;
    if (alvo === null) return;

    /* Bail-out: sem isto, cada quadro de um arrasto vira um render mesmo quando a
       largura arredonda para o mesmo pixel. */
    const anotar = (nova: number): void => {
      setLargura((atual) => (Math.abs(atual - nova) < 1 ? atual : nova));
    };

    anotar(alvo.getBoundingClientRect().width);

    const observer = new ResizeObserver((entradas) => {
      const entrada = entradas[0];
      if (entrada !== undefined) anotar(entrada.contentRect.width);
    });
    observer.observe(alvo);

    return () => {
      observer.disconnect();
    };
  }, [ref]);

  return largura;
}
