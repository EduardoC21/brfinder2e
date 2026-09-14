import { useMemo, useState } from 'react';

import {
  contextFor,
  fieldList,
  fieldValue,
  rarityLetter,
  type BrowseEntity,
  type DescriptionContext,
  type DetailFieldSpec,
  type SideSpec,
} from '@core/browse/index';
import type { DescriptionAlteration } from '@core/normalization/index';
import { isRecord } from '@core/json';
import { parseDescription, pruneForReading } from '@core/markup/index';
import { strings } from '@i18n/index';
import { ActionCost } from '@ui/components/ActionCost';
import { CastCost } from '@ui/components/CastCost';
import { Frequency } from '@ui/components/Frequency';
import { RarityMark } from '@ui/components/RarityMark';
import { RichText, type RichTextLinks } from '@ui/components/RichText';
import { ScrollRail } from '@ui/components/ScrollRail';
import { TraitChip } from '@ui/components/TraitChip';
import { useTraitLabel } from '@ui/glossary/useTraitLabel';
import { useDescription, useDescriptionFields } from '@ui/hooks/useDescription';
import { CollapseToggle } from '@ui/components/CollapseToggle';
import { cx } from '@ui/cx';
import { bookLabel, capitalizar, fieldText, rankLabel } from '@ui/text';

