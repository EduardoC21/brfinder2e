/**
 * Leitura do arquivo compactado.
 *
 * A biblioteca é a `fflate` — JavaScript puro, roda igual em Node, no navegador e na
 * webview do Tauri. Alternativa descartada: o `zlib` do Node, que resolveria hoje mas
 * obrigaria a uma segunda implementação quando a tela de sincronização existir.
 *
 * O detalhe que importa: `unzipSync` chama `filter` com os metadados de cada entrada
 * ANTES de inflar. Devolvendo `false` para tudo, lemos os 158 nomes e tamanhos em ~1 ms
 * sem materializar os 178 MB descomprimidos. Medido contra o zip real do `pf2e-8.4.1`.
 */

import { unzipSync } from 'fflate';

import type { ArchiveEntry } from './types';

export class ArchiveError extends Error {
  constructor(message: string, options?: { cause: unknown }) {
    super(message, options);
    this.name = 'ArchiveError';
  }
}

/** Diretórios dentro do zip aparecem como entradas de tamanho zero terminadas em `/`. */
function isDirectory(name: string): boolean {
  return name.endsWith('/');
}

/** Lista nome e tamanho de cada arquivo, sem descomprimir nenhum. */
export function listEntries(zip: Uint8Array): ArchiveEntry[] {
  const entries: ArchiveEntry[] = [];
  try {
    unzipSync(zip, {
      filter: (file) => {
        if (!isDirectory(file.name)) {
          entries.push({
            name: file.name,
            size: file.originalSize,
            compressedSize: file.size,
          });
        }
        return false; // nada é inflado
      },
    });
  } catch (cause) {
    throw new ArchiveError('Falha ao ler o índice do arquivo compactado.', { cause });
  }
  return entries;
}

/**
 * Descomprime apenas as entradas pedidas.
 *
 * Existe para a Etapa 2 em diante: ler um pack por vez custa memória de um pack, não dos
 * 178 MB. A camada de normalização vai consumir isto um tipo por vez (briefing 3.3).
 */
export function readEntries(zip: Uint8Array, names: readonly string[]): Map<string, Uint8Array> {
  const wanted = new Set(names);
  let result: Record<string, Uint8Array>;
  try {
    result = unzipSync(zip, { filter: (file) => wanted.has(file.name) });
  } catch (cause) {
    throw new ArchiveError(`Falha ao descomprimir ${String(wanted.size)} entrada(s).`, { cause });
  }

  const found = new Map<string, Uint8Array>(Object.entries(result));
  const missing = names.filter((name) => !found.has(name));
  if (missing.length > 0) {
    throw new ArchiveError(`Entradas ausentes no arquivo: ${missing.join(', ')}`);
  }
  return found;
}

/** Descomprime uma entrada e decodifica como UTF-8. */
export function readTextEntry(zip: Uint8Array, name: string): string {
  const bytes = readEntries(zip, [name]).get(name);
  if (!bytes) throw new ArchiveError(`Entrada "${name}" não encontrada.`);
  return new TextDecoder('utf-8').decode(bytes);
}
