/**
 * As páginas de domínio, lidas do jornal `Domains`.
 *
 * Como perícia, domínio NÃO é documento no Foundry: é uma página de jornal. As 61 têm a
 * mesma forma, medida página a página no `pf2e-8.5.0`:
 *
 *   <p>uma frase de abertura</p>
 *   <p><strong>Domain Spell</strong> @UUID{…}</p>
 *   <p><strong>Advanced Domain Spell</strong> @UUID{…}</p>
 *   <hr />
 *   <h4>Deities</h4><p>@UUID, @UUID…</p>  [<p><em>Alternate Domain</em></p><p>@UUID…</p>]
 *   e depois, quando há: Covenants, Pantheons, Oracle Mysteries — mesma forma
 *
 * O que sai daqui é POUCO de propósito: só as duas magias, para a coluna. As divindades
 * ficam na página — que vira a descrição, e onde cada nome já é um `@UUID` clicável. Tirar
 * a lista para um campo repetiria no cabeçalho o que a descrição já diz (regra da Etapa
 * 15a), e são 2.473 links de página para divindade.
 */

/** Uma magia de domínio. O conteúdo mora em Magias; aqui só o ponteiro e o rótulo. */
export interface DomainSpell {
  readonly uuid: string;
  readonly name: string;
}

export interface DomainPage {
  /** `Fire`, sem o " Domain" que o título da página carrega. */
  readonly name: string;
  readonly spell: DomainSpell | null;
  readonly advancedSpell: DomainSpell | null;
}

const REFERENCIA = /@UUID\[([^\]]+)\]\{([^}]*)\}/;
const MAGIA = /<strong>Domain Spell<\/strong>\s*(@UUID\[[^\]]+\]\{[^}]*\})/;
const MAGIA_AVANCADA = /<strong>Advanced Domain Spell<\/strong>\s*(@UUID\[[^\]]+\]\{[^}]*\})/;
const SUFIXO = ' Domain';

function referencia(trecho: string | undefined): DomainSpell | null {
  if (trecho === undefined) return null;
  const m = REFERENCIA.exec(trecho);
  if (m === null) return null;
  return { uuid: m[1] ?? '', name: (m[2] ?? '').trim() };
}

/** Lê UMA página. Devolve `null` se ela não tiver a forma de domínio. */
export function parseDomainPage(title: string, html: string): DomainPage | null {
  if (!title.endsWith(SUFIXO)) return null;
  return {
    name: title.slice(0, -SUFIXO.length),
    spell: referencia(MAGIA.exec(html)?.[1]),
    advancedSpell: referencia(MAGIA_AVANCADA.exec(html)?.[1]),
  };
}

/** `Fire` → `fire`, `Nothingness` → `nothingness`. Casa com `system.domains.primary`. */
export function domainSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
