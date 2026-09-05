import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  DEFAULT_PREFERENCES,
  KEY_PREFERENCES,
  readPreferences,
  type Preferences,
} from '@core/prefs/index';
import { createIndexedDbStore } from '@platform/store-indexeddb';

import { PreferencesContext, type PreferencesValue } from './PreferencesContext';

const store = createIndexedDbStore();

/** Quanto tempo o gesto precisa ficar parado antes de gravar. */
const ESPERA_PARA_GRAVAR = 400;

/**
 * Carrega as preferências uma vez e mantém quem as usa em dia.
 *
 * Contexto, e não um `usePreference` por componente: quem lê preferência aqui são a
 * coluna de detalhe, o pop-out, o seletor de colunas e a barra de filtros — componentes
 * distantes entre si. Um hook por componente daria N leituras do armazenamento e N
 * escritores disputando o MESMO documento, e a última gravação apagaria as outras.
 *
 * A gravação é ADIADA e o estado é imediato. Arrastar a borda da lateral dispara uma
 * mudança por quadro; gravar cada uma martelaria o IndexedDB com ~60 escritas por segundo
 * do mesmo documento. A tela responde na hora, o disco espera o gesto parar.
 */
export function PreferencesProvider({ children }: { readonly children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [ready, setReady] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendente = useRef<Preferences | null>(null);

  useEffect(() => {
    let vivo = true;
    store
      .get(KEY_PREFERENCES)
      .then((gravado) => {
        if (!vivo) return;
        setPrefs(readPreferences(gravado));
        setReady(true);
      })
      .catch(() => {
        // Sem preferência legível, valem os padrões. Não é erro que mereça tela.
        if (vivo) setReady(true);
      });
    return () => {
      vivo = false;
    };
  }, []);

  /*
   * A gravação pendente é guardada num ref, não no estado: ela não desenha nada, e pô-la
   * no estado provocaria um render extra por tecla digitada num filtro.
   */
  const gravar = useCallback(() => {
    const alvo = pendente.current;
    pendente.current = null;
    timer.current = null;
    if (alvo === null) return;
    void store.put(KEY_PREFERENCES, alvo).catch(() => {
      // Perder uma preferência é chato, não fatal. Nada de interromper o uso por isso.
    });
  }, []);

  const update = useCallback(
    (change: (atual: Preferences) => Preferences) => {
      setPrefs((atual) => {
        const proximo = change(atual);
        pendente.current = proximo;
        if (timer.current !== null) clearTimeout(timer.current);
        timer.current = setTimeout(gravar, ESPERA_PARA_GRAVAR);
        return proximo;
      });
    },
    [gravar],
  );

  /* Fechar a janela no meio do gesto não pode engolir a última mudança. */
  useEffect(() => {
    const aoSair = (): void => {
      if (timer.current !== null) {
        clearTimeout(timer.current);
        gravar();
      }
    };
    window.addEventListener('pagehide', aoSair);
    return () => {
      window.removeEventListener('pagehide', aoSair);
      aoSair();
    };
  }, [gravar]);

  const value = useMemo<PreferencesValue>(() => ({ prefs, update, ready }), [prefs, update, ready]);

  return <PreferencesContext value={value}>{children}</PreferencesContext>;
}
