/**
 * O ÚNICO lugar do projeto que sabe onde os arquivos do Foundry moram.
 *
 * Briefing, seção 4.1: se o Foundry reorganizar, você acrescenta uma entrada aqui e
 * nada mais no código muda. Nenhuma URL do GitHub pode existir fora deste arquivo.
 */

import type { PackDeclaration } from './types';

/** Extrai o último segmento de um caminho. `packs/class-features` -> `class-features`. */
export function basename(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1] ?? path;
}

/**
 * Canal do tipo `zip`: um release do GitHub com um arquivo compactado anexado.
 * É o canal recomendado (briefing 7.2): uma requisição, 34,4 MiB, ~1,4 s.
 */
export interface ZipChannel {
  readonly id: string;
  readonly kind: 'zip';
  /** Endpoint que lista os releases do repositório. */
  readonly releasesUrl: string;
  /**
   * Só tags que casam entram. O repositório também publica módulos do Starfinder
   * (`sf2e-*`) e o `pf2e-anachronism-*`, que aparecem na frente em `releases/latest` —
   * foi esse o engano de um briefing anterior (seção 7.1).
   */
  readonly tagPattern: RegExp;
  /** Nome do anexo com os dados. */
  readonly asset: string;
  /** Nome do anexo com o manifesto do sistema. */
  readonly manifestAsset: string;
  /** Pastas dentro do zip. */
  readonly insideZip: { readonly packs: string; readonly languages: string };
  /**
   * ⚠️ O arquivo no zip é o `basename` do `path` do manifesto, e NÃO o `name`
   * (briefing 7.2). `conditionitems` mora em `packs/conditions.json`.
   */
  readonly packFile: (pack: PackDeclaration) => string;
  /**
   * O arquivo de PASTAS do pack. O briefing 7.2 manda ignorá-lo como entidade — e está
   * certo, não é entidade. Mas ele carrega a organização do compêndio, que é a única
   * coisa que separa as 30 ações básicas das 196 de classe.
   */
  readonly packFoldersFile: (pack: PackDeclaration) => string;
}

/**
 * Canal do tipo `files`: arquivos soltos num branch do repositório.
 * Declarado para documentar a disposição, mas **ainda sem implementação** — o release
 * zip o substituiu (briefing 7.2). Só faria falta para conteúdo mais novo que o último
 * release. O `switch` em `releases.ts` obriga a tratar este caso se ele for ligado.
 */
export interface FilesChannel {
  readonly id: string;
  readonly kind: 'files';
  readonly manifest: string;
  readonly packsPrefix: string;
}

export type Channel = ZipChannel | FilesChannel;

const REPO = 'https://github.com/foundryvtt/pf2e';

export const CHANNELS = [
  {
    id: 'release-json-assets',
    kind: 'zip',
    releasesUrl: 'https://api.github.com/repos/foundryvtt/pf2e/releases',
    tagPattern: /^pf2e-(\d+)\.(\d+)\.(\d+)$/,
    asset: 'json-assets.zip',
    manifestAsset: 'system.json',
    insideZip: { packs: 'packs', languages: 'lang' },
    packFile: (pack) => `packs/${basename(pack.path)}.json`,
    packFoldersFile: (pack) => `packs/${basename(pack.path)}_folders.json`,
  },
  {
    // Reserva. O manifesto mudou de lugar quando o repositório passou a construir
    // Pathfinder e Starfinder juntos.
    id: 'branch-v14',
    kind: 'files',
    manifest: 'system.pf2e.json',
    packsPrefix: 'packs/pf2e',
  },
  {
    // Disposição antiga, congelada em abril de 2026 (sistema 7.9.1). Só referência.
    id: 'branch-v13',
    kind: 'files',
    manifest: 'static/system.json',
    packsPrefix: 'packs',
  },
] as const satisfies readonly Channel[];

/** O canal usado por padrão. */
export const DEFAULT_CHANNEL: ZipChannel = CHANNELS[0];

/**
 * A última versão conhecidamente boa.
 *
 * NÃO é mais "a versão do app". A versão em uso fica gravada no `meta` do armazenamento,
 * e o usuário sobe de versão pela engrenagem — sem recompilar nada. Ver OPEN-DECISIONS,
 * item 10.
 *
 * Esta constante serve a dois casos:
 *
 *   1. rede de segurança na instalação nova, se o release mais recente não decodificar;
 *   2. alvo fixo do teste de contrato, para ele testar sempre a mesma coisa.
 *
 * Subir de versão continua sendo ato deliberado (briefing, seção 8: a base do mestre e a
 * dos jogadores precisam bater durante a sessão) — só que agora o ato é um clique, e não
 * uma alteração de código seguida de reinstalação.
 */
export const KNOWN_GOOD_TAG = 'pf2e-8.4.1';

/** URL de um anexo de release, montada sem passar pela API. Usada só em mensagem. */
export function releasePageUrl(tag: string): string {
  return `${REPO}/releases/tag/${tag}`;
}
