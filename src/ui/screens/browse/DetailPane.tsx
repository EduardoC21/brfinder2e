import { useState } from 'react';

import type { BrowseEntity, DetailFieldSpec } from '@core/browse/index';
import { strings } from '@i18n/index';
import { usePointerDrag } from '@ui/hooks/usePointerDrag';

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
export function DetailPane({ entity, entityType, fields, onClose, onPopOut }: DetailPaneProps) {
  const [largura, setLargura] = useState(PADRAO);

  const preso = (valor: number): number => Math.min(MAX, Math.max(MIN, valor));

  /*
   * O divisor fica à ESQUERDA do painel, então arrastar para a esquerda o AUMENTA — daí
   * o `- dx`. Errar esse sinal dá o clássico painel que foge do cursor.
   */
  const arrasto = usePointerDrag(
    () => largura,
    (inicio, dx) => {
      setLargura(preso(inicio - dx));
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
            setLargura((atual) => preso(atual + passo));
          }
          if (event.key === 'ArrowRight') {
            event.preventDefault();
            setLargura((atual) => preso(atual - passo));
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
    </div>
  );
}
