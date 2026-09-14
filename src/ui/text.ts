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
/*
 * O MODO DOS TERMOS (Etapa 33): "original" mostra o dado de jogo em inglês, como sempre;
 * "translated" põe os termos da comunidade (`browse.terms`) no lugar — perícias,
 * atributos, tradições, tipos de dano, categorias e grupos. É a preferência de
 * visualização, lida uma vez por render da tela de consulta (`setTermMode`), e não um
 * hook: `fieldText` é chamada em dezenas de lugares sem React por perto. A tela remonta a
 * lista quando o modo muda, para nada ficar com o texto velho.
 */
let termMode: 'original' | 'translated' = 'original';

export function setTermMode(mode: 'original' | 'translated'): void {
  termMode = mode;
}

export function isTranslatedMode(): boolean {
  return termMode === 'translated';
}

/**
 * A TABELA DE NOMES (Etapa 36): com a preferência "nomes traduzidos", a tela de consulta
 * põe aqui os nomes do pacote da comunidade por tipo, e `displayName` devolve o nome em
 * português — ou o original, quando o pacote não o tem. Mesmo arranjo do modo dos termos:
 * lida no render da tela, sem hook, porque a linha da lista, o título da lateral e o
 * flutuante desenham o nome sem React por perto para a preferência.
 */
type NameTable = Readonly<Record<string, Readonly<Record<string, string>>>>;
let nameTable: NameTable = {};
let showTranslatedNames = false;

/** A tabela do pacote (sempre), e se a preferência manda mostrar os nomes por ela. */
export function setNameTable(table: NameTable, show: boolean): void {
  nameTable = table;
  showTranslatedNames = show;
}

/** O nome em português do pacote, ou nulo — independente da preferência (Etapa 39). */
export function translatedName(entityType: string | null, name: string): string | null {
  if (entityType === null) return null;
  return nameTable[entityType]?.[name] ?? null;
}

/** O nome como a preferência manda: o do pacote se houver e se for para mostrá-lo. */
export function displayName(entityType: string | null, name: string): string {
  if (!showTranslatedNames) return name;
  return translatedName(entityType, name) ?? name;
}

/**
 * O rótulo de um link na PROSA TRADUZIDA (Etapa 39, pelo autor: "se o texto está
 * traduzido, a referência deve estar traduzida também"). O rótulo que é o nome do alvo
 * vira o nome em português; "Enfeebled 2" vira "Enfraquecido 2"; o que não é o nome
 * (um rótulo próprio, um plural) fica como a tradução o deixou.
 */
export function translatedLabel(entityType: string | null, name: string, label: string): string {
  const nome = translatedName(entityType, name);
  if (nome === null) return label;
  if (label === name) return nome;
  const sufixo = /^(.*\S)\s+(\d+)$/.exec(label);
  if (sufixo !== null && sufixo[1] === name) return `${nome} ${sufixo[2] ?? ''}`;
  return label;
}

const SKILL_FIELDS: ReadonlySet<string> = new Set(['skills', 'divineSkill']);
const TERM_VALUE_FIELDS: ReadonlySet<string> = new Set([
  'category',
  'group',
  'sector',
  'weaponType',
  'kind',
]);

/** O termo em português para o valor deste campo, ou nulo no modo original / sem termo. */
function termFor(field: string, value: string): string | null {
  if (termMode !== 'translated') return null;
  const terms = strings.browse.terms;
  if (SKILL_FIELDS.has(field)) return terms.skills[value.toLowerCase()] ?? null;
  if (field === 'traditions') return terms.traditions[value] ?? null;
  if (field === 'damageType') return terms.damage[value] ?? null;
  if (TERM_VALUE_FIELDS.has(field)) return terms.values[value] ?? null;
  return null;
}

