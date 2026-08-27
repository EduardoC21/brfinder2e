/**
 * Junta nomes de classe, descartando o que for falso.
 *
 * Existe por duas razões que se somam: `noUncheckedIndexedAccess` faz o acesso a um CSS
 * Module render `string | undefined`, e classe condicional é o pão de cada dia em React.
 * Sem isto, cada `className` viraria um template literal com `?? ''` no meio.
 *
 *   cx(styles['panel'], 'chamfer-lg', isOpen && styles['open'])
 */
export function cx(...parts: readonly (string | false | null | undefined)[]): string {
  return parts
    .filter((part): part is string => typeof part === 'string' && part.length > 0)
    .join(' ');
}
