import { createContext } from 'react';

import { DEFAULT_PREFERENCES, type Preferences } from '@core/prefs/index';

export interface PreferencesValue {
  readonly prefs: Preferences;
  /** Aplica uma transformação e agenda a gravação. */
  readonly update: (change: (atual: Preferences) => Preferences) => void;
  /** Falso até a leitura terminar. Quem desenha layout deve esperar. */
  readonly ready: boolean;
}

/**
 * Em arquivo próprio, sem componente nenhum.
 *
 * Um módulo que exporta contexto E componente quebra o recarregamento a quente do Vite,
 * que só sabe atualizar em vivo um arquivo cujos exports são todos componentes. Mesma
 * razão de `filterLabels.ts` ter deixado de ser `.tsx`.
 */
export const PreferencesContext = createContext<PreferencesValue>({
  prefs: DEFAULT_PREFERENCES,
  update: () => undefined,
  ready: false,
});
