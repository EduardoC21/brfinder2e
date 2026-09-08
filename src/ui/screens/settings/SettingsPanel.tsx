import { useRef } from 'react';

import type { StoreMeta } from '@core/store/index';
import type { SyncPhase } from '@core/sync/run-sync';
import { strings } from '@i18n/index';
import { cx } from '@ui/cx';
import { useDismissable } from '@ui/hooks/useDismissable';
import type { UnreadPack } from '@core/sync/unread-packs';
import type { SyncState, SyncedType, UpdateState } from '@ui/hooks/useSync';

import styles from './SettingsPanel.module.css';

interface SettingsPanelProps {
  readonly anchor: React.RefObject<HTMLButtonElement | null>;
  readonly onClose: () => void;
  readonly sync: SyncState;
  readonly onSync: () => void;
  readonly onCheckUpdate: () => void;
  readonly onApplyUpdate: (tag: string) => void;
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

export function SettingsPanel({
  anchor,
  onClose,
  sync,
  onSync,
  onCheckUpdate,
  onApplyUpdate,
}: SettingsPanelProps) {
  const panel = useRef<HTMLDivElement>(null);
  useDismissable(true, panel, anchor, onClose);

  const { run, stored, update } = sync;
  const busy = run.status === 'running' || run.status === 'loading';

  return (
    <div
      ref={panel}
      className={cx(styles['panel'], 'chamfer-lg')}
      role="dialog"
      aria-label={t.title}
    >
      <h2 className={styles['title']}>{t.title}</h2>

      <section className={styles['section']}>
        <h3 className={styles['sectionTitle']}>{t.database.title}</h3>
        <p className={styles['hint']}>{t.database.description}</p>

        <button
          type="button"
          className={cx(styles['action'], 'chamfer-sm')}
          onClick={onSync}
          disabled={busy}
        >
          {stored === null ? t.database.sync : t.database.syncAgain}
        </button>

        {stored !== null && (
          <button
            type="button"
            className={cx(styles['secondary'], 'chamfer-sm')}
            onClick={onCheckUpdate}
            disabled={busy || update.status === 'checking'}
          >
            {update.status === 'checking' ? t.database.checking : t.database.checkUpdate}
          </button>
        )}

        {run.status === 'running' && <Running phase={run.phase} />}
        {run.status === 'done' && <Report types={run.types} />}
        {run.status === 'done' && run.unreadPacks.length > 0 && (
          <UnreadPacks packs={run.unreadPacks} />
        )}
        {run.status === 'refused' && (
          <Refused
            rejected={run.rejected}
            failures={run.failures}
            keeping={run.keeping}
            {...(run.reason === undefined ? {} : { reason: run.reason })}
          />
        )}
        {run.status === 'error' && <Failure message={run.message} />}

        {run.status !== 'running' && <Update state={update} busy={busy} onApply={onApplyUpdate} />}

        {stored === null ? (
          run.status === 'idle' && <p className={styles['hint']}>{t.database.report.none}</p>
        ) : (
          <StoredMeta meta={stored} />
        )}
      </section>
    </div>
  );
}

function Running({ phase }: { readonly phase: SyncPhase }) {
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

/**
 * O relatório da sincronização.
 *
 * As colunas de diferença só aparecem quando alguma linha tem valor: numa sincronização
 * repetida, "novas", "mudaram" e "sumiram" seriam três colunas de zero, que não informam
 * nada. `entradas` fica sempre, porque é o total.
 */
function Report({ types }: { readonly types: readonly SyncedType[] }) {
  const r = t.database.report;
  const showAdded = types.some((entry) => entry.diff.added > 0);
  const showUpdated = types.some((entry) => entry.diff.updated > 0);
  const showRemoved = types.some((entry) => entry.diff.removed > 0);
  const showFailed = types.some((entry) => entry.failed > 0);
  const showRetired = types.some((entry) => entry.retired > 0);

  return (
    <table className={styles['table']}>
      <thead>
        <tr>
          <th>{r.type}</th>
          <th>{r.imported}</th>
          {showAdded && <th>{r.added}</th>}
          {showUpdated && <th>{r.updated}</th>}
          {showRemoved && <th>{r.removed}</th>}
          {showRetired && <th>{t.database.retired}</th>}
          {showFailed && <th>{r.failed}</th>}
        </tr>
      </thead>
      <tbody>
        {types.map((entry) => (
          <tr key={entry.type}>
            <td className={styles['typeName']}>{entry.type}</td>
            <Cell value={entry.imported} />
            {showAdded && <Cell value={entry.diff.added} />}
            {showUpdated && <Cell value={entry.diff.updated} />}
            {showRemoved && <Cell value={entry.diff.removed} />}
            {showRetired && <Cell value={entry.retired} />}
            {showFailed && <Cell value={entry.failed} alarming />}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Contagem é dado de jogo: latão e mono, para a coluna alinhar. Zero recua para bruma. */
function Cell({ value, alarming }: { readonly value: number; readonly alarming?: boolean }) {
  return (
    <td
      className={cx(
        styles['count'],
        value === 0 && styles['countZero'],
        value > 0 && alarming === true && styles['failed'],
      )}
    >
      {value}
    </td>
  );
}

function StoredMeta({ meta }: { readonly meta: StoreMeta }) {
  const date = new Date(meta.syncedAt);
  const when = Number.isNaN(date.getTime())
    ? meta.syncedAt
    : date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

  return (
    <p className={styles['meta']}>
      {meta.systemId} {meta.systemVersion} · {meta.total.toLocaleString('pt-BR')}{' '}
      {t.database.report.imported}
      <br />
      {t.database.report.syncedAt} {when}
    </p>
  );
}

/**
 * O resultado da procura por versão nova.
 *
 * Subir é ato deliberado: o app mostra que existe e oferece o botão, mas nunca troca
 * sozinho (briefing seção 8 — a base do mestre e a dos jogadores precisam bater).
 */
function Update({
  state,
  busy,
  onApply,
}: {
  readonly state: UpdateState;
  readonly busy: boolean;
  readonly onApply: (tag: string) => void;
}) {
  if (state.status === 'upToDate') return <p className={styles['phase']}>{t.database.upToDate}</p>;
  if (state.status !== 'available') return null;

  return (
    <>
      <p className={styles['phase']}>
        {t.database.updateFound} <span className={styles['tag']}>{state.tag}</span>
      </p>
      {state.compatible ? (
        <button
          type="button"
          className={cx(styles['action'], 'chamfer-sm')}
          onClick={() => {
            onApply(state.tag);
          }}
          disabled={busy}
        >
          {t.database.updateTo} {state.tag}
        </button>
      ) : (
        <p className={styles['warning']}>{t.database.incompatible}</p>
      )}
    </>
  );
}

/**
 * Tentou subir e não subiu: a base anterior continua valendo.
 *
 * A frase começa pela versão em que a mesa FICOU, e não pela que foi recusada: é a
 * informação que alguém precisa para conferir se todo mundo está igual.
 */
function Refused({
  rejected,
  failures,
  keeping,
  reason,
}: {
  readonly rejected: string;
  readonly failures: number;
  readonly keeping: string;
  /** O erro cru da tentativa. Só existe quando ela EXPLODIU, e aí vale mais que a frase. */
  readonly reason?: string;
}) {
  return (
    <>
      <p className={styles['phase']}>{t.database.stayedOn(keeping)}</p>
      <p className={styles['warning']}>
        {rejected === ''
          ? t.database.upgradeUnavailable
          : t.database.upgradeFailed(rejected, failures)}
      </p>
      {/*
        O motivo cru, em monoespaçada e sem tradução.

        Ele é para INVESTIGAR, não para ler bonito: `Failed to fetch`, `403`, `QuotaExceeded`
        dizem coisas diferentes e mandam para lugares diferentes. Traduzi-lo o achataria de
        volta na frase genérica que ele veio consertar.
      */}
      {reason !== undefined && reason !== '' && <p className={styles['motivo']}>{reason}</p>}
    </>
  );
}

/**
 * Packs do release que trazem conteúdo do nosso interesse e que nenhuma receita lê.
 *
 * Não aparece quase nunca — e é justamente por isso que, quando aparece, merece atenção.
 * O app NÃO importa sozinho: nada dentro do documento separa habilidade de monstro de
 * ação de personagem, então quem decide é você. O aviso existe para a decisão ser feita, e
 * não para o conteúdo sumir em silêncio.
 */
function UnreadPacks({ packs }: { readonly packs: readonly UnreadPack[] }) {
  return (
    <>
      <p className={styles['phase']}>{t.database.unreadPacks.title}</p>
      <ul className={styles['unread']}>
        {packs.map((pack) => (
          <li key={pack.pack}>
            <code>{pack.pack}</code>{' '}
            {Object.entries(pack.counts)
              .map(([type, n]) => `${String(n)} ${type}`)
              .join(', ')}
          </li>
        ))}
      </ul>
      <p className={styles['hint']}>{t.database.unreadPacks.hint}</p>
    </>
  );
}

function Failure({ message }: { readonly message: string }) {
  return (
    <>
      <p className={styles['phase']}>{t.database.error.title}</p>
      <p className={styles['error']}>{message}</p>
    </>
  );
}
