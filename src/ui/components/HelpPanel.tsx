import { useRef } from 'react';

import { strings } from '@i18n/index';
import { cx } from '@ui/cx';
import { useDismissable } from '@ui/hooks/useDismissable';

import styles from './HelpPanel.module.css';

const t = strings.help;

/** Um parágrafo que é só uma URL: vira link, em linha própria, para ser achado de longe. */
const SO_URL = /^https?:\/\/\S+$/;

/**
 * A ajuda (Etapa 59, pelo autor): o painel do "?" ao lado da engrenagem, com o mesmo
 * comportamento do de configurações — ancorado no botão, some com Esc ou clique fora.
 * É prosa para ler uma vez, não controle: só títulos e parágrafos, vindos do i18n.
 */
export function HelpPanel({
  anchor,
  onClose,
}: {
  readonly anchor: React.RefObject<HTMLButtonElement | null>;
  readonly onClose: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useDismissable(true, panel, anchor, onClose);

  return (
    <div
      ref={panel}
      className={cx(styles['panel'], 'chamfer-lg')}
      role="dialog"
      aria-label={t.title}
    >
      <h2 className={styles['title']}>{t.title}</h2>
      {t.sections.map((section) => (
        <section key={section.title} className={styles['section']}>
          <h3 className={styles['sectionTitle']}>{section.title}</h3>
          {section.body.map((paragraph) =>
            SO_URL.test(paragraph) ? (
              <p key={paragraph} className={styles['text']}>
                <a
                  className={styles['link']}
                  href={paragraph}
                  target="_blank"
                  rel="noreferrer"
                >
                  {paragraph}
                </a>
              </p>
            ) : (
              <p key={paragraph} className={styles['text']}>
                {paragraph}
              </p>
            ),
          )}
        </section>
      ))}
    </div>
  );
}
