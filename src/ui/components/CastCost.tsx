import type { SpellCast } from '@core/normalization/index';
import { strings } from '@i18n/index';
import { ActionCost } from '@ui/components/ActionCost';

import styles from './CastCost.module.css';

const t = strings.browse;

/**
 * O custo de CONJURAR uma magia, que não é o custo em ações das outras fontes.
 *
 * Três formas, e o dado real tem as três: contagem de ações (`◆◆`), FAIXA (`◆ a ◆◆◆`) e
 * DURAÇÃO (`10 minutos`). Medido nas 1.994 magias — 1.556 são contagem, 283 são duração,
 * 49 são faixa de ações e 7 são faixa que começa em ações e termina em duração.
 *
 * Mistura glifo com prosa de propósito: o autor pediu, e é o que o livro faz. Um `◆ a ◆◆◆`
 * escrito por extenso ("de uma a três ações") ocuparia meia linha para dizer o que dois
 * losangos e um "a" dizem de relance.
 *
 * O ponto que não se reconhece cai no texto CRU, e não some: um formato novo numa versão
 * futura do sistema fica feio onde se vê.
 */
export function CastCost({ cast }: { readonly cast: SpellCast }) {
  const ponto = (p: SpellCast['from']) => {
    if (p.kind === 'time' && p.time !== null) {
      const unidade = t.frequency.units[p.time.unit];
      if (unidade === undefined) return <span>{cast.raw}</span>;
      return (
        <span className={styles['prosa']}>
          {p.time.count} {p.time.count === 1 ? unidade[0] : unidade[1]}
        </span>
      );
    }
    if (p.kind === 'unknown') return <span className={styles['prosa']}>{cast.raw}</span>;
    return <ActionCost kind={p.kind} count={p.count} />;
  };

  if (cast.to === null) return ponto(cast.from);

  return (
    <span className={styles['faixa']}>
      {ponto(cast.from)}
      <span className={styles['ate']}>{t.cast.to}</span>
      {ponto(cast.to)}
    </span>
  );
}
