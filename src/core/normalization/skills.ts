/**
 * A tabela de perícias, lida da página `Skill Actions` do jornal `GM Screen`.
 *
 * ⚠️ PERÍCIA NÃO É UM DOCUMENTO no Foundry, e esta é a diferença desta receita para as
 * cinco anteriores. Procurei nos três lugares possíveis do `pf2e-8.5.0`:
 *
 *   `lang/en.json`   traz `PF2E.Skill.Acrobatics = "Acrobatics"` — o NOME, e mais nada
 *   packs            não existe pack de perícia
 *   jornais          nenhuma página chamada Acrobatics, Athletics, Thievery…
 *
 * O sistema não precisa: para ele, perícia é um número na ficha. Quem descreve o que cada
 * uma É são as 227 páginas do Player Core, que não estão aqui.
 *
 * O que EXISTE é uma tabela na tela do mestre, com as três coisas que dá para saber:
 * **o nome, o atributo-chave e as ações ligadas**, separadas entre destreinadas e
 * treinadas. As ações vêm por `@UUID`, e as 50 citadas apontam para o pack `actionspf2e` —
 * as mesmas 766 que a Etapa 6 já normalizou. Nada é duplicado: a perícia guarda a
 * referência, e o conteúdo continua morando na ação.
 *
 * As letras que a tabela põe ao lado de cada ação (`A`, `2`, `E`, `D`, `G`) são IGNORADAS
 * de propósito: são a abreviação impressa do custo e dos traços, e nós temos as duas
 * coisas em forma estruturada na própria ação. Ler a abreviação seria preferir o resumo à
 * fonte.
 */

import { slugify } from './slug';

/** Uma ação ligada a uma perícia. O conteúdo mora na fonte de Ações; aqui vai o ponteiro. */
export interface SkillAction {
  /** `Compendium.pf2e.actionspf2e.Item.M76ycLAqHoAgbcej` — casa com o `uuid` da ação. */
  readonly uuid: string;
  /** O rótulo como a tabela escreve. Guardado para a tela não depender da junção. */
  readonly name: string;
}

export interface SkillRow {
  readonly name: string;
  /** `Dexterity`, `Strength`, `Intelligence`, `Wisdom`, `Charisma`. */
  readonly attribute: string;
  /** O que qualquer um pode tentar. */
  readonly untrained: readonly SkillAction[];
  /** O que exige treinamento na perícia. */
  readonly trained: readonly SkillAction[];
}

const LINHA = /<tr>([\s\S]*?)<\/tr>/g;
const CELULA = /<td[^>]*>([\s\S]*?)<\/td>/g;
const REFERENCIA = /@UUID\[([^\]]+)\]\{([^}]*)\}/g;
const ETIQUETA = /<[^>]*>/g;

function texto(html: string): string {
  return html.replace(ETIQUETA, ' ').replace(/\s+/g, ' ').trim();
}

function acoes(html: string): readonly SkillAction[] {
  return [...html.matchAll(REFERENCIA)].map(([, uuid, name]) => ({
    uuid: uuid ?? '',
    name: (name ?? '').trim(),
  }));
}

/**
 * Lê o HTML da página e devolve uma linha por perícia.
 *
 * Linha sem QUATRO células é descartada — é o cabeçalho da tabela, e descartá-lo pela
 * forma em vez de pelo índice sobrevive a o Foundry mudar de `<th>` para `<td>` e vice-
 * versa, que é o tipo de coisa que muda entre versões sem aviso.
 */
export function parseSkillTable(html: string): readonly SkillRow[] {
  const linhas: SkillRow[] = [];

  for (const [, corpo] of html.matchAll(LINHA)) {
    const celulas = [...(corpo ?? '').matchAll(CELULA)].map(([, conteudo]) => conteudo ?? '');
    if (celulas.length < 4) continue;

    const nome = texto(celulas[0] ?? '');
    const atributo = texto(celulas[1] ?? '');
    if (nome === '' || atributo === '') continue;

    linhas.push({
      name: nome,
      attribute: atributo,
      untrained: acoes(celulas[2] ?? ''),
      trained: acoes(celulas[3] ?? ''),
    });
  }

  return linhas;
}

/** `Acrobatics` → `acrobatics`. É a identidade da perícia: ela não tem `_id` de Foundry. */
export function skillSlug(name: string): string {
  return slugify(name);
}