import { ATTRIBUTE_NAME_FIELDS, attributeNameByName, boostsText } from './backgroundFields';
import { references as referenciasDe, type Reference } from './referenceFields';
import { itemBulkText, itemDamageText, itemPriceText, statText } from './itemFields';
import type { PopoutSubject } from './popouts';
import { areaText, defenseText, durationText, ritualLines, spellCast } from './spellFields';
import styles from './DetailPanel.module.css';

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
  /** Abre a TELA COMPLETA (22b). Só a lateral das fontes grandes passa. */
  readonly onExpand?: () => void;
  /**
   * Como resolver um `@UUID`. Ausente: as referências viram texto morto.
   *
   * É a primeira ponte entre fontes do aplicativo — a perícia aponta para a ação, e quem
   * sabe resolver o ponteiro é a tela, que tem todas as bases carregadas.
   */
  readonly reference?: ReferenceBridge;
  /** Desfaz a última navegação deste painel. Ausente quando não há para onde voltar. */
  readonly onBack?: () => void;
  /**
   * O painel está EMBUTIDO dentro de outro — a ação aberta debaixo da perícia.
   *
   * Só muda o desenho: embutido ele não recolhe nem tem borda própria de coluna. O
   * conteúdo é o mesmo, com o mesmo botão de traduzir e o mesmo pop-out, porque é a mesma
   * entrada vista do mesmo jeito.
   */
  readonly embedded?: boolean;
  /** De onde esta entrada foi aberta, quando isso muda o texto. Ver `contextFor`. */
  readonly context?: DescriptionContext | undefined;
  /**
   * As SUB-ABAS no lugar da descrição (26d): a lateral da aba de texto da classe mostra
   * a progressão, as proficiências e as magias por dia, trocando entre elas como as abas
   * de cima. Com `side`, a descrição não é desenhada — a página inteira está do lado.
   */
  readonly side?: SideSpec;
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
  /**
   * A segunda forma de resolver: por TIPO e SLUG. É como os campos apontam — a divindade
   * guarda `domains: ['fire']`, e `fire` só é único dentro de `domain`.
   */
  readonly resolveSlug: (entityType: string, slug: string) => PopoutSubject | null;
  /** Abre em painel NOVO. É o que a lateral sempre faz, e o que o Ctrl+clique pede. */
  readonly onPopOut?: (subject: PopoutSubject) => void;
  /**
   * Troca o que ESTE painel mostra, guardando de onde veio.
   *
   * Só existe dentro de um flutuante. Na lateral não pode existir: ela está presa à
   * entrada escolhida na lista, e navegá-la no lugar perderia a seleção sem aviso — a
   * lista continuaria marcando uma linha que o painel já não mostra.
   */
  readonly onNavigate?: (subject: PopoutSubject) => void;
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
  onExpand,
  reference,
  onBack,
  embedded = false,
  context,
  side,
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

  /**
   * Abre uma referência — da prosa ou de um campo.
   *
   * `novo` decide ONDE, e a regra é a mesma dos dois lugares: painel novo quando a pessoa
   * pede (Ctrl, clique do meio) ou quando não há para onde navegar — que é o caso da
   * lateral, onde `onNavigate` não existe.
   */
  /**
   * O destino leva o CONTEXTO desta entrada quando ela tem algo a dizer sobre ele: o
   * Change Shape aberto daqui, se aqui é o Anadi, abre com o texto do Anadi.
   */
  const comContexto = (destino: PopoutSubject): PopoutSubject => {
    const contexto = contextFor(entity, destino.entityType, destino.entity);
    return contexto === null ? destino : { ...destino, context: contexto };
  };

  const abrir = (uuid: string, novo: boolean): void => {
    const alvo = reference?.resolve(uuid);
    if (alvo === undefined || alvo === null) return;
    const destino = comContexto(alvo);
    const navegar = reference?.onNavigate;
    if (!novo && navegar !== undefined) navegar(destino);
    else reference?.onPopOut?.(destino);
  };

  /** O mesmo `abrir`, para quem aponta por slug. */
  const abrirSlug = (entityType: string, slug: string, novo: boolean): void => {
    const alvo = reference?.resolveSlug(entityType, slug);
    if (alvo === undefined || alvo === null) return;
    const destino = comContexto(alvo);
    const navegar = reference?.onNavigate;
    if (!novo && navegar !== undefined) navegar(destino);
    else reference?.onPopOut?.(destino);
  };

  /**
   * O NOME de uma referência que não o guarda — as magias da divindade só têm o UUID.
   * Resolvido pelo índice; sem índice, a caixinha escreve o UUID, que é feio mas honesto.
   */
  const nomeDe = (uuid: string): string | null => {
    const alvo = reference?.resolve(uuid);
    return alvo === undefined || alvo === null ? null : fieldValue(alvo.entity, 'name');
  };

  /* Só o que RESOLVE vira botão na prosa — e só o que resolve é colado. Ver `RichTextLinks`. */
  const links: RichTextLinks | undefined =
    reference === undefined
      ? undefined
      : {
          resolves: (target) => reference.resolve(target) !== null,
          open: abrir,
          embed: (target) => {
            const alvo = reference.resolve(target);
            return alvo === null ? null : { type: alvo.entityType, key: alvo.entity.key };
          },
        };
  const nodes = useMemo(
    () => (description === null ? null : pruneForReading(parseDescription(description))),
    [description],
  );

  /*
   * A DESCRIÇÃO NO CONTEXTO. `override` troca o texto pelo de quem concedeu, com um aviso
   * e o caminho de volta para o original; `add` deixa o original e acrescenta o de quem
   * concedeu embaixo, com o aviso. O original nunca some de verdade: é um clique.
   */
  const [verOriginal, setVerOriginal] = useState(false);
  const alteracao = context?.alteration;
  const blocos = useMemo(
    () =>
      alteracao === undefined ? null : pruneForReading(parseDescription(alterationHtml(alteracao))),
    [alteracao],
  );
  const substitui = alteracao?.mode === 'override' && !verOriginal;

  const letraDaRaridade = rarityLetter(fieldValue(entity, 'rarity'));

  /* A descrição com o contexto: o corpo de sempre, ou a sub-aba Detalhes com `side`. */
  const corpo = (
    <div className={styles['body']}>
      {context !== undefined && alteracao?.mode === 'override' && (
        <p className={styles['contexto']}>
          {verOriginal ? t.context.original : t.context.override(context.from)}
          <button
            type="button"
            className={styles['contextoLink']}
            onClick={() => {
              setVerOriginal((estava) => !estava);
            }}
          >
            {verOriginal ? t.context.seeFrom(context.from) : t.context.seeOriginal}
          </button>
        </p>
      )}
      {substitui ? (
        blocos !== null && (
          <div className={styles['prose']}>
            <RichText nodes={blocos} {...(links === undefined ? {} : { links })} />
          </div>
        )
      ) : nodes === null ? null : (
        <div className={styles['prose']}>
          <RichText nodes={nodes} {...(links === undefined ? {} : { links })} />
        </div>
      )}
      {context !== undefined && alteracao?.mode === 'add' && blocos !== null && (
        <>
          <p className={styles['contexto']}>{t.context.added(context.from)}</p>
          <div className={styles['prose']}>
            <RichText nodes={blocos} {...(links === undefined ? {} : { links })} />
          </div>
        </>
      )}
    </div>
  );

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
        <Actions onCollapse={onCollapse} onPopOut={onPopOut} onExpand={onExpand} onBack={onBack} />

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
              {...(reference === undefined || embedded
                ? {}
                : {
                    onToggleReference: (uuid: string) => {
                      // Clicar na que já está aberta fecha: é o mesmo gesto do tópico de
                      // filtro, e é o caminho de volta para o detalhe da perícia sozinho.
                      setAberta((atual) => (atual === uuid ? null : uuid));
                    },
                  })}
              {...(reference === undefined
                ? {}
                : { onOpenReference: abrir, onOpenSlug: abrirSlug, nameOf: nomeDe })}
            />
          ))}
        </dl>
      </header>

      {/*
       * O painel INTEIRO rola (26d, pelo autor): antes só o corpo rolava, com o cabeçalho
       * fixo, e numa janela baixa a descrição ficava espremida em poucas linhas. Com
       * `side`, o corpo é a sub-aba Detalhes — e some da tela completa (26e).
       */}
      {side === undefined ? (
        corpo
      ) : (
        <Lateral
          side={side}
          entity={entity}
          entityType={entityType}
          description={corpo}
          {...(links === undefined ? {} : { links })}
          {...(reference === undefined
            ? {}
            : { onOpenReference: abrir, onOpenSlug: abrirSlug, nameOf: nomeDe })}
        />
      )}

      {/*
        A SUB-TELA da ação escolhida — o mesmo painel, embutido.

        Não é uma cópia reduzida: é o `DetailPanel` de novo, com a barra de tradução e o
        pop-out próprios. Por isso a pessoa escolhe o que destacar — a perícia inteira (e
        troca de ação lá dentro) ou só a ação. Ele não recebe `reference`, e é o que
        impede o aninhamento infinito: uma ação dentro da ação dentro da ação.
      */}
      {alvo !== null && reference !== undefined && (
        <div className={styles['sub']}>
          <DetailPanel
            entity={alvo.entity}
            entityType={alvo.entityType}
            fields={alvo.fields}
            embedded
            /*
              A sub-tela recebe uma ponte PODADA: ela resolve e destaca, mas não navega.

              Sem ponte nenhuma, os links do texto da ação ficavam mortos — `Athletics` e
              `Broken` dentro de Force Open eram palavras marcadas que não faziam nada.
              Com a ponte inteira, um clique ali navegaria o flutuante de FORA, trocando a
              perícia pela outra entrada e levando a sub-tela junto. Só `onPopOut`, então:
              tudo que se clica aqui dentro abre janela nova.

              E `embedded` corta o `onToggleReference` mais acima — é o que garante que
              não existe sub-tela dentro de sub-tela.
            */
            reference={{
              resolve: reference.resolve,
              resolveSlug: reference.resolveSlug,
              ...(destacar ? { onPopOut: destacar } : {}),
            }}
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
  onExpand,
  onBack,
}: {
  readonly onCollapse?: (() => void) | undefined;
  readonly onPopOut?: (() => void) | undefined;
  readonly onExpand?: (() => void) | undefined;
  readonly onBack?: (() => void) | undefined;
}) {
  return (
    <div className={styles['actions']}>
      {/*
        O VOLTAR só existe quando há para onde voltar, e some quando não há.

        Aparecer desabilitado seria o padrão do resto do app (o "limpar" do filtro faz
        assim), e aqui não serve: aquele botão está sempre no mesmo lugar de uma tela que
        não muda, enquanto este vive num painel que a pessoa acabou de abrir. Um botão
        cinza permanente num painel recém-aberto sugere que falta alguma coisa.

        E ele NÃO tem par: o avançar se perde no primeiro clique depois de voltar, e quase
        ninguém o usa. Foi decisão do autor, e concordo — ver UI-PATTERNS.
      */}
      {onBack && (
        <button
          type="button"
          className={cx(styles['icon'], 'chamfer-sm')}
          aria-label={t.back}
          title={t.back}
          onClick={onBack}
        >
          ‹
        </button>
      )}
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

      {/* A TELA COMPLETA, ao lado do pop-out: os dois "tiram daqui", em direções opostas. */}
      {onExpand && (
        <button
          type="button"
          className={cx(styles['icon'], 'chamfer-sm')}
          aria-label={strings.browse.fullView.open}
          title={strings.browse.fullView.open}
          onClick={onExpand}
        >
          ⛶
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
  onOpenReference,
  onOpenSlug,
  nameOf,
}: {
  readonly spec: DetailFieldSpec;
  readonly entity: BrowseEntity;
  /** O `@UUID` da referência aberta agora, para marcá-la. */
  readonly selected?: string | null;
  /** Abre a sub-tela embaixo. SÓ perícia — ver a exceção em `spec.ts`. */
  readonly onToggleReference?: (uuid: string) => void;
  /** Abre um painel. É o que todo o resto faz. */
  readonly onOpenReference?: (uuid: string, novo: boolean) => void;
  /** Abre um painel a partir de um slug — os `links`. */
  readonly onOpenSlug?: (entityType: string, slug: string, novo: boolean) => void;
  /** O nome de uma referência que só guarda o UUID. */
  readonly nameOf?: (uuid: string) => string | null;
}) {
  const label = (field: string): string => b.fieldLabel[field] ?? field;
  const rotuloDeTraco = useTraitLabel();

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
      /* O atributo da perícia vem por extenso ("Strength"): no modo traduzido, "Força". */
      const texto = ATTRIBUTE_NAME_FIELDS.has(spec.field)
        ? attributeNameByName(value)
        : fieldText(spec.field, value);
      return <Row label={label(spec.field)}>{texto}</Row>;
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
      const list = fieldList(entity, spec.field);
      if (list.length === 0) return null;
      /* Chips que não são traços: o rótulo é o do campo, sem caixinha de glossário. */
      if (spec.plain === true) {
        return (
          <Row label={label(spec.field)}>
            <span className={styles['chips']}>
              {list.map((item) => (
                <span key={item} className={cx(styles['chip'], 'chamfer-sm')}>
                  {fieldText(spec.field, item)}
                </span>
              ))}
            </span>
          </Row>
        );
      }
      return (
        <Row label={label(spec.field)}>
          <span className={styles['chips']}>
            {/*
              Todo chip passa pelo glossário, e não só os do campo `traits`: `arcane` numa
              tradição É o traço arcano, e a explicação vale. Quem não está no glossário —
              uma perícia, um grupo — sai como o `<span>` que sempre foi.
            */}
            {list.map((item) => (
              <TraitChip
                key={item}
                slug={item}
                className={cx(styles['chip'], 'chamfer-sm')}
                focusable
              >
                {rotuloDeTraco(item)}
              </TraitChip>
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
      const destreinadas = referenciasDe(entity, spec.field);
      const treinadas = referenciasDe(entity, spec.trained);
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

    /*
     * A MESMA ponte de `actions`, com uma lista só: o talento que um antecedente concede.
     * Clicar abre o talento na sub-tela, e ele é a entrada que já existe em Talentos.
     */
    case 'references': {
      const lista = referenciasDe(entity, spec.field);
      if (lista.length === 0) return null;
      /*
       * ABRE PAINEL, e não sub-tela. É a regra geral do aplicativo: o que se clica no
       * detalhe vira painel. A sub-tela de `actions` é a exceção, e só existe porque
       * perícia não tem texto próprio para ocupar o lugar dela — ver `spec.ts`.
       */
      return (
        <Row label={label(spec.field)}>
          <Referencias
            acoes={lista}
            aberta={null}
            onAbrir={onOpenReference}
            {...(nameOf === undefined ? {} : { nameOf })}
          />
        </Row>
      );
    }

    /*
     * A ponte por SLUG: os domínios de uma divindade, a perícia divina, a arma favorita.
     * Cada slug vira um botão que abre a entrada daquele tipo — quando ela existe. Os que
     * não resolvem (`void`, `wyrmkin`, `delirium` não têm página) saem como texto.
     */
    case 'links': {
      const slugs = readList(entity, spec.field);
      if (slugs.length === 0) return null;
      return (
        <Row label={label(spec.field)}>
          <Ligacoes
            slugs={slugs}
            entityType={spec.entityType}
            {...(onOpenSlug === undefined ? {} : { onAbrir: onOpenSlug })}
          />
        </Row>
      );
    }

    /*
     * `Strength ou Dexterity`, ou `Livre` onde a fonte diz que é. Ver `boostsText`. Com
     * alternativas (a classe), o "outro" ganha nome embaixo: cada atributo que a subclasse
     * abre, com as habilidades que o abrem como caixinhas que abrem a habilidade — o
     * Ruffian é uma entrada de Habilidades, e o que se clica abre painel.
     */
    /*
     * O "outro" fica só como palavra (26g, pelo autor): a lista de quem abre cada atributo
     * (Ruffian, Scoundrel…) foi tentada embaixo e saiu — a facção é escolha da ficha, e a
     * consulta só precisa saber que existe. O dado continua em `keyAbilityOptions`.
     */
    case 'boosts': {
      const valor = boostsText(entity, spec.field, spec);
      if (valor === '') return null;
      return <Row label={label(spec.field)}>{valor}</Row>;
    }

    /* "Stealth · outro · +7": as fixas, o que a subclasse treina, e as à escolha. */
    case 'skills': {
      const fixas = fieldList(entity, spec.field);
      const outra = fieldValue(entity, spec.other) === 'true';
      const extra = Number(fieldValue(entity, spec.extra));
      if (fixas.length === 0 && !outra && !(extra > 0)) return null;
      return (
        <Row label={label('classSkills')}>
          <span className={styles['chips']}>
            {fixas.map((item) => (
              <span key={item} className={cx(styles['chip'], 'chamfer-sm')}>
                {fieldText(spec.field, item)}
              </span>
            ))}
            {outra && (
              <span className={cx(styles['chip'], styles['chipApagado'], 'chamfer-sm')}>
                {b.background.other}
              </span>
            )}
            {extra > 0 && (
              <span className={cx(styles['chip'], 'chamfer-sm')}>
                {b.background.moreSkills(String(extra))}
              </span>
            )}
          </span>
        </Row>
      );
    }

    /*
     * As PROFICIÊNCIAS agrupadas pelo rank, do maior para o menor, uma linha por rank: a
     * caixinha diz o rank e depois vem o que se é nele — "Especialista: Vontade" em cima
     * de "Treinado: Fortitude, Reflexos". É como o livro escreve ("Trained in Fortitude…
     * Expert in Will"), e não ao contrário, que era como saía antes (o autor, 26b).
     * Rank 0 não aparece: o livro só lista o que se é. Um número solto (a percepção) é
     * uma caixinha sem lista. O `other` dos ataques é um objeto com nome.
     */
    case 'ranks': {
      const grupos = ranks(entity, spec.field);
      if (grupos.length === 0) return null;
      return (
        <Row label={label(spec.field)}>
          {grupos.map((grupo) => (
            <span key={grupo.rank} className={styles['rank']}>
              <span className={cx(styles['chip'], 'chamfer-sm')}>
                {rankLabel(String(grupo.rank))}
              </span>
              {grupo.names.length > 0 && <span>{grupo.names.join(', ')}</span>}
            </span>
          ))}
        </Row>
      );
    }

    /* Terra sozinho — é o padrão —, o resto com o tipo ao lado: "5 pés · 25 pés nado". */
    case 'speeds': {
      const lista = speeds(entity, spec.field);
      if (lista.length === 0) return null;
      const texto = lista
        .map(
          (s) =>
            b.ancestry.feet(String(s.value)) +
            (s.type === 'land' ? '' : ` ${b.ancestry.speedType[s.type] ?? s.type}`),
        )
        .join(' · ');
      return <Row label={label(spec.field)}>{texto}</Row>;
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

/**
 * As SUB-ABAS da lateral (26d): uma barra como a das abas de cima, e embaixo ou mais
 * campos (`fields`, com os mesmos desenhistas do painel) ou uma tabela de `desc/`
 * (`table`, a progressão da classe com as habilidades clicáveis). A de tabela some
 * quando o campo é vazio — 17 classes não têm magias por dia — e por isso as tabelas
 * são lidas ANTES de desenhar a barra, numa leitura só.
 */
/**
 * A sub-aba escolhida, por TIPO de entrada, enquanto o app está aberto (28, pelo autor):
 * quem estava em Proficiências no Druid vê Proficiências no Rogue, e ao voltar da tela
 * completa. Memória de módulo, não preferência: some com o recarregamento, como a
 * rolagem da aba de texto.
 */
const ultimaSubAba = new Map<string, string>();

function Lateral({
  side,
  entity,
  entityType,
  description,
  links,
  onOpenReference,
  onOpenSlug,
  nameOf,
}: {
  readonly side: SideSpec;
  readonly entity: BrowseEntity;
  readonly entityType: string;
  /** O corpo da descrição, pronto: é o que a sub-aba `description` mostra. */
  readonly description: React.ReactNode;
  readonly links?: RichTextLinks;
  readonly onOpenReference?: (uuid: string, novo: boolean) => void;
  readonly onOpenSlug?: (entityType: string, slug: string, novo: boolean) => void;
  readonly nameOf?: (uuid: string) => string | null;
}) {
  const camposDeTabela = useMemo(
    () => side.tabs.flatMap((tab) => (tab.kind === 'table' ? [tab.field] : [])),
    [side.tabs],
  );
  const tabelas = useDescriptionFields(entityType, entity.key, camposDeTabela);
  const abas = side.tabs.filter(
    (tab) => tab.kind !== 'table' || (tabelas !== null && tabelas[tab.field] !== ''),
  );
  const [abaId, setAbaId] = useState(() => ultimaSubAba.get(entityType) ?? side.tabs[0]?.id ?? '');
  /* A lembrada pode não existir aqui (Detalhes some na tela completa; Magias, em 17): cai na primeira. */
  const aba = abas.find((tab) => tab.id === abaId) ?? abas[0];
  const html = aba?.kind === 'table' ? (tabelas?.[aba.field] ?? '') : '';
  const nodes = useMemo(
    () => (html === '' ? null : pruneForReading(parseDescription(html))),
    [html],
  );
  if (aba === undefined) return null;

  return (
    <div className={styles['lateral']}>
      <ScrollRail className={styles['subAbasTrilho']} label={b.fullView.sideTabsLabel}>
        <nav className={styles['subAbas']} role="tablist">
          {abas.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={tab.id === aba.id}
              className={cx(
                styles['subAba'],
                tab.id === aba.id && styles['subAbaAtiva'],
                'chamfer-sm',
              )}
              onClick={() => {
                setAbaId(tab.id);
                ultimaSubAba.set(entityType, tab.id);
              }}
            >
              {b.fullView.side[tab.id] ?? tab.id}
            </button>
          ))}
        </nav>
      </ScrollRail>
      {aba.kind === 'description' && description}
      {aba.kind === 'fields' && (
        <dl className={cx(styles['fields'], styles['lateralCampos'])}>
          {aba.fields.map((spec, index) => (
            <Field
              key={index}
              spec={spec}
              entity={entity}
              selected={null}
              {...(onOpenReference === undefined ? {} : { onOpenReference })}
              {...(onOpenSlug === undefined ? {} : { onOpenSlug })}
              {...(nameOf === undefined ? {} : { nameOf })}
            />
          ))}
        </dl>
      )}
      {aba.kind === 'table' && nodes !== null && (
        <div className={cx(styles['prose'], styles['lateralTabela'])}>
          <RichText nodes={nodes} {...(links === undefined ? {} : { links })} />
        </div>
      )}
    </div>
  );
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

/**
 * Os valores de um campo de lista — ou o valor ÚNICO de um campo de texto, como lista de
 * um. É o que faz a ponte por slug valer para `class` do arquétipo (uma string), e não
 * só para `domains` da divindade (uma lista): sem isto, o "Fighter" do arquétipo
 * multiclasse nunca virava botão (28).
 */
function readList(entity: BrowseEntity, field: string): string[] {
  const base = entity.base;
  if (!isRecord(base)) return [];
  const value = base[field];
  if (typeof value === 'string') return value === '' ? [] : [value];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

const s = strings.browse.skill;

/** `{fortitude: 1, will: 2, other: {name, rank}}` → `['Fortitude Treinado', …]`, sem os zero. */
/**
 * As proficiências de um campo AGRUPADAS por rank, do maior para o menor: `{fortitude: 1,
 * reflex: 1, will: 2}` → `[{2, ['Vontade']}, {1, ['Fortitude', 'Reflexos']}]`. Um número
 * solto (a percepção) vira um grupo sem nomes. Rank 0 fica de fora.
 */
function ranks(
  entity: BrowseEntity,
  field: string,
): readonly { rank: number; names: readonly string[] }[] {
  const base = entity.base;
  if (!isRecord(base)) return [];
  const valor = base[field];
  if (typeof valor === 'number') return valor > 0 ? [{ rank: valor, names: [] }] : [];
  if (!isRecord(valor)) return [];
  const porRank = new Map<number, string[]>();
  const anotar = (rank: number, nome: string): void => {
    if (rank <= 0) return;
    const lista = porRank.get(rank);
    if (lista === undefined) porRank.set(rank, [nome]);
    else lista.push(nome);
  };
  for (const [chave, item] of Object.entries(valor)) {
    if (typeof item === 'number') {
      anotar(item, b.ancestry.proficiency[chave] ?? capitalizar(chave));
    } else if (isRecord(item) && typeof item['rank'] === 'number') {
      const nome = typeof item['name'] === 'string' && item['name'] !== '' ? item['name'] : chave;
      anotar(item['rank'], nome);
    }
  }
  return [...porRank.entries()].sort(([a], [c]) => c - a).map(([rank, names]) => ({ rank, names }));
}

/** `[{type, value}]` de um campo de deslocamentos, tolerando o que não tiver a forma. */
function speeds(entity: BrowseEntity, field: string): readonly { type: string; value: number }[] {
  const base = entity.base;
  if (!isRecord(base) || !Array.isArray(base[field])) return [];
  return (base[field] as unknown[]).flatMap((item) =>
    isRecord(item) && typeof item['type'] === 'string' && typeof item['value'] === 'number'
      ? [{ type: item['type'], value: item['value'] }]
      : [],
  );
}

/** Os blocos de uma alteração como UM HTML: título vira `<h3>`, divisor vira `<hr>`. */
function alterationHtml(alteration: DescriptionAlteration): string {
  return alteration.blocks
    .map(
      (block) =>
        `${block.divider === true ? '<hr />' : ''}${
          block.title === undefined ? '' : `<h3>${block.title}</h3>`
        }${block.text}`,
    )
    .join('');
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
  nameOf,
}: {
  readonly acoes: readonly Reference[];
  /** O que está aberto na sub-tela, ou `null` quando o clique abre painel. */
  readonly aberta: string | null;
  readonly onAbrir: ((uuid: string, novo: boolean) => void) | undefined;
  readonly nameOf?: (uuid: string) => string | null;
}) {
  /*
   * O texto da caixinha: o ranque na frente quando há (`1º Heal`), e o nome resolvido pelo
   * índice quando a fonte não o guarda. As magias da divindade são o caso: só o UUID.
   */
  const rotulo = (acao: Reference): string => {
    const nome = acao.name !== '' ? acao.name : (nameOf?.(acao.uuid) ?? acao.uuid);
    return acao.rank === undefined ? nome : `${String(acao.rank)}º ${nome}`;
  };
  return (
    <span className={styles['referencias']}>
      {acoes.map((acao) => {
        if (onAbrir === undefined) {
          return (
            <span key={acao.uuid} className={styles['referencia']}>
              {rotulo(acao)}
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
            onClick={(event) => {
              onAbrir(acao.uuid, event.ctrlKey || event.metaKey);
            }}
            onAuxClick={(event) => {
              if (event.button === 1) {
                event.preventDefault();
                onAbrir(acao.uuid, true);
              }
            }}
          >
            {rotulo(acao)}
          </button>
        );
      })}
    </span>
  );
}

/**
 * As LIGAÇÕES por slug, como botões — e como texto quando não há para onde ir.
 *
 * Mesmo desenho das referências, porque para quem lê é a mesma coisa: um nome que abre a
 * entrada. A diferença é só de onde vem o ponteiro (campo, e não `@UUID`).
 */
function Ligacoes({
  slugs,
  entityType,
  onAbrir,
}: {
  readonly slugs: readonly string[];
  readonly entityType: string;
  readonly onAbrir?: (entityType: string, slug: string, novo: boolean) => void;
}) {
  return (
    <span className={styles['referencias']}>
      {slugs.map((slug) =>
        onAbrir === undefined ? (
          <span key={slug} className={styles['referencia']}>
            {capitalizar(slug)}
          </span>
        ) : (
          <button
            key={slug}
            type="button"
            className={cx(styles['referencia'], styles['referenciaAtiva'])}
            onClick={(event) => {
              onAbrir(entityType, slug, event.ctrlKey || event.metaKey);
            }}
            onAuxClick={(event) => {
              if (event.button === 1) {
                event.preventDefault();
                onAbrir(entityType, slug, true);
              }
            }}
          >
            {capitalizar(slug)}
          </button>
        ),
      )}
    </span>
  );
}
