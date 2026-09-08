/**
 * Receita de `skill` — as 17 perícias, de uma TABELA dentro de um jornal.
 *
 * Sexta receita, e a mais estranha das seis: perícia não é documento no Foundry. Procurei
 * nos três lugares possíveis do `pf2e-8.5.0` antes de chegar aqui —
 * `lang/en.json` traz só o nome, não existe pack de perícia, e não há página de jornal
 * chamada Acrobatics. O sistema não precisa: para ele, perícia é um número na ficha.
 *
 * O que existe é a página `Skill Actions` do jornal `GM Screen`, uma tabela de quatro
 * colunas com **nome, atributo-chave, ações destreinadas e ações treinadas**. É de lá que
 * as 17 saem, pelo `expand` do motor — a peça que este passo obrigou a existir.
 *
 * ⚠️ NÃO HÁ DESCRIÇÃO, e isto não é omissão nossa: o texto que explica o que cada perícia É
 * mora no Player Core, e o pacote do Foundry não o traz. A tela mostra o que existe — o
 * atributo e as ações — e não inventa o resto.
 *
 * As 50 ações citadas apontam para o pack `actionspf2e`, e as 50 estão na nossa base desde
 * a Etapa 6. A perícia guarda a REFERÊNCIA; o conteúdo continua morando na ação, e é ela
 * que a tela abre quando se clica.
 *
 * Decidida contra o JSON real do `pf2e-8.5.0`, em 08/09/2026.
 */

import { isRecord } from '../../json';
import { listOf, shape, text } from '../decoders';
import { from } from '../field';
import { recipe } from '../recipe';
import { parseSkillTable, skillSlug, type SkillAction } from '../skills';

/** O jornal e a página onde a tabela mora. Se mudarem de nome, o expansor devolve vazio. */
const JORNAL = 'GM Screen';
const PAGINA = 'Skill Actions';

export interface SkillBase {
  readonly name: string;
  readonly slug: string;
  /** `Dexterity`, `Strength`, `Intelligence`, `Wisdom`, `Charisma`. */
  readonly attribute: string;
  /** O que qualquer um pode tentar — 2 a 10 por perícia. */
  readonly untrained: readonly SkillAction[];
  /** O que exige treinamento. */
  readonly trained: readonly SkillAction[];
}

/**
 * Perícia não tem descrição. O tipo existe vazio porque o motor exige um, e porque a
 * ausência aqui é INFORMAÇÃO: quem abrir o arquivo vê que não esquecemos.
 */
export type SkillDesc = Record<string, never>;

/**
 * Uma página de jornal vira N documentos de perícia.
 *
 * Cada linha ganha `_id` (o slug) e `type` porque é o contrato da identidade do motor —
 * ver `expand` em `recipe.ts`. O `uuid` fica de fora de propósito: perícia não é documento
 * do Foundry e não tem UUID canônico, então a chave cai no `id:` de reserva, que é o que o
 * `entityKey` já faz para dado antigo.
 */
function expandirPericias(document: unknown): readonly unknown[] {
  if (!isRecord(document) || document['name'] !== JORNAL) return [];

  const paginas = document['pages'];
  if (!Array.isArray(paginas)) return [];

  const pagina = paginas.find((entrada) => isRecord(entrada) && entrada['name'] === PAGINA);
  if (!isRecord(pagina)) return [];

  const texto = pagina['text'];
  const html = isRecord(texto) && typeof texto['content'] === 'string' ? texto['content'] : '';
  if (html === '') return [];

  return parseSkillTable(html).map((linha) => ({
    _id: skillSlug(linha.name),
    type: 'skill',
    name: linha.name,
    attribute: linha.attribute,
    untrained: linha.untrained,
    trained: linha.trained,
  }));
}

const acao = shape({ uuid: text, name: text });

export const skillRecipe = recipe<SkillBase, SkillDesc>({
  type: 'skill',
  packs: [{ name: 'journals' }],
  expand: expandirPericias,

  base: {
    name: from('name', text),
    slug: from('_id', text),
    attribute: from('attribute', text),
    untrained: from('untrained', listOf(acao)),
    trained: from('trained', listOf(acao)),
  },
});
