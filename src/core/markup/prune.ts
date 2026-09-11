/**
 * A PODA DE LEITURA: o que a descrição traz para o VTT e não para quem lê.
 *
 * O Foundry fecha quase toda descrição de magia, talento e item com um parágrafo que é só
 * um link para o EFEITO — `<p>@UUID[Compendium.pf2e.spell-effects.Item.…]{Spell Effect:
 * Aid}</p>` — o objeto que a mesa de jogo arrasta para a ficha. Aqui ele não abre nada
 * (os packs `*-effects` nunca são fonte) e não diz nada que a descrição já não disse.
 *
 * Medido no `pf2e-8.5.0`, nas descrições das fontes importadas: 1.852 links para packs de
 * efeito (`equipment-effects` 960, `spell-effects` 502, `feat-effects` 355, e 12 entre
 * `other`, `campaign` e `bestiary`). **1.806 estão SOZINHOS num parágrafo**; 46 estão no
 * meio de uma frase ("…takes a -1 penalty. @UUID{Effect: …}" na mesma linha). A poda tira
 * o parágrafo que é só o link; o que está no meio da frase fica, porque tirá-lo deixaria
 * a frase manca.
 *
 * ⚠️ É poda de LEITURA, na terceira camada (o documento pronto para desenhar): `raw/` e
 * `desc/` continuam com o texto inteiro. Quem busca na descrição busca no texto inteiro.
 */

import type { DocNode } from './document';

/** O pack de efeito, no alvo do link: `Compendium.pf2e.spell-effects.Item.…`. */
const EFEITO = /^Compendium\.pf2e\.[a-z-]*effects\.Item\./;

function ehEfeito(node: DocNode): boolean {
  return node.kind === 'token' && node.token.kind === 'uuid' && EFEITO.test(node.token.target);
}

function ehVazio(node: DocNode): boolean {
  return node.kind === 'token' && node.token.kind === 'text' && node.token.raw.trim() === '';
}

/** Um parágrafo cujo conteúdo é só link de efeito (um ou mais), fora o espaço em branco. */
function soEfeito(node: DocNode): boolean {
  if (node.kind !== 'element' || node.tag !== 'p') return false;
  const cheios = node.children.filter((child) => !ehVazio(child));
  return cheios.length > 0 && cheios.every(ehEfeito);
}

export function pruneForReading(nodes: readonly DocNode[]): DocNode[] {
  const out: DocNode[] = [];
  for (const node of nodes) {
    if (soEfeito(node)) continue;
    out.push(
      node.kind === 'element' ? { ...node, children: pruneForReading(node.children) } : node,
    );
  }
  return out;
}
