import { useEffect, useState } from 'react';

/**
 * Verdadeiro quando a janela está mais estreita que `limite` pixels.
 *
 * `matchMedia` e não um `resize` com conta: o navegador já avalia a condição e só avisa
 * quando ela VIRA — um ouvinte de `resize` dispararia a cada pixel do arrasto para
 * recalcular a mesma resposta.
 *
 * ⚠️ O valor inicial é lido na hora, e não esperado do ouvinte. Mesma lição do
 * `useTrackWidth`: o ouvinte avisa de MUDANÇAS, e uma janela que já nasce estreita nunca
 * dispara uma. Sem a leitura inicial, o trilho abriria aberto numa tela onde não cabe.
 */
export function useNarrowScreen(limite: number): boolean {
  const [estreita, setEstreita] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(`(max-width: ${String(limite)}px)`).matches;
  });

  useEffect(() => {
    const consulta = window.matchMedia(`(max-width: ${String(limite)}px)`);
    const aoMudar = (evento: MediaQueryListEvent): void => {
      setEstreita(evento.matches);
    };
    /*
     * Só assina. O valor inicial já veio do inicializador do `useState`, e reafirmá-lo
     * aqui seria estado mudando por efeito sem nada ter mudado.
     */
    consulta.addEventListener('change', aoMudar);
    return () => {
      consulta.removeEventListener('change', aoMudar);
    };
  }, [limite]);

  return estreita;
}
