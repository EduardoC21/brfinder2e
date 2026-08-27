/**
 * Comando da Etapa 1: lista os packs do release com tamanho.
 *
 *   npm run packs                 tag fixada, com cache local
 *   npm run packs -- --latest     o release mais recente que casar com o padrão
 *   npm run packs -- --tag=pf2e-8.3.0
 *   npm run packs -- --type=Item  só os packs de um tipo
 *   npm run packs -- --no-cache   ignora o zip guardado e baixa de novo
 *
 * O cache mora em `.dados/`, que o .gitignore barra — conteúdo da Paizo não é
 * redistribuído (briefing, seção 7). Cachear é preocupação DESTE comando, não do
 * `core/`: o app em produção vai guardar em outro lugar, com outra política.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_CHANNEL,
  PINNED_TAG,
  loadInventory,
  resolveRelease,
  sortBySizeDesc,
  totalPackSize,
} from '@core/source/index';
import type { LoadedSource, PackListing, Progress } from '@core/source/index';
import { createFetchHttp } from '@platform/http-fetch';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE_DIR = resolve(ROOT, '.dados');

interface Flags {
  readonly latest: boolean;
  readonly tag: string | undefined;
  readonly type: string | undefined;
  readonly cache: boolean;
}

function parseFlags(argv: readonly string[]): Flags {
  let latest = false;
  let tag: string | undefined;
  let type: string | undefined;
  let cache = true;

  for (const arg of argv) {
    if (arg === '--latest') latest = true;
    else if (arg === '--no-cache') cache = false;
    else if (arg.startsWith('--tag=')) tag = arg.slice('--tag='.length);
    else if (arg.startsWith('--type=')) type = arg.slice('--type='.length);
    else throw new Error(`Opção desconhecida: ${arg}`);
  }
  return { latest, tag, type, cache };
}

function humanBytes(bytes: number): string {
  if (bytes < 1024) return `${String(bytes)} B`;
  const mib = bytes / 1024 / 1024;
  return mib < 1 ? `${(bytes / 1024).toFixed(1)} KiB` : `${mib.toFixed(1)} MiB`;
}

function padEnd(text: string, width: number): string {
  return text.length >= width ? text : text + ' '.repeat(width - text.length);
}

function padStart(text: string, width: number): string {
  return text.length >= width ? text : ' '.repeat(width - text.length) + text;
}

let lastPercent = -1;
function reportProgress(progress: Progress): void {
  if (progress.total === null) return;
  const percent = Math.floor((progress.loaded / progress.total) * 100);
  if (percent === lastPercent || percent % 10 !== 0) return;
  lastPercent = percent;
  process.stdout.write(`  baixando... ${String(percent)}%   \r`);
}

function printTable(packs: readonly PackListing[]): void {
  const nameWidth = Math.max(...packs.map((pack) => pack.name.length), 4);
  const fileWidth = Math.max(...packs.map((pack) => pack.file.length), 4);

  console.log(
    `  ${padEnd('NAME', nameWidth)}  ${padEnd('FILE', fileWidth)}  ${padStart('SIZE', 9)}`,
  );
  for (const pack of sortBySizeDesc(packs)) {
    const size = pack.size === null ? 'AUSENTE' : humanBytes(pack.size);
    console.log(
      `  ${padEnd(pack.name, nameWidth)}  ${padEnd(pack.file, fileWidth)}  ${padStart(size, 9)}`,
    );
  }
}

/**
 * Resolve o release primeiro (uma chamada de API, barata), porque é a tag que dá o nome
 * do arquivo de cache. Só depois decide entre ler do disco e baixar.
 */
async function load(flags: Flags): Promise<LoadedSource> {
  const http = createFetchHttp({ headers: { Accept: 'application/vnd.github+json' } });
  const channel = DEFAULT_CHANNEL;

  const tag = flags.latest ? undefined : (flags.tag ?? PINNED_TAG);
  const release = await resolveRelease(http, channel, tag === undefined ? {} : { tag });

  const path = resolve(CACHE_DIR, `json-assets-${release.tag}.zip`);
  const cached = flags.cache && existsSync(path) ? new Uint8Array(readFileSync(path)) : undefined;

  const loaded = await loadInventory(http, {
    channel,
    release,
    onProgress: reportProgress,
    ...(cached === undefined ? {} : { cachedZip: cached }),
  });

  if (flags.cache && !loaded.fromCache) {
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(path, loaded.zip);
  }
  return loaded;
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));

  const started = Date.now();
  const { release, inventory, fromCache } = await load(flags);
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);

  console.log('');
  console.log(`sistema   ${inventory.systemId} v${inventory.systemVersion}`);
  console.log(`release   ${release.tag}   publicado em ${release.publishedAt.slice(0, 10)}`);
  console.log(`zip       ${fromCache ? 'cache local' : 'baixado agora'}   (${elapsed}s)`);
  console.log('');

  const selected =
    flags.type === undefined
      ? inventory.packs
      : inventory.packs.filter((pack) => pack.type === flags.type);

  if (selected.length === 0) {
    const types = [...new Set(inventory.packs.map((pack) => pack.type))].sort();
    console.log(`Nenhum pack do tipo "${String(flags.type)}". Tipos: ${types.join(', ')}`);
    return;
  }

  const byType = new Map<string, PackListing[]>();
  for (const pack of selected) {
    const list = byType.get(pack.type) ?? [];
    list.push(pack);
    byType.set(pack.type, list);
  }

  for (const [type, packs] of [...byType].sort((a, b) => b[1].length - a[1].length)) {
    const bytes = packs.reduce((sum, pack) => sum + (pack.size ?? 0), 0);
    console.log(`── ${type}: ${String(packs.length)} packs, ${humanBytes(bytes)} ──`);
    printTable(packs);
    console.log('');
  }

  console.log(
    `TOTAL     ${String(inventory.packs.length)} packs declarados, ` +
      `${humanBytes(totalPackSize(inventory))} descomprimidos`,
  );

  // O relatório: nada some em silêncio.
  console.log('');
  console.log(`declarados e ausentes no zip : ${String(inventory.missing.length)}`);
  for (const file of inventory.missing) console.log(`  ! ${file}`);

  console.log(`no zip e fora do manifesto   : ${String(inventory.unlisted.length)}`);
  for (const entry of inventory.unlisted) {
    console.log(`  ? ${entry.name}  ${humanBytes(entry.size)}`);
  }

  console.log(`arquivos de idioma           : ${String(inventory.languages.length)}`);
  for (const language of inventory.languages) {
    const size = language.size === null ? 'AUSENTE' : humanBytes(language.size);
    console.log(`  ${language.lang}  ${padEnd(language.path, 26)} ${padStart(size, 9)}`);
  }
  console.log('');
}

try {
  await main();
} catch (error) {
  console.error('');
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
