import { useContext } from 'react';

import { PreferencesContext, type PreferencesValue } from './PreferencesProvider';

/**
 * Acesso às preferências do usuário.
 *
 * Em arquivo separado do Provider porque um módulo que exporta componente E hook quebra o
 * recarregamento a quente do Vite — mesma razão de `filterLabels.ts` ter deixado de ser
 * `.tsx`.
 */
export function usePreferences(): PreferencesValue {
  return useContext(PreferencesContext);
}
