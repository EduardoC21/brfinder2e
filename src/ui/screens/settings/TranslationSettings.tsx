import {
  TRANSLATION_LANGUAGES,
  TRANSLATION_METHODS,
  type TranslationMethodId,
} from '@core/translation/index';
import { withTranslation } from '@core/prefs/index';
import { strings } from '@i18n/index';
import { cx } from '@ui/cx';
import { useCommunityPack } from '@ui/hooks/useCommunityPack';
import { usePreferences } from '@ui/prefs/usePreferences';

import styles from './SettingsPanel.module.css';

const t = strings.settings.translation;

/**
 * O setor TRADUÇÃO das configurações (Etapa 30, pelo autor): as preferências globais —
 * o que aparece quando há tradução, a língua, e as FORMAS de traduzir na ordem em que
 * uma sobrescreve a outra.
 *
 * As formas são uma lista que se REORDENA e se LIGA/DESLIGA: `prefs.translation.methods`
 * guarda só as ligadas, na ordem. As desligadas ficam no fim, apagadas, com o botão de
 * ligar. Ao lado de cada uma, o que ela precisa para funcionar — hoje texto fixo; quando
 * os provedores existirem, é `availability()` de cada um que responde aqui.
 */
/** A linha de estado do pacote da comunidade: o que há gravado, ou o que houve. */
function estadoDoPacote(state: ReturnType<typeof useCommunityPack>['state']): string {
  switch (state.status) {
    case 'loading':
      return t.community.loading;
    case 'absent':
      return t.community.absent;
    case 'downloading':
      return t.community.downloading;
    case 'error':
      return t.community.error(state.message);
    case 'ready':
      return t.community.ready(state.meta.tag, state.meta.traits, state.meta.names);
  }
}

export function TranslationSettings() {
  const { prefs, update } = usePreferences();
  const { display, language, methods } = prefs.translation;
  const pacote = useCommunityPack(language);

  const ligadas = methods;
  const desligadas = TRANSLATION_METHODS.map((m) => m.id).filter((id) => !ligadas.includes(id));

  const mover = (id: TranslationMethodId, delta: -1 | 1): void => {
    const i = ligadas.indexOf(id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= ligadas.length) return;
    const nova = [...ligadas];
    const outra = nova[j];
    if (outra === undefined) return;
    nova[j] = id;
    nova[i] = outra;
    update((atual) => withTranslation(atual, { methods: nova }));
  };
  const ligar = (id: TranslationMethodId, ligada: boolean): void => {
    update((atual) =>
      withTranslation(atual, {
        methods: ligada
          ? [...atual.translation.methods.filter((m) => m !== id), id]
          : atual.translation.methods.filter((m) => m !== id),
      }),
    );
  };

  const linha = (id: TranslationMethodId, ligada: boolean, indice: number) => {
    const forma = TRANSLATION_METHODS.find((m) => m.id === id);
    return (
      <li key={id} className={cx(styles['forma'], !ligada && styles['formaDesligada'])}>
        <div className={styles['formaOrdem']}>
          {ligada ? (
            <>
              <button
                type="button"
                className={styles['formaSeta']}
                aria-label={t.moveUp}
                disabled={indice === 0}
                onClick={() => {
                  mover(id, -1);
                }}
              >
                ▲
              </button>
              <button
                type="button"
                className={styles['formaSeta']}
                aria-label={t.moveDown}
                disabled={indice === ligadas.length - 1}
                onClick={() => {
                  mover(id, 1);
                }}
              >
                ▼
              </button>
            </>
          ) : null}
        </div>
        <div className={styles['formaTexto']}>
          <span className={styles['formaNome']}>
            {ligada && <span className={styles['formaNumero']}>{indice + 1}</span>}
            {t.methods[id]?.name ?? id}
            {forma?.scope === 'terms' && (
              <span className={styles['formaEscopo']}>{t.termsOnly}</span>
            )}
            {forma?.online === true && <span className={styles['formaEscopo']}>{t.online}</span>}
          </span>
          <span className={styles['formaEstado']}>
            {id === 'community' ? estadoDoPacote(pacote.state) : (t.methods[id]?.status ?? '')}
          </span>
          {id === 'community' && (
            <button
              type="button"
              className={cx(styles['secondary'], styles['formaBotao'], 'chamfer-sm')}
              disabled={pacote.state.status === 'downloading' || pacote.state.status === 'loading'}
              onClick={pacote.download}
            >
              {pacote.state.status === 'ready' ? t.community.downloadAgain : t.community.download}
            </button>
          )}
        </div>
        <label className={styles['formaLiga']}>
          <input
            type="checkbox"
            checked={ligada}
            onChange={(event) => {
              ligar(id, event.target.checked);
            }}
          />
          {ligada ? t.on : t.off}
        </label>
      </li>
    );
  };

  return (
    <>
      <section className={styles['section']}>
        <h3 className={styles['sectionTitle']}>{t.display.title}</h3>
        <p className={styles['hint']}>{t.display.description}</p>
        <div className={styles['opcoes']} role="radiogroup" aria-label={t.display.title}>
          {(['original', 'translated'] as const).map((valor) => (
            <button
              key={valor}
              type="button"
              role="radio"
              aria-checked={display === valor}
              className={cx(styles['opcao'], display === valor && styles['opcaoOn'], 'chamfer-sm')}
              onClick={() => {
                update((atual) => withTranslation(atual, { display: valor }));
              }}
            >
              {t.display[valor]}
            </button>
          ))}
        </div>
      </section>

      <section className={styles['section']}>
        <h3 className={styles['sectionTitle']}>{t.language.title}</h3>
        <p className={styles['hint']}>{t.language.description}</p>
        <select
          className={cx(styles['seletor'], 'chamfer-sm')}
          value={language}
          aria-label={t.language.title}
          onChange={(event) => {
            update((atual) => withTranslation(atual, { language: event.target.value }));
          }}
        >
          {TRANSLATION_LANGUAGES.map((codigo) => (
            <option key={codigo} value={codigo}>
              {t.language.names[codigo] ?? codigo}
            </option>
          ))}
        </select>
      </section>

      <section className={styles['section']}>
        <h3 className={styles['sectionTitle']}>{t.methodsTitle}</h3>
        <p className={styles['hint']}>{t.methodsDescription}</p>
        <ol className={styles['formas']}>
          {ligadas.map((id, indice) => linha(id, true, indice))}
          {desligadas.map((id) => linha(id, false, -1))}
        </ol>
        <p className={styles['hint']}>{t.storage}</p>
      </section>
    </>
  );
}
