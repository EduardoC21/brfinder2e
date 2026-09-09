/**
 * Receita de `background` — 520 entradas no pack `backgrounds`.
 *
 * Sétima receita, e a mais MAGRA em mecânica desde condição. É de propósito: antecedente é
 * quase todo texto. Medido no `pf2e-8.5.0` — a descrição vai de 370 a 4.860 caracteres,
 * mediana 666, e os 520 têm uma. Não falta descrição em nenhum.
 *
 * ⚠️ NÃO HÁ JORNAL DE ANTECEDENTE, e isso foi conferido antes de escrever: os sete jornais
 * do pacote são `Ancestries`, `Archetypes`, `Classes`, `Domains`, `GM Screen`,
 * `Hero Point Deck` e `Remaster Changes`. O pack é a fonte inteira — diferente de
 * ancestralidade, onde o pack traz 639 caracteres e a página do jornal traz 4.350.
 *
 * A mecânica cabe em quatro coisas, e as quatro foram contadas nos 520:
 *
 *   perícia treinada   16 distintas. 438 treinam uma, 80 nenhuma, 2 treinam duas.
 *   Saber (Lore)       186 distintos. 420 dão um, 93 nenhum, 5 dão dois, 2 dão três.
 *   aumento            500 oferecem escolha entre DOIS atributos; 9 fixam um, 9 dão livre
 *                      e 2 oferecem três.
 *   talento            402 concedem um, 116 nenhum, 2 concedem dois. 76 distintos, todos
 *                      no pack `feats-srd`, que já é a nossa base de Talentos.
 *
 * ⚠️ A PASTA NÃO ENTRA. Ela existe em 188 dos 520, e as raízes são `Adventure Paths` 164,
 * `Pathfinder Society` 18, `Adventures` 6 — 332 ficariam sem valor. E a pergunta que ela
 * responde ("de que produto veio") é a mesma do livro, que responde nos 520 com o nome
 * exato, entre 61 títulos. Dois campos para a mesma pergunta, um deles 64% vazio: é o
 * mesmo defeito que a `family` do equipamento tinha, e que foi desfeito na Etapa 12g.
 *
 * Decidida contra o JSON real do `pf2e-8.5.0`, em 08/09/2026.
 */

import { bool, html, raw, shape, text, textList } from '../decoders';
import { isRecord } from '../../json';
import { from } from '../field';
import { recipe } from '../recipe';

/** A referência a um talento do compêndio, do jeito que a tela precisa dela. */
export interface GrantedFeat {
  readonly uuid: string;
  readonly name: string;
}

export interface BackgroundBase {
  readonly name: string;
  readonly slug: string;

  /** common 288, rare 137, uncommon 95. */
  readonly rarity: string;

  /**
   * Os traços, e eles são QUASE SEMPRE VAZIOS: 512 dos 520 não têm nenhum.
   *
   * Os 8 que têm são `persona-*` do Battlecry!, um por antecedente. O campo fica mapeado
   * porque o dado existe e a etiqueta ao lado do nome sabe desenhá-lo — mas NÃO vira
   * filtro nem coluna: um eixo que separa 8 de 520 não recorta nada.
   */
  readonly traits: readonly string[];

  /**
   * As perícias em que o antecedente treina. 16 distintas em toda a base.
   *
   * `society` 54, `diplomacy` 42, `athletics` 41, `survival` 40, `crafting` 39… É o eixo
   * mais útil da fonte, e o único filtro que vale a pena de verdade — a pergunta que se faz
   * é "quais antecedentes treinam Furtividade?".
   *
   * Lista e não texto porque 2 dos 520 treinam duas, e 80 não treinam nenhuma.
   */
  readonly skills: readonly string[];

  /**
   * O Saber concedido: `Circus Lore`, `Warfare Lore`, `Academia Lore`…
   *
   * 186 valores distintos para 520 entradas, e por isso ele é COLUNA e não filtro: uma
   * lista de opções com 186 itens é mais longa que a tela, e "quais dão Circus Lore" é uma
   * pergunta que quase não se faz. Quem procura um Saber específico usa a busca.
   *
   * Texto livre, e não uma perícia: o Foundry o guarda numa chave à parte justamente
   * porque Saber é uma perícia que a pessoa inventa.
   */
  readonly lore: readonly string[];

  /**
   * O aumento de atributo COM ESCOLHA — o primeiro dos dois que o antecedente dá.
   *
   * O livro escreve "um aumento tem de ser em Força ou Destreza, e o outro é livre", e a
   * fonte guarda exatamente isso: `boosts.0` com dois atributos e `boosts.1` com os seis.
   * Só o primeiro é informação — o segundo é a mesma frase em 516 dos 520.
   *
   * ⚠️ VINTE FOGEM DO PADRÃO, e eles são a razão de isto ser uma LISTA e não um par:
   * 9 fixam UM atributo (`Crown of Chaos` Carisma, `Hammered by Fate` Força…), 9 dão os
   * dois livres, e 2 oferecem três. A lista VAZIA quer dizer "livre", e a tela escreve
   * isso — devolver os seis atributos seria desenhar a ausência de recorte como se fosse
   * uma escolha entre seis.
   *
   * Nos 520: Sab 198, Int 192, Car 191, Con 161, Des 149, For 124.
   */
  readonly boosts: readonly string[];

