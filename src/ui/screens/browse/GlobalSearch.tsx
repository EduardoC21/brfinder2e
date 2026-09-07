import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';

import { fieldList, fieldValue, fitTraits, rarityLetter, traitSpace } from '@core/browse/index';
import { strings } from '@i18n/index';
import { RarityMark } from '@ui/components/RarityMark';
import { ScrollRail } from '@ui/components/ScrollRail';
import { SearchInput } from '@ui/components/SearchInput';
import { cx } from '@ui/cx';
import type { LoadedSource } from '@ui/hooks/useAllBases';
import type { GlobalIndex, GlobalRow } from '@ui/hooks/useGlobalIndex';
import { useTrackWidth } from '@ui/hooks/useTrackWidth';
import { useWindowedRows } from '@ui/hooks/useWindowedRows';
import { capitalizar } from '@ui/text';

import type { PopoutSubject } from './popouts';
import styles from './GlobalSearch.module.css';

const t = strings.browse.palette;

/** Espelha `--row-height`, pelo mesmo motivo do janelamento da lista. Ver `ResultList`. */
const ALTURA_DA_LINHA = 34;

/** Quanto da linha o rótulo da fonte reserva à direita, antes de sobrar espaço para traços. */
const RESERVA_DA_FONTE = 96;

interface GlobalSearchProps {
  readonly onClose: () => void;
  readonly onOpenEntry: (subject: PopoutSubject) => void;
  /** Os dois índices, montados ACIMA — ver a nota no corpo do componente. */
  readonly index: GlobalIndex;
  readonly sources: readonly LoadedSource[];
  readonly loading: boolean;
  readonly inText: boolean;
  readonly onInText: (valor: boolean) => void;
}

/**
 * A busca global: uma paleta por cima de tudo, com Ctrl+Q.
 *
 * ⚠️ De CIMA para BAIXO — campo em cima, resultados embaixo —, e não o contrário. O
 * Quick Insert do Foundry cresce para cima porque está ancorado na barra de ferramentas do
 * rodapé; esta flutua no alto da janela, como a do Opera e a de qualquer paleta de comando.
 * E, mais importante, é a MESMA direção da tela de consulta, onde o campo já fica acima da
 * lista: duas buscas com direções opostas no mesmo aplicativo obrigariam a reaprender.
 *
 * A lista é JANELADA pelo mesmo `useWindowedRows` da tela de consulta — com 9.087 entradas,
 * um termo curto casa com centenas, e desenhar todas custaria o mesmo travamento que a
 * Etapa 9 tirou da lista principal.
 *
 * ⚠️ Este componente só existe ENQUANTO a paleta está aberta, e os índices moram ACIMA
 * dele, na tela. É a divisão que resolve duas exigências opostas:
 *
 *   o DOM tem de nascer na abertura   — `useTrackWidth` mede em `useLayoutEffect`, e um
 *                                       componente que se desenha como `null` mede um nó
 *                                       que não existe. Era isso que deixava o orçamento
 *                                       de traços em zero e escondia todos atrás de `+N`.
 *   o ÍNDICE não pode nascer de novo  — remontar custaria uma leitura do IndexedDB e, com
 *                                       a busca por descrição ligada, 794 ms a cada Ctrl+Q.
 */
