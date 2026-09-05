import { useEffect, useMemo, useState } from 'react';

import {
  fieldValue,
  parseDurationCode,
  rarityLetter,
  type BrowseEntity,
  type DetailFieldSpec,
} from '@core/browse/index';
import { isRecord } from '@core/json';
import { parseDescription } from '@core/markup/index';
import { readDesc } from '@core/store/index';
import { strings } from '@i18n/index';
import { createIndexedDbStore } from '@platform/store-indexeddb';
import { ActionCost } from '@ui/components/ActionCost';
import { RarityMark } from '@ui/components/RarityMark';
import { RichText } from '@ui/components/RichText';
import { CollapseToggle } from '@ui/components/CollapseToggle';
import { cx } from '@ui/cx';

import styles from './DetailPanel.module.css';

const store = createIndexedDbStore();
const t = strings.browse.detail;
const b = strings.browse;

export interface DetailPanelProps {
  readonly entity: BrowseEntity;
  readonly entityType: string;
  readonly fields: readonly DetailFieldSpec[];
  /**
   * Recolher o painel. Ausente no flutuante, que não recolhe — ele fecha.
   *
   * Substituiu um `onClose` com `×`. O × ficava sobre a seta de recolher na lateral e
   * aparecia DE NOVO dentro do pop-out, que já tem o próprio × na barra de título.
   */
  readonly onCollapse?: () => void;
  /** Ausente quando já está flutuando: não se destaca o que já está destacado. */
  readonly onPopOut?: () => void;
}

/**
 * O detalhe de uma entrada.
 *
 * O mesmo componente serve o painel lateral e o pop-out flutuante — quem muda é só o
 * invólucro. Por isso a barra de ações recebe `onPopOut` opcional em vez de saber onde
 * está: um componente que pergunta "estou flutuando?" acaba com dois desenhos que
 * divergem no primeiro ajuste.
 */
