import { useEffect, useState } from 'react';

/**
 * A largura da janela, em pixels, acompanhada enquanto ela muda.
 *
 * `resize` e não `matchMedia`, ao contrário do `useNarrowScreen`: ali a pergunta é
 * binária ("está mais estreita que 640?") e o navegador só avisa quando a resposta vira.
 * Aqui o valor é contínuo — quem consome precisa do número a cada pixel, não de um limiar.
 *
 * ⚠️ O valor inicial é lido na hora, e não esperado do ouvinte. Mesma lição do
 * `useTrackWidth` e do `useNarrowScreen`: o ouvinte avisa de MUDANÇAS, e uma janela que
 * já nasce pequena nunca dispara uma.
 */
export function useWindowWidth(): number {
  const [largura, setLargura] = useState(() =>
    typeof window === 'undefined' ? 1440 : window.innerWidth,
  );

  useEffect(() => {
    const aoRedimensionar = (): void => {
      setLargura(window.innerWidth);
    };
    window.addEventListener('resize', aoRedimensionar);
    return () => {
      window.removeEventListener('resize', aoRedimensionar);
    };
  }, []);

  return largura;
}
