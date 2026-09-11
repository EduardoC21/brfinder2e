/**
 * Receita de `rule` — as regras, das páginas dos jornais `GM Screen` e `Remaster Changes`.
 *
 * Décima primeira receita, e a terceira que sai de jornal pelo `expand`. Regra não é
 * documento no Foundry: é página, e a página é a entrada inteira — a tabela de DCs por
 * nível, o texto de Counteracting, as atividades de exploração.
 *
 * DOIS jornais, uma fonte. `GM Screen` são as 60 páginas da tela do mestre, organizadas
 * em cinco seções (ver `rules.ts`). `Remaster Changes` são 7 páginas sobre o que mudou
 * entre a edição original e o Remaster — referência de regra, e cabe como uma seção a
 * mais. `Hero Point Deck` fica de fora: é um produto à parte (53 cartas), não regra.
 *
 * ⚠️ A DESCRIÇÃO É A PÁGINA, e o cabeçalho é só a seção. Não há mecânica a extrair — uma
 * regra não tem nível, custo nem raridade. O que a fonte tem além do texto são 44 páginas
 * com TABELA, que o desenhista de descrição já desenha, e 88 links de outras fontes
 * apontando para cá (condições, talentos e magias que citam Counteracting, Falling, Treat
 * Wounds), que passam a resolver.
 *
 * `Skill Actions` entra aqui como regra E continua sendo a fonte das 17 perícias: são
 * duas leituras da mesma página, e nenhuma copia a outra.
 *
 * Decidida contra o JSON real do `pf2e-8.5.0`, em 11/09/2026.
 */

import { isRecord } from '../../json';
import { html, text } from '../decoders';
import { from } from '../field';
import { recipe } from '../recipe';
import { sectionPages } from '../rules';

/** Os jornais que viram regra, pelo nome. Se um mudar de nome, o expansor devolve vazio. */
const JORNAIS = new Set(['GM Screen', 'Remaster Changes']);

export interface RuleBase {
  readonly name: string;
  readonly slug: string;
  /**
   * A seção do livro: `Playing the Game`, `Running the Game`, `Subsystems and Variant
   * Rules`, os dois índices, e `Remaster Changes`. É o Tipo da tela.
   */
  readonly section: string;
}

export interface RuleDesc {
  /** A página inteira, com as referências relativas já na forma canônica. */
  readonly main: string;
}

/** Um jornal vira N documentos de regra, um por página com conteúdo. */
function expandirRegras(document: unknown): readonly unknown[] {
  if (!isRecord(document) || typeof document['name'] !== 'string') return [];
  if (!JORNAIS.has(document['name'])) return [];
  const jornal = typeof document['_id'] === 'string' ? document['_id'] : '';
  const paginas = document['pages'];
  if (!Array.isArray(paginas)) return [];

  const planas = (paginas as unknown[]).flatMap((pagina) => {
    if (!isRecord(pagina)) return [];
    const titulo = pagina['title'];
    const texto = pagina['text'];
    return [
      {
        id: typeof pagina['_id'] === 'string' ? pagina['_id'] : '',
        name: typeof pagina['name'] === 'string' ? pagina['name'] : '',
        level: isRecord(titulo) && typeof titulo['level'] === 'number' ? titulo['level'] : 2,
        sort: typeof pagina['sort'] === 'number' ? pagina['sort'] : 0,
        content: isRecord(texto) && typeof texto['content'] === 'string' ? texto['content'] : '',
      },
    ];
  });

  return sectionPages(jornal, planas).map((regra) => ({
    _id: regra.slug,
    type: 'rule',
    name: regra.name,
    section: regra.section,
    description: regra.content,
    _stats: { compendiumSource: regra.uuid },
  }));
}

export const ruleRecipe = recipe<RuleBase, RuleDesc>({
  type: 'rule',
  packs: [{ name: 'journals' }],
  expand: expandirRegras,

  base: {
    name: from('name', text),
    slug: from('_id', text),
    section: from('section', text),
  },

  desc: {
    main: from('description', html),
  },
});