export function GlobalSearch({
  onClose,
  onOpenEntry,
  index: indice,
  sources: carregadas,
  loading,
  inText: naDescricao,
  onInText,
}: GlobalSearchProps) {
  const [termo, setTermo] = useState('');
  const [fonte, setFonte] = useState<string | null>(null);
  const [ativo, setAtivo] = useState(0);

  /*
   * O termo que a LISTA usa é adiado; o campo desenha a letra nova no mesmo quadro.
   *
   * Não é um temporizador: nada espera um tempo fixo, e o resultado nunca fica "atrasado"
   * — o React só dá prioridade menor ao trabalho da lista, e se outra tecla chegar antes
   * dele terminar, abandona o resultado velho. Um `debounce` de 150 ms daria a MESMA
   * sensação de leveza cobrando 150 ms de todo mundo, inclusive de quem digitou devagar.
   *
   * É o mesmo recurso que a busca da tela de consulta usa desde a Etapa 5.
   */
  const termoAdiado = useDeferredValue(termo);

  const campo = useRef<HTMLInputElement>(null);
  const lista = useRef<HTMLDivElement>(null);
  const trilha = useRef<HTMLDivElement>(null);
  const larguraDaLinha = useTrackWidth(trilha);

  /* Fechar zera a busca de graça: o componente desmonta, e o termo vai junto. */
  /*
   * Campo vazio, lista vazia — e não as 9.087 entradas.
   *
   * Uma paleta que começa cheia gasta o trabalho de desenhar uma lista que ninguém pediu:
   * quem aperta Ctrl+Q já sabe o que quer, e o que ele quer não está nas primeiras
   * quarenta linhas do alfabeto. Aqui a tela vazia é a resposta certa, e o rodapé diz o
   * que fazer.
   */
  const resultados = useMemo(() => {
    if (termoAdiado.trim() === '') return VAZIO_LINHAS;

    const escolhido = naDescricao ? indice.byText : indice.byName;
    if (escolhido === null) return VAZIO_LINHAS;

    const doFiltro = (row: GlobalRow): boolean => fonte === null || row.source.id === fonte;
    return escolhido
      .search(termoAdiado)
      .map((id) => indice.byId.get(id))
      .filter((row): row is GlobalRow => row !== undefined && doFiltro(row));
  }, [termoAdiado, fonte, naDescricao, indice]);

  /* O índice ativo nunca aponta para fora: filtrar encurta a lista sob os pés da seleção. */
  const selecionado = Math.min(ativo, Math.max(resultados.length - 1, 0));

  /* O foco vai para o campo ao abrir: a paleta existe para receber o que se digita. */
  useEffect(() => {
    campo.current?.focus();
  }, []);

  useEffect(() => {
    const node = lista.current?.querySelector(`[data-indice="${String(selecionado)}"]`);
    if (node instanceof HTMLElement) node.scrollIntoView({ block: 'nearest' });
  }, [selecionado]);

  const janela = useWindowedRows(lista, resultados.length, ALTURA_DA_LINHA);
  const visiveis = resultados.slice(janela.start, janela.end);

  const abrir = (row: GlobalRow | undefined): void => {
    if (row === undefined) return;
    onOpenEntry({
      entity: row.entity,
      entityType: row.source.entityType ?? '',
      fields: row.source.detail,
    });
    onClose();
  };

  const noTeclado = (event: React.KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (resultados.length === 0) return;
      const passo = event.key === 'ArrowDown' ? 1 : -1;
      const proximo = selecionado + passo;
      setAtivo(proximo < 0 ? resultados.length - 1 : proximo >= resultados.length ? 0 : proximo);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      abrir(resultados[selecionado]);
    }
  };

  return (
    /*
     * O fundo é um ELEMENTO, e não um ouvinte no documento.
     *
     * Com ouvinte, o mesmo clique que abriu a paleta chega ao documento e a fecha no
     * quadro seguinte — a corrida clássica. Um elemento por baixo recebe só os cliques que
     * caem fora do painel, e `stopPropagation` no painel resolve o resto.
     */
    <div
      className={styles['fundo']}
      role="presentation"
      onMouseDown={onClose}
      onKeyDown={noTeclado}
    >
      <div
        className={cx(styles['painel'], 'chamfer-lg')}
        role="dialog"
        aria-modal="true"
        aria-label={t.label}
        onMouseDown={(event) => {
          event.stopPropagation();
        }}
      >
        <div className={styles['topo']}>
          <SearchInput
            ref={campo}
            className={styles['campo']}
            label={t.label}
            placeholder={naDescricao ? t.placeholderText : t.placeholder}
            value={termo}
            size="lg"
            onChange={(proximo) => {
              setTermo(proximo);
              setAtivo(0);
            }}
          />
          {/*
            O par nome/descrição é um interruptor de dois botões, como o E/OU dos traços:
            são duas opções, sempre as mesmas, e escondê-las atrás de um menu tiraria da
            vista a diferença entre 12 resultados e 2.580.
          */}
          <div className={styles['modo']} role="radiogroup" aria-label={t.modeLabel}>
            {[false, true].map((modo) => (
              <button
                key={String(modo)}
                type="button"
                role="radio"
                aria-checked={naDescricao === modo}
                className={cx(styles['modoOpcao'], naDescricao === modo && styles['modoOn'])}
                onClick={() => {
                  onInText(modo);
                  setAtivo(0);
                }}
              >
                {modo ? t.inText : t.inName}
              </button>
            ))}
          </div>
        </div>

        <ScrollRail className={styles['fontes']} label={strings.browse.sourcesLabel}>
          <FonteChip
            rotulo={t.allSources}
            ligada={fonte === null}
            onClick={() => {
              setFonte(null);
              setAtivo(0);
            }}
          />
          {carregadas.map(({ source }) => (
            <FonteChip
              key={source.id}
              rotulo={strings.sources[source.id] ?? source.id}
              ligada={fonte === source.id}
              onClick={() => {
                setFonte(fonte === source.id ? null : source.id);
                setAtivo(0);
              }}
            />
          ))}
        </ScrollRail>

        <div className={styles['corpo']} ref={lista} role="listbox" aria-label={t.label}>
          <div ref={trilha} className={styles['medida']} aria-hidden="true" />

          {indice.buildingText ? (
            <p className={styles['aviso']}>{t.building}</p>
          ) : resultados.length === 0 ? (
            <p className={styles['aviso']}>
              {loading ? t.loading : termo.trim() === '' ? t.empty : strings.browse.noResults}
            </p>
          ) : (
            <>
              {janela.before > 0 && <div style={{ height: `${String(janela.before)}px` }} />}
              {visiveis.map((row, offset) => {
                const indiceReal = janela.start + offset;
                return (
                  <Linha
                    key={row.id}
                    row={row}
                    indice={indiceReal}
                    ativa={indiceReal === selecionado}
                    largura={larguraDaLinha}
                    onEscolher={() => {
                      abrir(row);
                    }}
                    onApontar={() => {
                      setAtivo(indiceReal);
                    }}
                  />
                );
              })}
              {janela.after > 0 && <div style={{ height: `${String(janela.after)}px` }} />}
            </>
          )}
        </div>

        <p className={styles['rodape']}>
          {termo.trim() === '' ? t.total(indice.rows.length) : t.hint(resultados.length)}
        </p>
      </div>
    </div>
  );
}

