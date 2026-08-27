import { useRef } from 'react';

import type { SyncPhase, SyncResult } from '@core/sync/run-sync';
import { strings } from '@i18n/index';
import { useDismissable } from '@ui/hooks/useDismissable';
import type { SyncState } from '@ui/hooks/useSync';

import { cx } from '@ui/cx';

import styles from './SettingsPanel.module.css';

interface SettingsPanelProps {
  readonly anchor: React.RefObject<HTMLButtonElement | null>;
  readonly onClose: () => void;
  readonly sync: SyncState;
  readonly onSync: () => void;
}

const t = strings.settings;

function phaseLabel(phase: SyncPhase): string {
  switch (phase.kind) {
    case 'resolving':
      return t.database.phase.resolving;
    case 'downloading':
      return t.database.phase.downloading;
    case 'reading':
      return t.database.phase.reading;
    case 'normalizing':
      return t.database.phase.normalizing;
  }
}

function percent(phase: SyncPhase): number | null {
  if (phase.kind !== 'downloading' || phase.total === null || phase.total === 0) return null;
  return Math.min(100, Math.round((phase.loaded / phase.total) * 100));
}

export function SettingsPanel({ anchor, onClose, sync, onSync }: SettingsPanelProps) {
  const panel = useRef<HTMLDivElement>(null);
  useDismissable(true, panel, anchor, onClose);

  const running = sync.status === 'running';

  return (
    <div
      ref={panel}
      className={cx(styles['panel'], 'chamfer-lg')}
      role="dialog"
      aria-label={t.title}
      aria-modal="false"
    >
      <h2 className={styles['title']}>{t.title}</h2>

      <section className={styles['section']}>
        <h3 className={styles['sectionTitle']}>{t.database.title}</h3>
        <p className={styles['hint']}>{t.database.description}</p>

        <button
          type="button"
          className={cx(styles['action'], 'chamfer-sm')}
          onClick={onSync}
          disabled={running}
        >
          {sync.status === 'done' ? t.database.syncAgain : t.database.sync}
        </button>

        {running && <RunningState phase={sync.phase} />}
        {sync.status === 'done' && <Report result={sync.result} />}
        {sync.status === 'error' && <ErrorState message={sync.message} />}

        <p className={styles['warning']}>{t.database.notPersisted}</p>
      </section>
    </div>
  );
}

function RunningState({ phase }: { readonly phase: SyncPhase }) {
  const done = percent(phase);
  return (
    <>
      <p className={styles['phase']} aria-live="polite">
        {phaseLabel(phase)}
        {done === null ? '' : ` — ${String(done)}%`}
      </p>
      <div
        className={styles['track']}
        role="progressbar"
        {...(done === null
          ? {}
          : { 'aria-valuenow': done, 'aria-valuemin': 0, 'aria-valuemax': 100 })}
      >
        <div className={styles['fill']} style={{ width: `${String(done ?? 0)}%` }} />
      </div>
    </>
  );
}

function Report({ result }: { readonly result: SyncResult }) {
  return (
    <>
      <table className={styles['table']}>
        <thead>
          <tr>
            <th>{t.database.report.type}</th>
            <th>{t.database.report.imported}</th>
            <th>{t.database.report.failed}</th>
          </tr>
        </thead>
        <tbody>
          {result.types.map((entry) => (
            <tr key={entry.type}>
              <td className={styles['typeName']}>{entry.type}</td>
              <td className={styles['count']}>{entry.imported}</td>
              <td
                className={cx(
                  styles['count'],
                  entry.failed === 0 ? styles['countZero'] : styles['failed'],
                )}
              >
                {entry.failed}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={styles['meta']}>
        {t.database.report.version}: {result.systemId} {result.systemVersion} · {result.releaseTag}
      </p>
    </>
  );
}

function ErrorState({ message }: { readonly message: string }) {
  return (
    <>
      <p className={styles['phase']}>{t.database.error.title}</p>
      <p className={styles['error']}>{message}</p>
    </>
  );
}
