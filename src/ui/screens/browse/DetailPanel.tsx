import { useEffect, useMemo, useState } from 'react';

import {
  fieldValue,
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
import { CastCost } from '@ui/components/CastCost';
import { Frequency } from '@ui/components/Frequency';
import { RarityMark } from '@ui/components/RarityMark';
import { RichText } from '@ui/components/RichText';
import { CollapseToggle } from '@ui/components/CollapseToggle';
import { cx } from '@ui/cx';
import { bookLabel, capitalizar, fieldText } from '@ui/text';

import { itemBulkText, itemDamageText, itemPriceText, statText } from './itemFields';
import type { PopoutSubject } from './popouts';
import { areaText, defenseText, durationText, ritualLines, spellCast } from './spellFields';
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
  /**
   * Como resolver um `@UUID`. Ausente: as referências viram texto morto.
   *
   * É a primeira ponte entre fontes do aplicativo — a perícia aponta para a ação, e quem
   * sabe resolver o ponteiro é a tela, que tem todas as bases carregadas.
   */
  readonly reference?: ReferenceBridge;
  /**
   * O painel está EMBUTIDO dentro de outro — a ação aberta debaixo da perícia.
   *
   * Só muda o desenho: embutido ele não recolhe nem tem borda própria de coluna. O
   * conteúdo é o mesmo, com o mesmo botão de traduzir e o mesmo pop-out, porque é a mesma
   * entrada vista do mesmo jeito.
   */
  readonly embedded?: boolean;
}

/**
 * Como a tela resolve um `@UUID`, e o que fazer quando se quer destacá-lo.
 *
 * O painel não sabe onde as bases moram — ele recebe a função. Assim o mesmo componente
 * serve a lateral e o flutuante: o flutuante de uma perícia também troca de ação por
 * dentro, que foi o pedido.
 */
