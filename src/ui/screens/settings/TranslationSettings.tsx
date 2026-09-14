import { useState } from 'react';

import {
  LLM_MODELS,
  TRANSLATION_LANGUAGES,
  TRANSLATION_METHODS,
  type TranslationMethodId,
} from '@core/translation/index';
import { withTranslation } from '@core/prefs/index';
import { strings } from '@i18n/index';
import { cx } from '@ui/cx';
import { useCommunityPack } from '@ui/hooks/useCommunityPack';
import { useLlmKey, useLocalStatus } from '@ui/hooks/useTranslation';
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

/** A linha de estado do modelo local: guardado, por baixar, ou sem como. */
function estadoDoLocal(state: ReturnType<typeof useLocalStatus>): string {
  if (state === null) return t.local.checking;
  switch (state.kind) {
    case 'ready':
      return t.local.ready;
    case 'needs-setup':
      return t.local.needsSetup;
    case 'unavailable':
      return t.local.unavailable(state.why);
  }
}

export function TranslationSettings() {
  const { prefs, update } = usePreferences();
  const { display, names, language, methods } = prefs.translation;
  const pacote = useCommunityPack(language);
  const local = useLocalStatus(language);
  const chave = useLlmKey();

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
            {id === 'community'
              ? estadoDoPacote(pacote.state)
              : id === 'local'
                ? estadoDoLocal(local)
                : (t.methods[id]?.status ?? '')}
          </span>
          {id === 'llm' && (
            <Llm
              model={prefs.translation.llm.model}
              onModel={(model) => {
                update((atual) => withTranslation(atual, { llm: { model } }));
              }}
              chave={chave}
            />
          )}
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
      <Escolha
        rotulos={t.display}
        valor={display}
        onChange={(valor) => {
          update((atual) => withTranslation(atual, { display: valor }));
        }}
      />

      <Escolha
        rotulos={t.names}
        valor={names}
        onChange={(valor) => {
          update((atual) => withTranslation(atual, { names: valor }));
        }}
      />

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

/** Um par Original / Traduzido, como rádio: a preferência de prosa e a de nomes usam o mesmo. */
function Escolha({
  rotulos,
  valor,
  onChange,
}: {
  readonly rotulos: {
    readonly title: string;
    readonly description: string;
    readonly original: string;
    readonly translated: string;
  };
  readonly valor: 'original' | 'translated';
  readonly onChange: (valor: 'original' | 'translated') => void;
}) {
  return (
    <section className={styles['section']}>
      <h3 className={styles['sectionTitle']}>{rotulos.title}</h3>
      <p className={styles['hint']}>{rotulos.description}</p>
      <div className={styles['opcoes']} role="radiogroup" aria-label={rotulos.title}>
        {(['original', 'translated'] as const).map((opcao) => (
          <button
            key={opcao}
            type="button"
            role="radio"
            aria-checked={valor === opcao}
            className={cx(styles['opcao'], valor === opcao && styles['opcaoOn'], 'chamfer-sm')}
            onClick={() => {
              onChange(opcao);
            }}
          >
            {rotulos[opcao]}
          </button>
        ))}
      </div>
    </section>
  );
}

/**
 * O bloco do modelo de linguagem (Etapa 41): o modelo, a chave (guardada fora das
 * preferências, nunca mostrada de volta — só "chave guardada"), e o Testar, que traduz uma
 * frase de verdade e mostra o resultado ou o erro. A chave digitada some do campo ao
 * guardar: o campo é para colar, não para ler.
 */
function Llm({
  model,
  onModel,
  chave,
}: {
  readonly model: string;
  readonly onModel: (model: string) => void;
  readonly chave: ReturnType<typeof useLlmKey>;
}) {
  const [digitada, setDigitada] = useState('');
  const [teste, setTeste] = useState<
    { status: 'idle' } | { status: 'busy' } | { status: 'done'; texto: string }
  >({ status: 'idle' });
  const estado = chave.hasKey === null ? t.llm.checking : chave.hasKey ? t.llm.hasKey : t.llm.noKey;

  return (
    <div className={styles['llm']}>
      <label className={styles['llmLinha']}>
        <span className={styles['llmRotulo']}>{t.llm.model}</span>
        <select
          className={cx(styles['seletor'], 'chamfer-sm')}
          value={model}
          onChange={(event) => {
            onModel(event.target.value);
          }}
        >
          {LLM_MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </label>
      <label className={styles['llmLinha']}>
        <span className={styles['llmRotulo']}>{t.llm.key}</span>
        <input
          type="password"
          className={cx(styles['seletor'], styles['llmChave'], 'chamfer-sm')}
          placeholder={t.llm.keyPlaceholder}
          value={digitada}
          autoComplete="off"
          onChange={(event) => {
            setDigitada(event.target.value);
          }}
        />
        <button
          type="button"
          className={cx(styles['secondary'], styles['formaBotao'], 'chamfer-sm')}
          disabled={digitada.trim() === ''}
          onClick={() => {
            void chave.save(digitada).then(() => {
              setDigitada('');
              setTeste({ status: 'idle' });
            });
          }}
        >
          {t.llm.save}
        </button>
        {chave.hasKey === true && (
          <button
            type="button"
            className={cx(styles['secondary'], styles['formaBotao'], 'chamfer-sm')}
            onClick={() => {
              void chave.forget().then(() => {
                setTeste({ status: 'idle' });
              });
            }}
          >
            {t.llm.forget}
          </button>
        )}
      </label>
      <p className={styles['hint']}>{t.llm.keyHint}</p>
      <div className={styles['llmLinha']}>
        <span className={styles['formaEstado']}>{estado}</span>
        {chave.hasKey === true && (
          <button
            type="button"
            className={cx(styles['secondary'], styles['formaBotao'], 'chamfer-sm')}
            disabled={teste.status === 'busy'}
            onClick={() => {
              setTeste({ status: 'busy' });
              void chave.test().then((r) => {
                setTeste({
                  status: 'done',
                  texto: r.ok ? t.llm.testOk(r.text) : t.llm.testFail(r.why),
                });
              });
            }}
          >
            {teste.status === 'busy' ? t.llm.testing : t.llm.test}
          </button>
        )}
      </div>
      {teste.status === 'done' && <p className={styles['llmResultado']}>{teste.texto}</p>}
    </div>
  );
}
