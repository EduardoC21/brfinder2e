/**
 * Packs que trazem um tipo que a gente importa, e que nenhuma receita lê.
 *
 * ⚠️ Este arquivo existe por causa de um buraco no desenho: a lista de packs de cada
 * receita é escrita à mão, e tem que ser. Medido no `pf2e-8.5.0`, o tipo do documento NÃO
 * basta para decidir o que importar — as 1.414 ações moram em cinco packs, e nada dentro
 * do documento separa `Power Attack` (habilidade de monstro, do glossário de bestiário)
 * de `Fling Magic` (ação de PJ): mesmos campos, mesmos traços, mesma forma. Nem o
 * manifesto ajuda, que declara só `name`, `path`, `label` e `type: "Item"` para os dois.
 *
 * O problema, então, nunca foi a lista existir — foi ela ser SILENCIOSA. Um pack novo
 * simplesmente não era lido, e ninguém ficava sabendo.
 *
 * Aqui a ausência vira aviso, do mesmo jeito que um campo não lido vira linha no relatório
 * de não mapeados. Não importa nada sozinho — importar habilidade de monstro na lista do
 * jogador seria pior que não avisar — mas põe a decisão na sua frente.
 *
 * Vale lembrar por que isso quase nunca dispara: habilidade de criatura não é documento.
 * Medido no pack novo `the-dead-gods-hand-bestiary`, os 40 documentos são 29 `npc`, 10
 * `hazard` e 1 `vehicle`, e as 129 ações e 97 magias das criaturas vivem EMBUTIDAS dentro
 * do `npc`, em `items[]`. O motor só olha documentos de topo, então um bestiário novo
 * contribui zero — sem regra nenhuma escrita para isso.
 */

export interface UnreadPack {
  readonly pack: string;
  /** Quantos documentos, por tipo que alguma receita importa. */
  readonly counts: Readonly<Record<string, number>>;
  readonly total: number;
}

export interface PackContents {
  readonly pack: string;
  /** `type` de cada documento de topo do pack. */
  readonly types: readonly string[];
}

/**
 * Cruza o que existe no release com o que as receitas leem.
 *
 * Puro de propósito: quem lê o zip é o `run-sync`, que tem a rede e o arquivo na mão.
 */
export function findUnreadPacks(
  contents: readonly PackContents[],
  readPacks: ReadonlySet<string>,
  importedTypes: ReadonlySet<string>,
): readonly UnreadPack[] {
  const saida: UnreadPack[] = [];

  for (const entry of contents) {
    if (readPacks.has(entry.pack)) continue;

    const counts: Record<string, number> = {};
    let total = 0;
    for (const type of entry.types) {
      if (!importedTypes.has(type)) continue;
      counts[type] = (counts[type] ?? 0) + 1;
      total++;
    }

    if (total > 0) saida.push({ pack: entry.pack, counts, total });
  }

  // Maior primeiro: se houver vários, o que mais pesa é o que merece decisão antes.
  return saida.sort((a, b) => b.total - a.total || a.pack.localeCompare(b.pack));
}
