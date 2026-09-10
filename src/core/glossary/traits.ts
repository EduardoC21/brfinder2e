/**
 * O GLOSSÁRIO DE TRAÇOS — o que cada traço quer dizer, para a caixinha que aparece ao
 * passar o mouse.
 *
 * É a primeira coisa na base que NÃO é entrada: um traço não é documento de pack nenhum.
 * O texto dele mora na tabela de idioma, em chaves `PF2E.TraitDescription<Nome>`, e o
 * rótulo em `PF2E.Trait<Nome>`. Medido no `pf2e-8.5.0`:
 *
 *   536 descrições e 908 rótulos na tabela
 *   393 traços distintos usados nas sete fontes que importamos
 *   326 deles com descrição EXATA — 96,9% dos 34.086 usos
 *   98,9% dos usos com a regra do sufixo abaixo
 *
 * ⚠️ O SUFIXO. Trinta e seis traços vêm parametrizados — `deadly-d8`, `two-hand-d10`,
 * `thrown-20`, `versatile-p` — e NENHUM tem descrição própria. A descrição está na base
 * (`deadly`, `two-hand`), e foi escrita para isso: "adds a weapon damage die **of the
 * listed size**", "changes its damage die **to the indicated value**". O número fica no
 * chip; a explicação é uma só. Conferido variante por variante em 09/09/2026.
 *
 * Como toda camada da base, é construído na sincronização a partir do zip do Foundry e
 * gravado localmente — nada disto entra no repositório.
 */

export interface TraitEntry {
  /** `Two-Hand`, como o Foundry escreve. Cai no próprio slug quando a tabela não tem. */
  readonly label: string;
  readonly description: string;
}

export type TraitGlossary = Readonly<Record<string, TraitEntry>>;

const DESCRIPTION_PREFIX = 'PF2E.TraitDescription';
const LABEL_PREFIX = 'PF2E.Trait';

/**
 * `TwoHand` → `two-hand`, `AffixedToGroundIn10FtRadius` → `affixed-to-ground-in10-ft-radius`.
 *
 * A regra é a do próprio sistema: o nome da chave é o slug em CamelCase. O corte entre
 * minúscula-ou-dígito e maiúscula devolve o slug em 326 dos 393 traços usados — os que
 * sobram são os parametrizados, que o `lookupTrait` resolve pelo sufixo.
 */
function slugFromKey(key: string, prefix: string): string {
  return key
    .slice(prefix.length)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

/** Lê a tabela de idioma fundida e devolve o glossário. Chaves sem descrição não entram. */
export function buildTraitGlossary(language: ReadonlyMap<string, string>): TraitGlossary {
  const labels = new Map<string, string>();
  const descriptions = new Map<string, string>();

  for (const [key, value] of language) {
    if (key.startsWith(DESCRIPTION_PREFIX)) {
      descriptions.set(slugFromKey(key, DESCRIPTION_PREFIX), value);
    } else if (key.startsWith(LABEL_PREFIX) && !key.includes('.', LABEL_PREFIX.length)) {
      // `PF2E.TraitAgile`, e não `PF2E.TraitDescriptionAgile` nem `PF2E.Traits.Label`.
      labels.set(slugFromKey(key, LABEL_PREFIX), value);
    }
  }

  const glossary: Record<string, TraitEntry> = {};
  for (const [slug, description] of descriptions) {
    glossary[slug] = { label: labels.get(slug) ?? slug, description };
  }
  return glossary;
}

/**
 * O sufixo PARAMÉTRICO de um traço: `-d8`, `-20`, `-p`. Uma letra só, ou um número, ou um
 * dado. `-aim` em `fatal-aim` não é sufixo — é parte do nome, e tem descrição própria.
 */
const SUFFIX = /-(d\d+|\d+|[a-z])$/;

/**
 * A descrição de um traço, com a regra do sufixo.
 *
 * Primeiro a forma exata; depois a base sem o parâmetro. `deadly-d8` não existe na tabela e
 * `deadly` existe — e a descrição de `deadly` fala "do tamanho listado", que é exatamente o
 * d8 que o chip mostra. `null` quando nem a base existe: os 1,1% que sobram são traços de
 * criatura e linhagem (`jotunborn`, `naari`, `yaksha`), raros nas fontes de consulta.
 */
export function lookupTrait(glossary: TraitGlossary, slug: string): TraitEntry | null {
  const exact = glossary[slug];
  if (exact !== undefined) return exact;
  const base = slug.replace(SUFFIX, '');
  if (base === slug) return null;
  return glossary[base] ?? null;
}
