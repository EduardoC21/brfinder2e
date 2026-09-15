import { useEffect, useState } from 'react';

import { pickDefaultModel, TRANSLATION_LANGUAGES } from '@core/translation/index';
import { withTranslation, type Preferences } from '@core/prefs/index';
import { strings } from '@i18n/index';
import { cx } from '@ui/cx';
import { useCommunityPack } from '@ui/hooks/useCommunityPack';
import { useCentralActions } from '@ui/hooks/useCentral';
import { useLlmKey } from '@ui/hooks/useTranslation';
import { usePreferences } from '@ui/prefs/usePreferences';

import styles from './SettingsPanel.module.css';

const t = strings.settings.translation;

/**
 * O setor TRADUÇÃO das configurações (Etapa 30; enxugado na 42, pelo autor: "só o modelo
 * de linguagem"). Três blocos, na ordem em que se decide:
 *
 *   1. como LER: o que aparece quando há tradução, os nomes das entradas, a língua;
 *   2. o GLOSSÁRIO da comunidade — nomes e termos que alimentam a tradução e a tela;
 *      era uma "forma" na hierarquia da 30, e nunca traduziu prosa: virou infraestrutura;
 *   3. o TRADUTOR: o Gemini com a chave da pessoa — modelo, chave, Testar.
 *
 * A hierarquia de formas (ligar, desligar, reordenar) saiu com o modelo local: com um
 * tradutor só, ela não decidia nada. A regra que sobrou não precisa de tela: a tradução
 * manual, quando existir, nunca é sobrescrita.
 */
export function TranslationSettings() {
  const { prefs, update } = usePreferences();
  const { display, names, language } = prefs.translation;
  const pacote = useCommunityPack(language);
  const chave = useLlmKey();

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
        <h3 className={styles['sectionTitle']}>{t.community.title}</h3>
        <p className={styles['hint']}>{t.community.description}</p>
        <div className={styles['llmLinha']}>
          <span className={styles['formaEstado']}>{estadoDoPacote(pacote.state)}</span>
          <button
            type="button"
            className={cx(styles['secondary'], styles['formaBotao'], 'chamfer-sm')}
            disabled={pacote.state.status === 'downloading' || pacote.state.status === 'loading'}
            onClick={pacote.download}
          >
            {pacote.state.status === 'ready' ? t.community.downloadAgain : t.community.download}
          </button>
        </div>
      </section>

      <section className={styles['section']}>
        <h3 className={styles['sectionTitle']}>{t.llm.title}</h3>
        <p className={styles['hint']}>{t.llm.description}</p>
        <Llm
          model={prefs.translation.llm.model}
          onModel={(model) => {
            update((atual) => withTranslation(atual, { llm: { model } }));
          }}
          chave={chave}
        />
        <p className={styles['hint']}>{t.storage}</p>
      </section>

      <section className={styles['section']}>
        <h3 className={styles['sectionTitle']}>{t.central.title}</h3>
        <p className={styles['hint']}>{t.central.description}</p>
        <Central
          central={prefs.translation.central}
          onChange={(patch) => {
            update((atual) =>
              withTranslation(atual, { central: { ...atual.translation.central, ...patch } }),
            );
          }}
        />
      </section>
    </>
  );
}

/**
 * O bloco da central (Etapa 55): o endereço (vazio = desligada), o apelido, as duas
 * escolhas, e os dois botões — Atualizar (baixa o que a central oferece) e Aceitar todas
 * (grava onde a pessoa não tem nada). O resultado de cada um fica numa linha embaixo.
 */
function Central({
  central,
  onChange,
}: {
  readonly central: Preferences['translation']['central'];
  readonly onChange: (patch: Partial<Preferences['translation']['central']>) => void;
}) {
  const acoes = useCentralActions();
  const [estado, setEstado] = useState<
    { status: 'idle' } | { status: 'busy'; texto: string } | { status: 'done'; texto: string }
  >({ status: 'idle' });
  const ligada = central.url.trim() !== '';
  const rodar = (texto: string, acao: () => Promise<number>, pronto: (n: number) => string) => {
    setEstado({ status: 'busy', texto });
    acao()
      .then((n) => {
        setEstado({ status: 'done', texto: pronto(n) });
      })
      .catch((erro: unknown) => {
        setEstado({
          status: 'done',
          texto: t.central.failed(erro instanceof Error ? erro.message : String(erro)),
        });
      });
  };
  return (
    <div className={styles['llm']}>
      <label className={styles['llmLinha']}>
        <span className={styles['llmRotulo']}>{t.central.url}</span>
        <input
          type="url"
          className={cx(styles['seletor'], styles['llmChave'], 'chamfer-sm')}
          placeholder={t.central.urlPlaceholder}
          value={central.url}
          onChange={(event) => {
            onChange({ url: event.target.value });
          }}
        />
      </label>
      <label className={styles['llmLinha']}>
        <span className={styles['llmRotulo']}>{t.central.nickname}</span>
        <input
          type="text"
          className={cx(styles['seletor'], styles['llmChave'], 'chamfer-sm')}
          placeholder={t.central.nicknamePlaceholder}
          value={central.nickname}
          maxLength={40}
          onChange={(event) => {
            onChange({ nickname: event.target.value });
          }}
        />
      </label>
      <label className={styles['formaLiga']}>
        <input
          type="checkbox"
          checked={central.autoAccept}
          onChange={(event) => {
            onChange({ autoAccept: event.target.checked });
          }}
        />
        {t.central.autoAccept}
      </label>
      <label className={styles['formaLiga']}>
        <input
          type="checkbox"
          checked={central.sendManual}
          onChange={(event) => {
            onChange({ sendManual: event.target.checked });
          }}
        />
        {t.central.sendManual}
      </label>
      <div className={styles['llmLinha']}>
        <button
          type="button"
          className={cx(styles['secondary'], styles['formaBotao'], 'chamfer-sm')}
          disabled={!ligada || estado.status === 'busy'}
          onClick={() => {
            rodar(t.central.refreshing, acoes.refresh, t.central.refreshed);
          }}
        >
          {t.central.refresh}
        </button>
        <button
          type="button"
          className={cx(styles['secondary'], styles['formaBotao'], 'chamfer-sm')}
          disabled={!ligada || estado.status === 'busy'}
          onClick={() => {
            rodar(t.central.accepting, acoes.acceptAll, t.central.accepted);
          }}
        >
          {t.central.acceptAll}
        </button>
      </div>
      {estado.status !== 'idle' && <p className={styles['llmResultado']}>{estado.texto}</p>}
    </div>
  );
}

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
  /*
   * A lista de modelos vem da API (Etapa 47): nome de modelo muda todo ano, e o guardado
   * pode ter deixado de existir — aí troca-se pelo indicado, sem perguntar.
   */
  const { models } = chave;
  useEffect(() => {
    if (models.length === 0) return;
    const indicado = pickDefaultModel(models, model);
    if (indicado !== null && indicado !== model) onModel(indicado);
  }, [models, model, onModel]);
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
          disabled={models.length === 0}
          onChange={(event) => {
            onModel(event.target.value);
          }}
        >
          {(models.length === 0 ? [{ id: model, label: model }] : models).map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        {chave.hasKey === true && models.length === 0 && (
          <span className={styles['formaEstado']}>{t.llm.modelsLoading}</span>
        )}
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
