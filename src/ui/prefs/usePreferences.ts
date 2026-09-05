import { useContext } from 'react';

import { PreferencesContext, type PreferencesValue } from './PreferencesContext';

/**
 * Acesso às preferências do usuário.
 *
 * Em arquivo separado do Provider porque um módulo que exporta componente E hook quebra o
 * recarregamento a quente do Vite — mesma razão de `filterLabels.ts` ter deixado de ser
 * `.tsx`. O contexto em si mora em `PreferencesContext.ts`, pelo mesmo motivo.
 */
export function usePreferences(): PreferencesValue {
  return useContext(PreferencesContext);
}