export function DetailPanel({
  entity,
  entityType,
  fields,
  onCollapse,
  onPopOut,
}: DetailPanelProps) {
  const description = useDescription(entityType, entity.key);
  const nodes = useMemo(
    () => (description === null ? null : parseDescription(description)),
    [description],
  );

  const letraDaRaridade = rarityLetter(fieldValue(entity, 'rarity'));

  return (
    <section className={styles['panel']} aria-label={fieldValue(entity, 'name')}>
      {/*
        Ações em CIMA, nome embaixo.
        Lado a lado, os botões espremiam o nome: "Persistent Damage" quebrava em duas
        linhas e "Pathfinder Society Scenario…" saía cortado. Botão tem largura fixa e
        nome não tem, então quem cede numa linha compartilhada é sempre o nome. Em linhas
        separadas, o nome fica com a largura inteira e nada o disputa.
      */}
      <header className={styles['head']}>
        <Actions onCollapse={onCollapse} onPopOut={onPopOut} />

        {/*
          Nome e raridade juntos, como na lista.
          A raridade deixou de ser um campo do `<dl>`: ela identifica a entrada junto com
          o nome, e uma linha "RARIDADE: comum" repetia em quase toda entrada o que é o
          normal. Fora do `<dl>`, ela também não some quando o campo `rarity` não existir.
        */}
        <div className={styles['nameRow']}>
          <h2 className={styles['name']}>{fieldValue(entity, 'name')}</h2>
          {letraDaRaridade !== null && (
            <RarityMark
              letter={letraDaRaridade}
              label={b.rarity[fieldValue(entity, 'rarity')] ?? ''}
            />
          )}
        </div>

        {entity.retiredIn !== undefined && (
          <p className={styles['retired']}>
            {b.retired} — {entity.retiredIn}
          </p>
        )}

        <dl className={styles['fields']}>
          {fields.map((spec, index) => (
            <Field key={index} spec={spec} entity={entity} />
          ))}
        </dl>
      </header>

      {/*
       * A rolagem é DAQUI, não da página: a descrição de um talento longo passa da altura
       * da janela, e sem teto o cabeçalho sairia de vista junto. Assim nome, custo e
       * traços ficam sempre à mão enquanto se lê o texto.
       */}
      <div className={styles['body']}>
        {nodes === null ? null : (
          <div className={styles['prose']}>
            <RichText nodes={nodes} />
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * A barra de ações. UM botão de tradução, rotulado pelo DESTINO.
 *
 * Eram três lado a lado — gerar, alternar, regerar — e juntos ocupavam mais largura que o
 * nome da entrada. Agora é um só: diz `Traduzir` enquanto se lê o original, e passa a
 * dizer `Ver original` depois de traduzido. Rótulo pelo destino e não pelo estado: o
 * botão anuncia o que o clique FAZ, que é o que se quer saber antes de clicar.
 *
 * A roda de regerar só aparece no modo tradução, porque só ali existe algo a refazer —
 * ela é o único caminho que ignora o cache local.
 *
 * Tudo DESABILITADO: a tradução sob demanda é a Etapa 15. Visível permite avaliar o
 * desenho; clicável seria fingir que funciona. O motivo vai no `title`.
 */
function Actions({
  onCollapse,
  onPopOut,
}: {
  readonly onCollapse?: (() => void) | undefined;
  readonly onPopOut?: (() => void) | undefined;
}) {
  return (
    <div className={styles['actions']}>
      {/*
        Recolher fica à ESQUERDA, na MESMA linha da tradução e do pop-out.
        Estava flutuando sobre o canto do painel, em cima do ×, e a barra subia e descia
        conforme o painel abria e fechava. Na linha, tudo alinha e nada se mexe.
      */}
      {onCollapse && (
        <CollapseToggle
          side="right"
          collapsed={false}
          label={strings.browse.collapseDetail}
          onToggle={onCollapse}
        />
      )}
      <span className={styles['espaco']} />

      <button
        type="button"
        className={cx(styles['action'], 'chamfer-sm')}
        disabled
        title={t.translationPending}
      >
        {t.translate}
      </button>

      {onPopOut && (
        <button
          type="button"
          className={cx(styles['icon'], 'chamfer-sm')}
          aria-label={t.popOut}
          title={t.popOut}
          onClick={onPopOut}
        >
          ⤢
        </button>
      )}
    </div>
  );
}

/**
 * Um campo do cabeçalho.
 *
 * Um caso por espécie declarada em `core/browse/spec.ts`, igual às colunas da lista.
 * Acrescentar espécie é um caso na união mais um caso aqui, e o compilador cobra.
 */
function Field({
  spec,
  entity,
}: {
  readonly spec: DetailFieldSpec;
  readonly entity: BrowseEntity;
}) {
  const label = (field: string): string => b.fieldLabel[field] ?? field;

  switch (spec.kind) {
    case 'cost': {
      const kind = fieldValue(entity, 'costKind');
      if (kind === '') return null;
      const count = Number(fieldValue(entity, 'costCount'));
      return (
        <Row label={b.cost.label}>
          <ActionCost kind={kind} count={Number.isFinite(count) ? count : null} />
        </Row>
      );
    }

    case 'text': {
      const value = fieldValue(entity, spec.field);
      if (value === '') return null;
      return <Row label={label(spec.field)}>{value}</Row>;
    }

    case 'boolean': {
      const value = fieldValue(entity, spec.field);
      if (value === '') return null;
      return <Row label={label(spec.field)}>{value === 'true' ? b.yes : b.no}</Row>;
    }

    case 'chips': {
      const list = readList(entity, spec.field);
      if (list.length === 0) return null;
      return (
        <Row label={label(spec.field)}>
          <span className={styles['chips']}>
            {list.map((item) => (
              <span key={item} className={cx(styles['chip'], 'chamfer-sm')}>
                {item}
              </span>
            ))}
          </span>
        </Row>
      );
    }

    /*
     * Só o livro. A licença (ORC/OGL) saiu: é informação jurídica da Paizo, não ajuda
     * ninguém na mesa a decidir se pode usar o poder.
     *
     * "Legado" é marcação POR OMISSÃO — só o que veio antes do Remaster ganha selo, e o
     * resto não ganha nada. Marcar os dois lados encheria todas as linhas de ruído para
     * dizer o que já é o normal. E `!== 'true'` seria errado: campo ausente viraria
     * legado. Só o `false` explícito marca.
     */
    case 'source': {
      const title = fieldValue(entity, 'source.title');
      if (title === '') return null;
      const legado = fieldValue(entity, 'source.remaster') === 'false';
      return (
        <Row label={label('source.title')}>
          {title}
          {legado && (
            <span className={cx(styles['legacy'], 'chamfer-sm')} title={b.legacyHint}>
              {b.legacy}
            </span>
          )}
        </Row>
      );
    }

    /*
     * O `per` mistura palavra (`day`) com ISO-8601 (`PT1H`), e o cru aparecia na tela
     * como "1 × PT1H". `core/` decodifica a estrutura, o i18n escreve a palavra.
     */
    case 'frequency': {
      const value = readRecord(entity, spec.field);
      if (value === null) return null;
      const max = Number(value['max']);
      const per = typeof value['per'] === 'string' ? value['per'] : '';
      const duracao = parseDurationCode(per);
      const f = b.frequency;
      const unidade = duracao === null ? undefined : f.units[duracao.unit];
      return (
        <Row label={label(spec.field)}>
          {f.times(Number.isFinite(max) ? max : 1)}{' '}
          {duracao === null || unidade === undefined
            ? f.unknown(per)
            : f.every(duracao.count, unidade)}
        </Row>
      );
    }
  }
}

function Row({ label, children }: { readonly label: string; readonly children: React.ReactNode }) {
  return (
    <>
      <dt className={styles['label']}>{label}</dt>
      <dd className={styles['value']}>{children}</dd>
    </>
  );
}

function readList(entity: BrowseEntity, field: string): string[] {
  const base = entity.base;
  if (!isRecord(base)) return [];
  const value = base[field];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function readRecord(entity: BrowseEntity, field: string): Record<string, unknown> | null {
  const base = entity.base;
  if (!isRecord(base)) return null;
  const value = base[field];
  return isRecord(value) ? value : null;
}

/** As descrições moram em `desc/<tipo>`, à parte, por serem pesadas (briefing 5.2). */
function useDescription(type: string, key: string): string | null {
  const [loaded, setLoaded] = useState<{ token: string; text: string } | null>(null);
  const token = `${type}/${key}`;

  useEffect(() => {
    let alive = true;
    readDesc(store, type)
      .then((all) => {
        if (!alive || all === null) return;
        const entry = all[key];
        if (!isRecord(entry)) return;
        const main = entry['main'];
        if (typeof main === 'string') setLoaded({ token, text: main });
      })
      .catch(() => {
        // Sem descrição gravada, o painel mostra só o cabeçalho.
      });
    return () => {
      alive = false;
    };
  }, [type, key, token]);

  return loaded?.token === token ? loaded.text : null;
}
