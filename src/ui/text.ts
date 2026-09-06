/**
 * Ajustes de TEXTO para exibição. Não traduzem — o idioma mora em `@i18n`.
 *
 * Vivem aqui, e não dentro de uma tela, porque lista, filtro e detalhe precisam desenhar o
 * mesmo valor do mesmo jeito. Duas cópias divergiriam no primeiro caso especial.
 */

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