const VAZIO_LINHAS: readonly GlobalRow[] = [];

function FonteChip({
  rotulo,
  ligada,
  onClick,
}: {
  readonly rotulo: string;
  readonly ligada: boolean;
  readonly onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={ligada}
      className={cx(styles['fonte'], 'chamfer-sm', ligada && styles['fonteOn'])}
      onClick={onClick}
    >
      {rotulo}
    </button>
  );
}

/**
 * A linha da paleta, com a MESMA gramática da lista de consulta: calha do nível, nome,
 * etiqueta de raridade e traços colados — e, na outra ponta, de que fonte aquilo veio.
 *
 * Os dados fixos saem do descritor da fonte de CADA linha, e não de um só: uma condição
 * não tem nível nem traço, e uma magia tem posto onde o talento tem nível.
 */
function Linha({
  row,
  indice,
  ativa,
  largura,
  onEscolher,
  onApontar,
}: {
  readonly row: GlobalRow;
  readonly indice: number;
  readonly ativa: boolean;
  readonly largura: number;
  readonly onEscolher: () => void;
  readonly onApontar: () => void;
}) {
  const { source, entity } = row;
  const nome = fieldValue(entity, 'name');
  const nivel = source.special.level === null ? null : fieldValue(entity, source.special.level);
  const raridade =
    source.special.rarity === null ? null : fieldValue(entity, source.special.rarity);
  const letra = raridade === null ? null : rarityLetter(raridade);

  const traços =
    source.special.traits === null
      ? null
      : fitTraits(
          fieldList(entity, source.special.traits),
          traitSpace(Math.max(largura - RESERVA_DA_FONTE, 0), nome, letra !== null),
        );

  return (
    <div
      className={cx(styles['linha'], ativa && styles['linhaAtiva'])}
      data-indice={indice}
      role="option"
      aria-selected={ativa}
      onMouseMove={onApontar}
      onMouseDown={(event) => {
        event.preventDefault();
        onEscolher();
      }}
    >
      <span className={styles['nivel']}>{nivel === null || nivel === '' ? '' : nivel}</span>
      <span className={styles['nome']}>{nome}</span>
      {letra !== null && raridade !== null && (
        <RarityMark letter={letra} label={strings.browse.rarity[raridade] ?? raridade} />
      )}
      {traços !== null && (
        <span className={styles['tracos']}>
          {traços.shown.map((trait) => (
            <span key={trait} className={styles['chip']}>
              {capitalizar(trait)}
            </span>
          ))}
          {traços.hidden > 0 && <span className={styles['chip']}>+{traços.hidden}</span>}
        </span>
      )}
      <span className={styles['fonteDaLinha']}>{strings.sources[source.id] ?? source.id}</span>
    </div>
  );
}
