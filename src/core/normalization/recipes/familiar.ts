/**
 * Receita de `familiar` — as 111 habilidades de familiar do pack `familiar-abilities`.
 *
 * Oitava receita, e a mais BARATA de todas: os 111 documentos são `type: action` com
 * `category: familiar`, a mesma forma que a receita de ação lê desde a Etapa 6. Eram a
 * linha `111 action · familiar-abilities` do aviso "o que não foi sincronizado" — o motor
 * já os reconhecia, só ninguém os tinha reivindicado.
 *
 * Fonte PRÓPRIA em vez de terceiro pack da receita de ação, e o motivo é de leitura: quem
 * abre Ações procura o que o PERSONAGEM faz, e uma habilidade de familiar não é isso — é
 * o que se escolhe para o familiar na criação. Misturá-las faria a tela de Ações listar
 * 111 coisas que o personagem não executa. É o mesmo raciocínio que deixou os traços de
 * classe fora de Talentos.
 *
 * Medido no `pf2e-8.5.0`:
 *
 *   custo        100 passivas, 6 de uma ação, 5 de duas
 *   traços       96 sem nenhum; os 15 com traço têm um ou dois (`fire`, `air`…)
 *   raridade     59 declaram `common`, 52 não declaram nada — nenhuma é rara
 *   frequência   7 declaram (uma vez por 10 min, por hora, por dia)
 *   livros       15, Player Core com 50
 *   descrição    20 a 1.327 caracteres, mediana 295 — curtas, e todas presentes
 *
 * `category` vale `familiar` nos 111 e fica em `ignore`: um campo que responde a mesma
 * coisa em todas as entradas não é informação.
 *
 * O TIPO (Etapa 21) é DERIVADO, porque o dado não o tem. O livro divide as habilidades em
 * "de familiar" e "de mestre" (Player Core pg. 212–214), e o pack não marca a diferença em
 * campo nenhum — `category`, traços e pasta não separam (INCONSISTENCIAS-FOUNDRY 1.11).
 * Contra o AoN, nome a nome: as 63 do livro estão no pack, e as outras 48 são de quatro
 * origens que o nome e a pasta denunciam. Medido nos 111:
 *
 *   familiar     65   a habilidade comum, e as concedidas por talento (Leshy Familiar
 *                     Secrets, Knights of Lastwall…) que o livro lista junto delas
 *   patron       16   `Familiar of …` — a marca do patrono da Bruxa; é classe, não familiar
 *   master       14   a lista do livro, que é NOSSA — ver `MASTER_ABILITIES`
 *   specific     10   a pasta `Specific Familiary Abilities` (sic): habilidades únicas de
 *                     familiares específicos que o pack não tem como entidade
 *   elemental     6   `Elemental Familiar (Ar…Madeira)`, do Rage of Elements
 *
 * Tentou-se um sexto tipo, "concedida por talento", pelo `Prerequisites` na descrição:
 * pega 3 (as do Leshy) e deixa 13 iguais de fora. Categoria de 3 não é categoria.
 *
 * Decidida contra o JSON real do `pf2e-8.5.0`, em 10/09/2026; o tipo, em 11/09/2026.
 */

import { isRecord } from '../../json';
import { bool, html, int, nullable, shape, text, textList } from '../decoders';
import { from, fromDocument } from '../field';
import { recipe } from '../recipe';
import type { ActionFrequency } from './action';

/**
 * As 14 habilidades de MESTRE. É a única lista deste projeto que não vem do dado: o pack
 * não a tem, e o livro a tem (Player Core pg. 214, mais Extra Alchemy e Extra Vial do
 * Player Core 2, Kindling do Tian Xia Character Guide, Tattoo Transformation do Grand
 * Bazaar). Conferida contra o AoN em 11/09/2026. Se a fonte um dia marcar, a lista sai.
 */
