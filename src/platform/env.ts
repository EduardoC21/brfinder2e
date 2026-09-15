/**
 * O que o BUILD embute (Etapa 57): a URL da central.
 *
 * Em produção há um padrão FIXO no código (pelo autor, na hora de soltar a V1): a URL é
 * pública, não é segredo, e depender de uma variável de repositório era um passo
 * invisível que, esquecido, quebrava até o download da base — o site tentava
 * `/gh-api` em si mesmo e levava 404. `VITE_CENTRAL_URL` continua valendo por cima (um
 * fork apontando para outra central). Em dev e no teste o padrão é vazio: sem central
 * até alguém colar uma, para não mandar tradução de teste para a central de verdade.
 *
 * Só a plataforma lê `import.meta.env`: o core não sabe que existe Vite.
 */
export const PRODUCTION_CENTRAL_URL = 'https://brfinder2e-central.rarekay.workers.dev';

export function defaultCentralUrl(): string {
  const valor: unknown = import.meta.env['VITE_CENTRAL_URL'];
  const doBuild = typeof valor === 'string' ? valor.trim().replace(/\/+$/, '') : '';
  if (doBuild !== '') return doBuild;
  return import.meta.env.PROD ? PRODUCTION_CENTRAL_URL : '';
}
