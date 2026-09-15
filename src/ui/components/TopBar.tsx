import { useCallback, useRef, useState } from 'react';

import { strings } from '@i18n/index';
import { IconButton } from '@ui/components/IconButton';
import type { UseSync } from '@ui/hooks/useSync';
import { SettingsPanel } from '@ui/screens/settings/SettingsPanel';

import { cx } from '@ui/cx';

import styles from './TopBar.module.css';

/**
 * As abas do mockup. `sheets` só existe a partir da fase da ficha — e a V1 é só consulta
 * (varredura da Etapa 58, pelo autor): a aba fica fora da tela até haver o que abrir.
 */
type Tab = 'lookup' | 'sheets';
const ABAS: readonly Tab[] = ['lookup'];

export function TopBar({ sync }: { readonly sync: UseSync }) {
  const [tab, setTab] = useState<Tab>('lookup');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const gear = useRef<HTMLButtonElement>(null);

  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
  }, []);

  /*
   * O indicador lê o que está GRAVADO, não o resultado da última execução. Assim ele
   * continua certo depois de recarregar a janela, quando não houve execução nenhuma.
   */
  const stored = sync.state.stored;
  const status =
    stored === null
      ? strings.base.empty
      : `${strings.base.label} ${stored.total.toLocaleString('pt-BR')} · v${stored.systemVersion}`;

  return (
    <header className={styles['bar']}>
      <div className={styles['brand']}>
        <span className={cx(styles['mark'], 'chamfer-sm')} aria-hidden="true">
          {strings.app.shortName}
        </span>
        <span className={styles['wordmark']}>{strings.app.name}</span>
      </div>

      <nav className={cx(styles['tabs'], 'chamfer-md')} aria-label={strings.app.name}>
        {ABAS.map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            className={cx(styles['tab'], 'chamfer-sm')}
            onClick={() => {
              setTab(value);
            }}
          >
            {strings.tabs[value]}
          </button>
        ))}
      </nav>

      <div className={styles['right']}>
        <span className={styles['status']}>
          {status}
          {/* Base de antes das receitas de hoje: o aviso fica onde o número fica. */}
          {sync.stale && <span className={styles['stale']}> {strings.base.stale}</span>}
        </span>

        <IconButton
          ref={gear}
          label={strings.settings.open}
          expanded={settingsOpen}
          onClick={() => {
            setSettingsOpen((open) => !open);
          }}
        >
          <GearIcon />
        </IconButton>

        {settingsOpen && (
          <SettingsPanel
            anchor={gear}
            onClose={closeSettings}
            sync={sync.state}
            onSync={sync.start}
            onCheckUpdate={sync.checkUpdate}
            onApplyUpdate={sync.applyUpdate}
            retired={sync.retired}
            stale={sync.stale}
            onPurgeRetired={sync.purgeRetired}
            onClearData={sync.clearData}
          />
        )}
      </div>
    </header>
  );
}

/**
 * Ícone em SVG inline, não fonte de ícones nem arquivo separado.
 *
 * São dois ou três ícones no app inteiro; uma biblioteca traria centenas e um passo de
 * build para usar três. Inline também herda `currentColor`, então o ícone acompanha o
 * estado do botão sem nenhuma regra extra de CSS.
 */
function GearIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="2.4" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M8 1.4v1.7M8 12.9v1.7M14.6 8h-1.7M3.1 8H1.4M12.7 3.3l-1.2 1.2M4.5 11.5l-1.2 1.2M12.7 12.7l-1.2-1.2M4.5 4.5 3.3 3.3"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}