export const MASTER_ABILITIES: ReadonlySet<string> = new Set([
  'Absorb Familiar',
  'Cantrip Connection',
  'Extra Alchemy',
  'Extra Vial',
  'Familiar Focus',
  'Innate Surge',
  'Kindling',
  'Lifelink',
  'Recall Familiar',
  'Restorative Familiar',
  'Share Senses',
  'Spell Battery',
  'Spell Delivery',
  'Tattoo Transformation',
]);

/** Os cinco tipos, do mais numeroso ao menos: 65, 16, 14, 10, 6. */
export const FAMILIAR_KINDS: readonly string[] = [
  'familiar',
  'patron',
  'master',
  'specific',
  'elemental',
];

/** O tipo, pelo nome e pela pasta — os dois únicos sinais que o dado dá. */
export function familiarKind(document: unknown): string {
  if (!isRecord(document) || typeof document['name'] !== 'string') return 'familiar';
  const name = document['name'];
  if (MASTER_ABILITIES.has(name)) return 'master';
  if (typeof document['folder'] === 'string' && document['folder'] !== '') return 'specific';
  if (name.startsWith('Familiar of ')) return 'patron';
  if (name.startsWith('Elemental Familiar (')) return 'elemental';
  return 'familiar';
}

/**
 * A mesma forma de `ActionBase`, sem `sector` e sem `category` — os dois que aqui não
 * separam nada. Tipo próprio e não `Omit<ActionBase, …>`: quem ler a receita vê os campos.
 */
export interface FamiliarBase {
  readonly name: string;
  readonly slug: string;
  /** Um de `FAMILIAR_KINDS`. Derivado — ver o cabeçalho. */
  readonly kind: string;
  /** `passive` em 100 das 111; `action` com contagem 1 ou 2 nas outras 11. */
  readonly costKind: string;
  readonly costCount: number | null;
  readonly traits: readonly string[];
  /** `common` nas 59 que declaram; padrão `common` nas 52 que não. Nenhuma rara. */
  readonly rarity: string;
  readonly frequency: ActionFrequency | null;
  readonly source: {
    readonly license: string;
    readonly title: string;
    readonly remaster: boolean;
  };
}

export interface FamiliarDesc {
  readonly main: string;
}

export const familiarRecipe = recipe<FamiliarBase, FamiliarDesc>({
  type: 'familiar',
  /* Os documentos são `action`; a entidade é `familiar`. É para isso que `accepts` existe. */
  accepts: ['action'],
  packs: [{ name: 'familiar-abilities' }],

  base: {
    name: from('name', text),
    slug: from('system.slug', text),
    kind: fromDocument(familiarKind),
    costKind: from('system.actionType.value', text),
    costCount: from('system.actions.value', nullable(int)),
    traits: from('system.traits.value', textList),
    rarity: from('system.traits.rarity', text).withDefault('common'),
    frequency: from('system.frequency', nullable(shape({ max: int, per: text }))).withDefault(null),
    source: from('system.publication', shape({ license: text, title: text, remaster: bool })),
  },

  desc: {
    main: from('system.description.value', html),
  },

  ignore: {
    'system.category': 'vale `familiar` nos 111. O que é igual em toda entrada não separa nada.',
    folder:
      'a pasta `Specific Familiary Abilities` (sic), em 10 dos 111. Lida pelo tipo derivado ' +
      '(`familiarKind`), que não marca cobertura; fica aqui para o relatório saber que foi vista.',
    img: 'ícone do custo em ações; o zip não traz imagem, e o custo já vem de costKind/costCount',
    effects: 'active effects do VTT; vazio nos 111',
    'system._migration': 'controle interno de migração do Foundry',
    '_stats.coreVersion': 'versão do Foundry que gerou; já sabemos pela tag do release',
    '_stats.systemId': 'sempre "pf2e"; já sabemos pelo canal',
    '_stats.systemVersion': 'já sabemos pela tag do release',
  },

  defer: {
    'system.rules':
      'rule elements (31 dos 111) — mecânica pura de VTT. É o que dá ao familiar o sentido ' +
      'ou a velocidade; a descrição já conta em texto. Continua em raw/.',
  },
});
