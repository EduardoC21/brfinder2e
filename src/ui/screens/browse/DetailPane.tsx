import { useState } from 'react';

import type { BrowseEntity, DetailFieldSpec } from '@core/browse/index';
import { withLayout } from '@core/prefs/index';
import { strings } from '@i18n/index';
import { usePointerDrag } from '@ui/hooks/usePointerDrag';
import { usePreferences } from '@ui/prefs/usePreferences';

import { DetailPanel } from './DetailPanel';
import styles from './DetailPane.module.css';

const t = strings.browse.detail;

const MIN = 300;
const MAX = 720;
const PADRAO = 420;

interface DetailPaneProps {
  /** `null` quando nada está selecionado. O painel continua na tela mesmo assim. */
  readonly entity: BrowseEntity | null;
  readonly entityType: string;
  readonly fields: readonly DetailFieldSpec[];
  readonly onClose: () => void;
  readonly onPopOut: () => void;
  /**
   * O painel de um tópico de filtro, quando há um aberto.
   *
   * Vem como nó pronto e não como descritor porque quem sabe montá-lo é a tela — este
   * componente só empresta o espaço.
   */
  readonly overlay?: React.ReactNode;
}

/**
 * A coluna de detalhe: sempre presente, com largura ajustável pela borda.
 *
 * "Sempre presente" é o ponto. Antes ela aparecia e sumia conforme a seleção, e cada
 * aparição reflowava a lista inteira — as colunas mudavam de largura debaixo do cursor
 * no exato momento em que a pessoa acabava de clicar numa linha. Ocupando espaço fixo, a
 * lista fica parada e o que muda é só o conteúdo da coluna.
 *
 * O divisor é `role="separator"` com `aria-orientation`, e não um botão: ele não executa
 * ação, ajusta uma medida. Aceita as setas do teclado porque um controle que só responde
 * a arrasto não existe para quem não usa o mouse.
 */
export function DetailPane({
  entity,
  entityType,
  fields,
  onClose,
  onPopOut,
  overlay,
}: DetailPaneProps) {
  /*
   * A largura vem da preferência, não de um `useState` local: ela precisa sobreviver ao
   * fechamento do app. O `preso` é reaplicado na LEITURA porque o mínimo e o máximo podem
   * ter mudado desde a gravação — um valor gravado por uma versão anterior não é promessa.
   */
  const { prefs, update } = usePreferences();
  const preso = (valor: number): number => Math.min(MAX, Math.max(MIN, valor));
  const salva = preso(prefs.layout.detailWidth ?? PADRAO);

  /*
   * Durante o arrasto a largura é LOCAL; ela só vira preferência quando o gesto acaba.
   *
   * Gravar a cada quadro atualizaria o contexto a cada quadro, e todo consumidor dele
   * redesenharia junto — inclusive a lista, que tem 766 linhas em Ações. A preferência é
   * a escolha assentada, não o caminho até ela.
   */
  const [rascunho, setRascunho] = useState<number | null>(null);
  const largura = rascunho ?? salva;

  const assentar = (proxima: number): void => {
    update((atual) => withLayout(atual, { detailWidth: preso(proxima) }));
  };

  /*
   * O divisor fica à ESQUERDA do painel, então arrastar para a esquerda o AUMENTA — daí
   * o `- dx`. Errar esse sinal dá o clássico painel que foge do cursor.
   */
  const arrasto = usePointerDrag(
    () => largura,
    (inicio, dx) => {
      setRascunho(preso(inicio - dx));
    },
    () => {
      if (rascunho !== null) {
        assentar(rascunho);
        setRascunho(null);
      }
    },
  );

  return (
    <div className={styles['pane']} style={{ width: `${String(largura)}px` }}>
      <div
        className={styles['divider']}
        role="separator"
        aria-orientation="vertical"
        aria-label={t.resizeSidebar}
        aria-valuenow={largura}
        aria-valuemin={MIN}
        aria-valuemax={MAX}
        tabIndex={0}
        {...arrasto}
        onKeyDown={(event) => {
          const passo = event.shiftKey ? 48 : 16;
          if (event.key === 'ArrowLeft') {
            event.preventDefault();
            assentar(largura + passo);
          }
          if (event.key === 'ArrowRight') {
            event.preventDefault();
            assentar(largura - passo);
          }
        }}
      />

      {entity === null ? (
        <p className={styles['empty']}>{t.nothingSelected}</p>
      ) : (
        <DetailPanel
          entity={entity}
          entityType={entityType}
          fields={fields}
          onClose={onClose}
          onPopOut={onPopOut}
        />
      )}

      {/*
        O filtro se SOBREPÕE ao detalhe; não o substitui.
        Fechar o filtro tem que devolver a entrada exatamente como estava, inclusive a
        rolagem. Desmontar o DetailPanel perderia o `scrollTop`, e alternar `display:none`
        também o zera em alguns motores. Sobreposto, o detalhe continua montado e com
        layout — o navegador nem toca na posição de rolagem dele.
      */}
      {overlay !== undefined && <div className={styles['overlay']}>{overlay}</div>}
    </div>
  );
}
