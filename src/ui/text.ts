/**
 * Ajustes de TEXTO para exibição. Não traduzem — o idioma mora em `@i18n`.
 *
 * Vivem aqui, e não dentro de uma tela, porque lista, filtro e detalhe precisam desenhar o
 * mesmo valor do mesmo jeito. Duas cópias divergiriam no primeiro caso especial.
 */

import { strings } from '@i18n/index';

/** `offensive` vira `Offensive`. O dado vem em minúscula; a tela mostra etiqueta. */
export function capitalizar(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Os prefixos redundantes de um nome de livro, na ordem em que se descascam.
 *
 * "Pathfinder" é redundante num app que só tem Pathfinder, e estava na frente de 95 dos 98
 * livros dos talentos. "Lost Omens" e "Adventure Path" são linha de produto, não nome — o
 * que a pessoa procura é `Highhelm`, não `Pathfinder Lost Omens Highhelm`.
 */
const PREFIXOS = ['Pathfinder', 'Adventure Path', 'Adventure', 'Lost Omens'];

/**
 * O nome de um livro sem os prefixos de linha de produto.
 *
 * Descasca em laço porque eles se empilham: `Pathfinder Lost Omens Highhelm` tem dois, e
 * `Pathfinder Lost Omens Pathfinder Society Guide` tem três. Aceita espaço OU dois-pontos
 * depois do prefixo — sem isso, `Pathfinder Adventure Path: Gatewalkers` virava
 * `Path: Gatewalkers`, que é pior que o original.
 *
 * Medido nos 127 títulos das quatro fontes já normalizadas: 127 nomes distintos entram,
 * 127 saem. NENHUMA colisão — nenhum livro passa a se confundir com outro.
 *
 * Devolve o título inteiro se a máscara o esvaziaria: um livro chamado só `Pathfinder`
 * viraria uma opção em branco.
 */
export function bookLabel(title: string): string {
  let nome = title;
  let mudou = true;
  while (mudou) {
    mudou = false;
    for (const prefixo of PREFIXOS) {
      if (nome.startsWith(`${prefixo} `) || nome.startsWith(`${prefixo}: `)) {
        nome = nome.slice(prefixo.length).replace(/^[:\s]+/, '');
        mudou = true;
        break;
      }
    }
  }
  return nome === '' ? title : nome;
}

/**
 * As aventuras numeradas vão para o FIM da lista.
 *
 * São 48 dos 127 títulos, todas `#146: Cult of Cinders` e afins. Ordenadas pelo alfabeto
 * elas ocupam o topo inteiro — `#` vem antes de qualquer letra — e empurram para baixo os
 * livros de regra, que é o que quase todo mundo procura.
 */
export function isNumberedAdventure(label: string): boolean {
  return label.startsWith('#');
}

/**
 * O campo do livro. Escrito uma vez porque lista, filtro e detalhe precisam reconhecê-lo
 * para aplicar a máscara — e um deles esquecido faria os três discordarem.
 */
export const BOOK_FIELD = 'source.title';

/**
 * O texto de um campo, pronto para a tela: livro descascado, o resto capitalizado.
 *
 * Uma função só, usada pela coluna e pelo detalhe. O filtro passa por `valueLabel`, que a
 * chama por dentro depois de tratar as espécies que têm tradução própria.
 */
export function fieldText(field: string, value: string): string {
  return field === BOOK_FIELD ? bookLabel(value) : capitalizar(value);
}

/** Quanto vale cada moeda em cobre, da maior para a menor. Espelha `EM_COBRE` na receita. */
/** As quatro moedas, e só elas: `none` e `per` também moram na tabela, e não são moeda. */
type Moeda = 'pl' | 'po' | 'pp' | 'pc';

const MOEDAS: readonly (readonly [Moeda, number])[] = [
  ['pl', 1000],
  ['po', 100],
  ['pp', 10],
  ['pc', 1],
];

const MOEDA_ROTULO = strings.browse.price;

/**
 * `250` → `2 PO, 5 PP`.
 *
 * A receita guarda o preço em COBRE porque número ordena e faixa filtra; aqui ele volta a
 * ser moeda, que é como se lê. Decompõe da maior para a menor e mostra só o que não é
 * zero — `3000` é `30 PO`, e não `0 PL, 30 PO, 0 PP, 0 PC`.
 */
export function priceText(copper: number): string {
  if (!Number.isFinite(copper) || copper <= 0) return '';
  let resto = Math.round(copper);
  const partes: string[] = [];
  for (const [moeda, fator] of MOEDAS) {
    const quantas = Math.floor(resto / fator);
    if (quantas > 0) {
      partes.push(`${quantas.toLocaleString('pt-BR')} ${MOEDA_ROTULO[moeda]}`);
      resto -= quantas * fator;
    }
  }
  return partes.join(', ');
}

/**
 * `0` → nada, `0.1` → `L`, `2` → `2`.
 *
 * O "L" é do livro: um item leve tem Volume L, que não é 0,1 de nada — a fração existe só
 * para o dado poder somar dez leves num Volume 1. Mostrar `0,1` seria mostrar a conta em
 * vez do valor.
 */
export function bulkText(bulk: number): string {
  if (!Number.isFinite(bulk) || bulk <= 0) return '';
  if (bulk < 1) return strings.browse.bulk.light;
  return bulk.toLocaleString('pt-BR');
}
