/**
 * As pastas do compêndio.
 *
 * O briefing 7.2 diz que `<pack>_folders.json` "NÃO é entidade, ignore" — e está certo,
 * não é entidade. Mas é metadado útil: é a única coisa na base que separa as 30 ações
 * básicas das 196 de classe. Nenhum traço marca uma ação como básica.
 *
 * Cada documento traz `folder` com o ID da pasta; aqui montamos ID -> nome da pasta RAIZ,
 * subindo a cadeia de pais. Só a raiz porque são 20 valores, o que dá uma lista de filtro
 * navegável — o caminho completo daria 168.
 */

import { asArray, isRecord } from '../json';

/** ID da pasta -> nome da pasta de primeiro nível. */
export type FolderRoots = ReadonlyMap<string, string>;

interface FolderNode {
  readonly name: string;
  readonly parent: string | null;
}

export function parseFolderRoots(payload: unknown): FolderRoots {
  const nodes = new Map<string, FolderNode>();

  for (const item of asArray(payload, 'folders')) {
    if (!isRecord(item)) continue;
    const id = item['_id'];
    const name = item['name'];
    if (typeof id !== 'string' || typeof name !== 'string') continue;
    const parent = item['folder'];
    nodes.set(id, { name, parent: typeof parent === 'string' ? parent : null });
  }

  const roots = new Map<string, string>();
  for (const id of nodes.keys()) {
    let current = id;
    // O limite evita laço infinito se o dado vier com um ciclo de pastas.
    for (let depth = 0; depth < 16; depth++) {
      const node = nodes.get(current);
      if (!node) break;
      if (node.parent === null || !nodes.has(node.parent)) {
        roots.set(id, node.name);
        break;
      }
      current = node.parent;
    }
  }
  return roots;
}
