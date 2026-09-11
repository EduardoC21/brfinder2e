/**
 * `Fire Domain` → `fire-domain`, `Treat Wounds` → `treat-wounds`, `Acrobática` → `acrobatica`.
 *
 * O MESMO slug que o Foundry faz para `system.slug`: caixa baixa, sem acento, tudo que não
 * é letra ou dígito vira hífen. Uma definição só, para perícia, domínio e regra — que não
 * têm slug na fonte porque não são documento — casarem com quem tem.
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