  /**
   * O talento que o antecedente concede, com o UUID que aponta para a base de Talentos.
   *
   * 402 concedem um, 116 nenhum, 2 concedem dois — 76 talentos distintos, todos em
   * `feats-srd`. A referência fica aqui, e o CONTEÚDO continua morando no talento: é a
   * mesma ponte que perícia abriu na Etapa 13, e o mesmo painel que a desenha.
   */
  readonly feats: readonly GrantedFeat[];

  readonly source: {
    readonly license: string;
    readonly title: string;
    readonly remaster: boolean;
  };
}

export interface BackgroundDesc {
  /** HTML cru. A descrição já traz a mecânica por extenso, e um `@UUID` para o talento. */
  readonly main: string;
}

/** Os seis atributos, como a fonte os escreve. Serve para reconhecer o aumento livre. */
const TODOS = 6;

/**
 * `{0: {value: ['dex','str']}, 1: {…}}` → `['dex','str']`.
 *
 * Só a chave `0`. As outras repetem os seis atributos em 516 dos 520, e uma lista de seis
 * ao lado de outra de seis não diz nada que "livre" não diga melhor.
 */
function toBoosts(cru: unknown): readonly string[] {
  if (!isRecord(cru)) return [];
  const primeiro = cru['0'];
  if (!isRecord(primeiro)) return [];
  const valores = primeiro['value'];
  if (!Array.isArray(valores)) return [];
  const lista = valores.filter((item): item is string => typeof item === 'string');
  // Os seis é o aumento LIVRE, e livre não é escolha entre seis — é ausência de recorte.
  return lista.length === TODOS ? [] : lista;
}

/**
 * `{c4lrh: {uuid, name, level, img}}` → `[{uuid, name}]`.
 *
 * A chave é um identificador que o Foundry gera para a ficha, não informação; `level` vale
 * 1 em todos e `img` é ícone que o zip não traz. Sobra o par que a ponte precisa.
 */
function toFeats(cru: unknown): readonly GrantedFeat[] {
  if (!isRecord(cru)) return [];
  return Object.values(cru)
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .map((item) => ({
      uuid: typeof item['uuid'] === 'string' ? item['uuid'] : '',
      name: typeof item['name'] === 'string' ? item['name'] : '',
    }))
    .filter((item) => item.uuid !== '' && item.name !== '');
}

export const backgroundRecipe = recipe<BackgroundBase, BackgroundDesc>({
  type: 'background',
  packs: [{ name: 'backgrounds' }],

  base: {
    name: from('name', text),
    slug: from('system.slug', text),
    rarity: from('system.traits.rarity', text),
    traits: from('system.traits.value', textList),
    skills: from('system.trainedSkills.value', textList),
    lore: from('system.trainedSkills.lore', textList),
    boosts: from('system.boosts', raw).map(toBoosts),
    feats: from('system.items', raw).map(toFeats),
    source: from('system.publication', shape({ license: text, title: text, remaster: bool })),
  },

  desc: {
    main: from('system.description.value', html),
  },

  ignore: {
    folder:
      'a pasta do compêndio (188 dos 520, raízes `Adventure Paths` 164, ' +
      '`Pathfinder Society` 18, `Adventures` 6). Responde a mesma pergunta que o livro — ' +
      'de que produto veio — com 64% de vazio, enquanto o livro responde nos 520.',
    img: 'ícone padrão de antecedente; o zip não traz imagem',
    effects: 'active effects do VTT; vazio nos 520',
    'system._migration': 'controle interno de migração do Foundry',
    'system.trainedSkills.custom':
      'chave MORTA: existe em 156 dos 520 e vale string vazia nos 156. É o campo de ' +
      'Saber escrito à mão de antes do Remaster, substituído por `trainedSkills.lore`, ' +
      'que é o que os 427 com Saber preenchem.',
    '_stats.coreVersion': 'versão do Foundry que gerou; já sabemos pela tag do release',
    '_stats.systemId': 'sempre "pf2e"; já sabemos pelo canal',
    '_stats.systemVersion': 'já sabemos pela tag do release',
  },

  defer: {
    'system.rules':
      'rule elements — mecânica pura de VTT (140 dos 520 têm). É o que APLICA o ' +
      'treinamento na ficha; a consulta lê os campos, a ficha vai ler isto. Continua em raw/.',
  },
});
