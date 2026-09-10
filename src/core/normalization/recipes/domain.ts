/**
 * Receita de `domain` — os 61 domínios, das páginas do jornal `Domains`.
 *
 * Décima receita, e a segunda que sai de um jornal pelo `expand` (a primeira foi perícia).
 * Domínio não é documento no Foundry: é uma página, e a página é a entrada inteira —
 * frase de abertura, as duas magias e a lista de quem o concede, tudo já em `@UUID`.
 *
 * A DESCRIÇÃO É A PÁGINA. Nada é extraído para o cabeçalho além das duas magias, que
 * viram coluna: a lista de divindades ficaria repetida (regra da Etapa 15a), e ela é
 * grande — 2.473 links de página para divindade nas 61.
 *
 * O UUID é SINTETIZADO na forma canônica do Foundry para páginas,
 * `Compendium.pf2e.journals.JournalEntry.<jornal>.JournalEntryPage.<página>`. Só 6 links
 * na base apontam para páginas de domínio assim, mas é a forma certa, e é o que deixa a
 * ponte por UUID funcionar sem caso especial.
 *
 * ⚠️ A DIVINDADE APONTA POR SLUG, não por UUID: `system.domains.primary` traz `fire`, e a
 * página se chama `Fire Domain`. Os dois casam pelo `domainSlug` — 61 de 64 domínios
 * citados têm página; `void`, `wyrmkin` e `delirium` (29, 24 e 25 divindades) não têm.
 *
 * Decidida contra o JSON real do `pf2e-8.5.0`, em 10/09/2026.
 */

import { isRecord } from '../../json';
import { html, nullable, shape, text } from '../decoders';
import { domainSlug, parseDomainPage, type DomainSpell } from '../domains';
import { from } from '../field';
import { recipe } from '../recipe';

const JORNAL = 'Domains';
const PACK_DE_JORNAIS = 'journals';

export interface DomainBase {
  readonly name: string;
  readonly slug: string;
  readonly spell: DomainSpell | null;
  readonly advancedSpell: DomainSpell | null;
}

export interface DomainDesc {
  /** A página inteira. Os nomes de divindade nela já são `@UUID` clicáveis. */
  readonly main: string;
}

/** O jornal `Domains` vira 61 documentos, um por página. Ver `expand` em `recipe.ts`. */
function expandirDominios(document: unknown): readonly unknown[] {
  if (!isRecord(document) || document['name'] !== JORNAL) return [];
  const jornal = typeof document['_id'] === 'string' ? document['_id'] : '';
  const paginas = document['pages'];
  if (!Array.isArray(paginas)) return [];

  const saida: unknown[] = [];
  for (const pagina of paginas as unknown[]) {
    if (!isRecord(pagina)) continue;
    const titulo = typeof pagina['name'] === 'string' ? pagina['name'] : '';
    const texto = pagina['text'];
    const conteudo =
      isRecord(texto) && typeof texto['content'] === 'string' ? texto['content'] : '';
    const lida = parseDomainPage(titulo, conteudo);
    if (lida === null) continue;
    const id = typeof pagina['_id'] === 'string' ? pagina['_id'] : '';
    saida.push({
      _id: domainSlug(lida.name),
      type: 'domain',
      name: lida.name,
      spell: lida.spell,
      advancedSpell: lida.advancedSpell,
      description: conteudo,
      _stats: {
        compendiumSource: `Compendium.pf2e.${PACK_DE_JORNAIS}.JournalEntry.${jornal}.JournalEntryPage.${id}`,
      },
    });
  }
  return saida;
}

const magia = nullable(shape({ uuid: text, name: text }));

export const domainRecipe = recipe<DomainBase, DomainDesc>({
  type: 'domain',
  packs: [{ name: PACK_DE_JORNAIS }],
  expand: expandirDominios,

  base: {
    name: from('name', text),
    slug: from('_id', text),
    spell: from('spell', magia),
    advancedSpell: from('advancedSpell', magia),
  },

  desc: {
    main: from('description', html),
  },
});
