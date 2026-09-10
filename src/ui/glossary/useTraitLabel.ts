import { useCallback, useContext } from 'react';

import { traitLabel } from '@core/glossary/index';
import { capitalizar } from '@ui/text';

import { TraitGlossaryContext } from './TraitGlossaryContext';

/**
 * O rótulo de um traço para a tela, com o que sempre foi como reserva.
 *
 * Devolve uma FUNÇÃO e não um valor: quem desenha uma linha desenha três traços, e um
 * hook por chip obrigaria a mover o chip para um componente só para poder chamá-lo.
 *
 * Sem o glossário — antes de sincronizar, ou num traço que a tabela não conhece — cai em
 * `capitalizar(slug)`, que é exatamente o que a tela fazia antes da Etapa 15b. Nada
 * regride: quem não sincronizou vê o que sempre viu.
 *
 * `capitalizar` também no rótulo que VEIO do glossário: 14 dos 536 têm descrição sem
 * rótulo próprio (`hefty`, `integrated`…), e aí o rótulo é o slug cru. `Hefty 2` e não
 * `hefty 2`. Nos outros 522 não faz nada — já começam em maiúscula.
 */
export function useTraitLabel(): (slug: string) => string {
  const glossary = useContext(TraitGlossaryContext);
  // Estável enquanto o glossário for o mesmo: quem a põe num `useMemo` não refaz à toa.
  return useCallback((slug: string) => capitalizar(traitLabel(glossary, slug) ?? slug), [glossary]);
}
