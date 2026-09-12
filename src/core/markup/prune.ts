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
 * E os CABEÇALHOS de tabela que o livro escreve para a ficha e não para a consulta (o
 * autor, 26c): "Your Level" vira "Level" e "Class Features" vira "Features". Medido nos
 * jornais do `pf2e-8.5.0`: "Your Level" em 41 tabelas de `Classes` (a de progressão das
 * 29 e as de magias por dia) e 1 de `Archetypes`; "Class Features" nas 29. Só o texto
 * EXATO do `<th>`, e nada mais: "Creature's Level" e "Levels of Light" ficam.
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

/** O cabeçalho como o livro escreve → como a consulta lê. Só o texto exato. */
const CABECALHOS: Readonly<Record<string, string>> = {
  'Your Level': 'Level',
  'Class Features': 'Features',
};

/** Um `<th>` cujo conteúdo é um texto só, e esse texto está na tabela de cabeçalhos. */
function cabecalhoRenomeado(node: DocNode): DocNode | null {
  if (node.kind !== 'element' || node.tag !== 'th') return null;
  const cheios = node.children.filter((child) => !ehVazio(child));
  const unico = cheios.length === 1 ? cheios[0] : undefined;
  if (unico?.kind !== 'token' || unico.token.kind !== 'text') return null;
  const novo = CABECALHOS[unico.token.raw.trim()];
  if (novo === undefined) return null;
  return { ...node, children: [{ kind: 'token', token: { ...unico.token, raw: novo } }] };
}

export function pruneForReading(nodes: readonly DocNode[]): DocNode[] {
  const out: DocNode[] = [];
  for (const node of nodes) {
    if (soEfeito(node)) continue;
    const cabecalho = cabecalhoRenomeado(node);
    if (cabecalho !== null) {
      out.push(cabecalho);
      continue;
    }
    out.push(
      node.kind === 'element' ? { ...node, children: pruneForReading(node.children) } : node,
    );
  }
  return out;
}
