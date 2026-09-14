import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { parseDescription, pruneForReading } from '@core/markup/index';
import { strings } from '@i18n/index';
import { RichText } from '@ui/components/RichText';
import { cx } from '@ui/cx';
import { deleteStoredTranslation, saveManualTranslation } from '@ui/hooks/useTranslation';

import { missingMarks } from './marks';
import styles from './TranslationEditor.module.css';

const t = strings.browse.editor;

/**
 * A EDIÇÃO MANUAL (Etapa 43, pelo autor). A decisão de forma, entre três:
 *
 *   - editor visual sobre a máscara de leitura: exigiria serializar de volta para o HTML
 *     com as marcas do Foundry intactas — é onde link quebra sem ninguém ver;
 *   - um campo por parágrafo: bom para prosa, ruim para tabela, lista e rótulo em
 *     negrito, que é metade do texto do Foundry;
 *   - a FONTE HTML com pré-visualização ao vivo e trava nas marcas — esta.
 *
 * A pessoa edita o HTML da tradução (ou do original, para começar do zero); a máscara de
 * leitura desenha ao lado a cada tecla; e a regra dura é a mesma da blindagem: só grava
 * se TODAS as marcas do Foundry do original continuarem no texto, com o mesmo alvo — o
 * rótulo entre chaves pode mudar, o alvo não. Grava como `manual`, que a máquina nunca
 * sobrescreve; por isso o "Apagar tradução" mora aqui: é o único caminho de volta.
 *
 * Um portal no `body`: o editor abre de dentro da lateral, do flutuante ou da tela
 * completa, e nenhum desses contextos de empilhamento pode cortá-lo.
 */
export interface TranslationEditorProps {
  readonly entityType: string;
  readonly entityKey: string;
  readonly field: string;
  readonly title: string;
  /** O HTML original em inglês — a referência das marcas, e o ponto de partida sem tradução. */
  readonly original: string;
  /** A tradução gravada, se há. */
  readonly current: { readonly html: string; readonly method: string } | null;
  /** `saved` diz se gravou (ou apagou): quem abriu decide o que mostrar depois. */
  readonly onClose: (saved: boolean) => void;
}

export function TranslationEditor({
  entityType,
  entityKey,
  field,
  title,
  original,
  current,
  onClose,
}: TranslationEditorProps) {
  const [texto, setTexto] = useState(current?.html ?? original);
  const [salvando, setSalvando] = useState(false);
  const [confirmarApagar, setConfirmarApagar] = useState(false);
  const mudou = texto !== (current?.html ?? original);
  const faltam = useMemo(() => missingMarks(original, texto), [original, texto]);
  const nodes = useMemo(() => pruneForReading(parseDescription(texto)), [texto]);

  /* Esc fecha só quando não há o que perder; com edição, só o botão. */
  useEffect(() => {
    const aoTeclar = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && !mudou) onClose(false);
    };
    window.addEventListener('keydown', aoTeclar);
    return () => {
      window.removeEventListener('keydown', aoTeclar);
    };
  }, [mudou, onClose]);

  const salvar = (): void => {
    if (faltam.length > 0 || salvando) return;
    setSalvando(true);
    void saveManualTranslation(entityType, entityKey, field, texto, original).then(() => {
      setSalvando(false);
      onClose(true);
    });
  };

  return createPortal(
    <div className={styles['fundo']} role="presentation">
      <div className={styles['caixa']} role="dialog" aria-modal="true" aria-label={t.title(title)}>
        <header className={styles['cabeca']}>
          <h2 className={styles['titulo']}>{t.title(title)}</h2>
          <span className={styles['origem']}>
            {current === null
              ? t.fromOriginal
              : t.fromTranslation(
                  strings.settings.translation.methods[current.method]?.name ?? current.method,
                )}
          </span>
        </header>

        <div className={styles['colunas']}>
          <section className={styles['coluna']}>
            <h3 className={styles['rotulo']}>{t.source}</h3>
            <textarea
              className={styles['fonte']}
              value={texto}
              spellCheck
              lang="pt-BR"
              onChange={(event) => {
                setTexto(event.target.value);
              }}
            />
          </section>
          <section className={styles['coluna']}>
            <h3 className={styles['rotulo']}>{t.preview}</h3>
            <div className={cx(styles['previa'], 'prose')}>
              <RichText nodes={nodes} />
            </div>
          </section>
        </div>

        <p className={cx(styles['aviso'], faltam.length > 0 && styles['avisoErro'])}>
          {faltam.length > 0 ? t.marksMissing(faltam) : t.hint}
        </p>

        <footer className={styles['rodape']}>
          {current !== null &&
            (confirmarApagar ? (
              <button
                type="button"
                className={cx(styles['botao'], styles['perigo'], 'chamfer-sm')}
                onClick={() => {
                  void deleteStoredTranslation(entityType, entityKey, field).then(() => {
                    onClose(true);
                  });
                }}
              >
                {t.deleteConfirm}
              </button>
            ) : (
              <button
                type="button"
                className={cx(styles['botao'], 'chamfer-sm')}
                onClick={() => {
                  setConfirmarApagar(true);
                }}
              >
                {t.delete}
              </button>
            ))}
          <span className={styles['espaco']} />
          <button
            type="button"
            className={cx(styles['botao'], 'chamfer-sm')}
            onClick={() => {
              onClose(false);
            }}
          >
            {mudou ? t.discard : t.close}
          </button>
          <button
            type="button"
            className={cx(styles['botao'], styles['principal'], 'chamfer-sm')}
            disabled={!mudou || faltam.length > 0 || salvando}
            onClick={salvar}
          >
            {salvando ? t.saving : t.save}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