export interface ReferenceBridge {
  readonly resolve: (uuid: string) => PopoutSubject | null;
  readonly onPopOut?: (subject: PopoutSubject) => void;
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
  reference,
  embedded = false,
}: DetailPanelProps) {
  const description = useDescription(entityType, entity.key);

  /*
   * A SUB-TELA: qual referência está aberta debaixo desta entrada.
   *
   * Estado DAQUI, e não da tela: assim um flutuante de perícia troca de ação por dentro
   * sem mexer no que a lateral mostra, que foi exatamente o pedido — o pop-out pode ser da
   * perícia (com a ação trocável dentro) ou da ação sozinha.
   */
  const [aberta, setAberta] = useState<string | null>(null);
  /* Trocar de entrada fecha a sub-tela. Ajustado no render, não num efeito: o efeito
     rodaria depois de a tela já ter sido pintada com a ação da entrada anterior. */
  const [ecoada, setEcoada] = useState(entity.key);
  if (ecoada !== entity.key) {
    setEcoada(entity.key);
    setAberta(null);
  }
  const alvo = reference === undefined || aberta === null ? null : reference.resolve(aberta);
  const destacar = reference?.onPopOut;
  const nodes = useMemo(
    () => (description === null ? null : parseDescription(description)),
    [description],
  );

  const letraDaRaridade = rarityLetter(fieldValue(entity, 'rarity'));

  return (
    <section
      className={cx(
        styles['panel'],
        embedded && styles['embutido'],
        alvo !== null && styles['comSub'],
      )}
      aria-label={fieldValue(entity, 'name')}
    >
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
          {/*
            Ao lado do nome fica só a RARIDADE.

            O glifo do custo esteve aqui, seguindo o livro — e ali ele não tem rótulo: quem
            varre o cabeçalho procurando "Execução" não achava em 1.711 das 1.994. Raridade
            identifica a entrada; custo é campo, e campo mora no `<dl>` abaixo.
          */}
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
            <Field
              key={index}
              spec={spec}
              entity={entity}
              selected={aberta}
              {...(reference === undefined
                ? {}
                : {
                    onToggleReference: (uuid: string) => {
                      // Clicar na que já está aberta fecha: é o mesmo gesto do tópico de
                      // filtro, e é o caminho de volta para o detalhe da perícia sozinho.
                      setAberta((atual) => (atual === uuid ? null : uuid));
                    },
                  })}
            />
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

      {/*
        A SUB-TELA da ação escolhida — o mesmo painel, embutido.

        Não é uma cópia reduzida: é o `DetailPanel` de novo, com a barra de tradução e o
        pop-out próprios. Por isso a pessoa escolhe o que destacar — a perícia inteira (e
        troca de ação lá dentro) ou só a ação. Ele não recebe `reference`, e é o que
        impede o aninhamento infinito: uma ação dentro da ação dentro da ação.
      */}
      {alvo !== null && (
        <div className={styles['sub']}>
          <DetailPanel
            entity={alvo.entity}
            entityType={alvo.entityType}
            fields={alvo.fields}
            embedded
            {...(destacar === undefined
              ? {}
              : {
                  onPopOut: () => {
                    destacar(alvo);
                  },
                })}
          />
        </div>
      )}
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
  selected,
  onToggleReference,
}: {
  readonly spec: DetailFieldSpec;
  readonly entity: BrowseEntity;
  /** O `@UUID` da referência aberta agora, para marcá-la. */
  readonly selected?: string | null;
  readonly onToggleReference?: (uuid: string) => void;
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
      return <Row label={label(spec.field)}>{fieldText(spec.field, value)}</Row>;
    }

    /*
     * Sim vira SÍMBOLO; não some a linha inteira.
     *
     * "VALORADA: não" gasta uma linha do cabeçalho para dizer o que é o normal — 31 das 43
     * condições não são valoradas. A ausência da linha já é a resposta, e quem quer saber
     * o que a linha significa passa o mouse no ✓.
     */
    case 'boolean': {
      if (fieldValue(entity, spec.field) !== 'true') return null;
      return (
        <Row label={label(spec.field)}>
          <span className={styles['sim']} title={b.yes}>
            ✓
          </span>
        </Row>
      );
    }

    case 'chips': {
      const list = readList(entity, spec.field);
      if (list.length === 0) return null;
      return (
        <Row label={label(spec.field)}>
          <span className={styles['chips']}>
            {list.map((item) => (
              <span key={item} className={cx(styles['chip'], 'chamfer-sm')}>
                {capitalizar(item)}
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
        <Row label={label('source.title')} title={title}>
          {/*
            O nome DESCASCADO, igual à lista e ao filtro. "Pathfinder" é redundante num app
            que só tem Pathfinder, e "Lost Omens" é linha de produto, não nome do livro.
            O título inteiro fica no `title` da linha, para quem precisar citar a fonte.
          */}
          {bookLabel(title)}
          {legado && (
            <span className={cx(styles['legacy'], 'chamfer-sm')} title={b.legacyHint}>
              {b.legacy}
            </span>
          )}
        </Row>
      );
    }

    /* A execução desenha SEMPRE — inclusive `◆◆`, que é o caso de 1.095 das 1.994. */
    case 'cast': {
      const cast = spellCast(entity, spec.field);
      if (cast === null) return null;
      return (
        <Row label={label(spec.field)}>
          <CastCost cast={cast} />
        </Row>
      );
    }

    /*
     * A SUB-LISTA de ações de uma perícia — o único campo que desenha uma ponte em vez de
     * um valor. Cada ação é um botão; clicar abre a entrada dela, que já existe na fonte de
     * Ações. Nada é duplicado: aqui mora o ponteiro, e lá mora o conteúdo.
     */
    case 'actions': {
      const destreinadas = referencias(entity, spec.field);
      const treinadas = referencias(entity, spec.trained);
      if (destreinadas.length === 0 && treinadas.length === 0) return null;
      const aberta = selected ?? null;
      return (
        <>
          {destreinadas.length > 0 && (
            <Row label={s.untrained}>
              <Referencias acoes={destreinadas} aberta={aberta} onAbrir={onToggleReference} />
            </Row>
          )}
          {treinadas.length > 0 && (
            <Row label={s.trained}>
              <Referencias acoes={treinadas} aberta={aberta} onAbrir={onToggleReference} />
            </Row>
          )}
        </>
      );
    }

    case 'stat': {
      const valor = statText(entity, spec.field, spec);
      if (valor === '') return null;
      return <Row label={label(spec.field)}>{valor}</Row>;
    }

    case 'price':
    case 'bulk':
    case 'damage': {
      const valor =
        spec.kind === 'price'
          ? itemPriceText(entity, spec.field)
          : spec.kind === 'bulk'
            ? itemBulkText(entity, spec.field)
            : itemDamageText(entity, spec.field);
      if (valor === '') return null;
      return <Row label={label(spec.field)}>{valor}</Row>;
    }

    case 'area':
    case 'defense':
    case 'duration': {
      const valor =
        spec.kind === 'area'
          ? areaText(entity, spec.field)
          : spec.kind === 'defense'
            ? defenseText(entity, spec)
            : durationText(entity, spec.field);
      if (valor === '') return null;
      return <Row label={label(spec.field)}>{capitalizar(valor)}</Row>;
    }

    case 'ritual': {
      const linhas = ritualLines(entity, spec.field);
      if (linhas.length === 0) return null;
      return <Row label={label(spec.field)}>{linhas.join(' · ')}</Row>;
    }

    /* O desenho mora em `Frequency`, porque a lista também o usa. */
    case 'frequency': {
      const desenho = Frequency({ entity, field: spec.field });
      if (desenho === null) return null;
      return <Row label={label(spec.field)}>{desenho}</Row>;
    }
  }
}

function Row({
  label,
  title,
  children,
}: {
  readonly label: string;
  /** O valor por extenso, para quando o desenhado for encurtado. Só o livro usa hoje. */
  readonly title?: string;
  readonly children: React.ReactNode;
}) {
  return (
    <>
      <dt className={styles['label']}>{label}</dt>
      <dd className={styles['value']} {...(title === undefined ? {} : { title })}>
        {children}
      </dd>
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

const s = strings.browse.skill;

/** Uma referência `@UUID` guardada num campo de lista. Ver a receita de perícia. */
interface Referencia {
  readonly uuid: string;
  readonly name: string;
}

function referencias(entity: BrowseEntity, field: string): readonly Referencia[] {
  const base = entity.base;
  if (!isRecord(base)) return [];
  const lista = base[field];
  if (!Array.isArray(lista)) return [];
  return lista
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .map((item) => ({
      uuid: typeof item['uuid'] === 'string' ? item['uuid'] : '',
      name: typeof item['name'] === 'string' ? item['name'] : '',
    }))
    .filter((item) => item.name !== '');
}

/**
 * As ações como BOTÕES, e não como texto — e a escolhida em BORDÔ.
 *
 * O bordô é a cor de ESTADO do sistema (ver UI-PATTERNS): ela nunca desenha dado de jogo,
 * e "esta é a que estou vendo" é exatamente estado. Sem a marca, abrir a quinta ação de
 * Athletics e rolar até ela deixava a pessoa sem saber qual das nove tinha clicado.
 *
 * Sem `onAbrir` elas viram texto simples em vez de sumirem: dentro da sub-tela não há para
 * onde navegar, e a lista de ações continua sendo informação útil ali.
 */
function Referencias({
  acoes,
  aberta,
  onAbrir,
}: {
  readonly acoes: readonly Referencia[];
  readonly aberta: string | null;
  readonly onAbrir: ((uuid: string) => void) | undefined;
}) {
  return (
    <span className={styles['referencias']}>
      {acoes.map((acao) => {
        if (onAbrir === undefined) {
          return (
            <span key={acao.uuid} className={styles['referencia']}>
              {acao.name}
            </span>
          );
        }
        const marcada = acao.uuid === aberta;
        return (
          <button
            key={acao.uuid}
            type="button"
            aria-pressed={marcada}
            className={cx(
              styles['referencia'],
              styles['referenciaAtiva'],
              marcada && styles['referenciaAberta'],
            )}
            title={marcada ? s.closeAction : s.openAction}
            onClick={() => {
              onAbrir(acao.uuid);
            }}
          >
            {acao.name}
          </button>
        );
      })}
    </span>
  );
}
