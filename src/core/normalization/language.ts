/**
 * A tabela de idioma fundida.
 *
 * ⚠️ Briefing 7.7: o manifesto declara QUATRO arquivos para o inglês, e o Foundry funde
 * todos. Medido no pf2e-8.4.1, os quatro são fatias disjuntas — zero chaves em comum:
 *
 *   en.json           5.687   vocabulário geral (PF2E.Item, PF2E.Actor, PF2E.Weapon)
 *   re-en.json        5.144   rule elements — é onde moram os prompt dos ChoiceSet
 *   action-en.json      684   PF2E.Actions
 *   kingmaker-en.json   287   a aventura
 *                    ------
 *                     11.802 = exatamente a união
 *
 * Ler só o primeiro deixa todo painel de escolha mostrando a chave crua na tela.
 */

/** Achata `{PF2E:{Item:{name:"x"}}}` em `PF2E.Item.name -> "x"`. Só folhas de texto. */
export function flattenLanguageFile(
  payload: unknown,
  into = new Map<string, string>(),
): Map<string, string> {
  walk(payload, '', into);
  return into;
}

function walk(value: unknown, prefix: string, into: Map<string, string>): void {
  if (typeof value === 'string') {
    if (prefix !== '') into.set(prefix, value);
    return;
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return;
  for (const [key, child] of Object.entries(value)) {
    walk(child, prefix === '' ? key : `${prefix}.${key}`, into);
  }
}

/**
 * Funde os arquivos na ordem em que o manifesto os declara.
 *
 * A ordem importa: o último a declarar uma chave vence, que é como o Foundry se comporta.
 */
export function mergeLanguageFiles(payloads: readonly unknown[]): Map<string, string> {
  const merged = new Map<string, string>();
  for (const payload of payloads) flattenLanguageFile(payload, merged);
  return merged;
}
