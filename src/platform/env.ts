/**
 * O que o BUILD embute (Etapa 57): a URL da central, passada como `VITE_CENTRAL_URL` na
 * hora de construir o site (a Action de Pages a lê de uma variável do repositório). É o
 * padrão da preferência — quem instala já nasce ligado à central, e pode trocar nas
 * configurações. Vazio em dev e no teste: sem central até alguém colar uma.
 *
 * Só a plataforma lê `import.meta.env`: o core não sabe que existe Vite.
 */
export function defaultCentralUrl(): string {
  const valor: unknown = import.meta.env['VITE_CENTRAL_URL'];
  return typeof valor === 'string' ? valor.trim().replace(/\/+$/, '') : '';
}