export function fieldText(field: string, value: string): string {
  const termo = termFor(field, value);
  if (termo !== null) return termo;
  if (field === BOOK_FIELD) return bookLabel(value);
  if (field === SANCTIFICATION_FIELD) return sanctificationLabel(value);
  if (field === SIZE_FIELD || field === SIZES_FIELD)
    return strings.browse.ancestry.size[value] ?? capitalizar(value);
  if (field === SWIM_FIELD) return strings.browse.ancestry.feet(value);
  if (field === VISION_FIELD) return strings.browse.ancestry.vision[value] ?? capitalizar(value);
  if (field === SPEED_FIELD) return strings.browse.ancestry.feet(value);
  if (field === EXTRA_LANGUAGES_FIELD)
    return strings.browse.ancestry.extraLanguages[value] ?? value;
  if (field === CATEGORY_FIELD)
    return strings.browse.ancestry.category[value] ?? capitalizar(value);
  /*
   * `kind` é o Tipo de várias fontes. Só o da ancestralidade tem rótulo em português
   * (`ancestry`, `versatile` são códigos nossos); os das outras (`deity`, `master`) são
   * dado em inglês e continuam capitalizados — OPEN-DECISIONS #10.
   */
  if (field === KIND_FIELD) return strings.browse.ancestry.kind[value] ?? capitalizar(value);
  /* A classe: percepção é rank (0–4), conjura é sim/não, perícias extras é "mais N". */
  if (field === 'perception') return rankLabel(value);
  if (field === 'spellcasting') return strings.browse.ancestry.spellcasting[value] ?? value;
  if (field === 'extraSkills')
    return value === '0' ? '' : strings.browse.ancestry.extraSkills(value);
  return capitalizar(value);
}

/** `2` → "Perito". Fora da escala, o número mesmo. */
export function rankLabel(value: string): string {
  return strings.browse.ancestry.rank[Number(value)] ?? value;
}

export const KIND_FIELD = 'kind';

export const EXTRA_LANGUAGES_FIELD = 'extraLanguages';
export const CATEGORY_FIELD = 'category';

/**
 * Os três campos da ancestralidade cujo VALOR tem rótulo próprio: `med` é "Médio", não
 * "Med"; `low-light-vision` é "Visão na penumbra"; `20` é "20 pés". Nomeados como
 * `BOOK_FIELD`, pelo mesmo motivo — coluna, filtro e detalhe têm de escrever igual.
 */
export const SIZE_FIELD = 'size';
export const SIZES_FIELD = 'sizes';
export const SWIM_FIELD = 'swim';
export const VISION_FIELD = 'vision';
export const SPEED_FIELD = 'speed';

/**
 * O campo de santificação da divindade. Nomeado como `BOOK_FIELD`: o filtro e o detalhe
 * precisam escrever a mesma frase, e escrevem porque os dois passam por aqui.
 */
export const SANCTIFICATION_FIELD = 'sanctification';

/**
 * `can:holy` → "pode ser sagrado"; `must:unholy` → "deve ser profano";
 * `can:holy+unholy` → "pode ser sagrado ou profano". Vazio → "nenhuma".
 *
 * A receita guarda o token porque a fonte guarda dois campos (`modal` e `what`) e uma
 * pergunta só. A frase é montada aqui, uma vez, para a coluna, o detalhe e o filtro.
 */
export function sanctificationLabel(token: string): string {
  const s = strings.browse.sanctification;
  if (token === '') return s.none;
  const [modal, what] = token.split(':');
  const verbo = modal === 'must' ? s.must : s.can;
  const partes = (what ?? '').split('+').map((w) => s.what[w] ?? w);
  return `${verbo} ${partes.join(` ${s.or} `)}`;
}

/**
 * Quanto vale cada moeda em cobre, da maior para a menor — e a MAIOR É O OURO.
 *
 * ⚠️ A platina NÃO entra na decomposição, por decisão do autor. Ela existe no jogo e a
 * fonte a usa (`pp`), mas o livro escreve os preços em peças de ouro até o fim da tabela:
 * o Acid Flask superior custa **2.500 PO**, e não 250 PL. Com a platina na lista, todo item
 * caro virava um número pequeno numa moeda que ninguém usa para comparar.
 *
 * A conversão continua exata: quem tem `pp: 1` na fonte (só `Platinum Pieces`) vale 1.000
 * de cobre, e sai como 10 PO.
 */
type Moeda = 'po' | 'pp' | 'pc';

const MOEDAS: readonly (readonly [Moeda, number])[] = [
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
