/**
 * Comando da Etapa 3: roda a receita e grava as três camadas.
 *
 *   npm run normalize
 *   npm run normalize -- --report-only   só imprime, não grava
 *
 * As três camadas do briefing 5.2, em `.dados/` (barrado pelo .gitignore — conteúdo da
 * Paizo não é redistribuído):
 *
 *   raw/conditionitems.json   os bytes do pack, exatamente como vieram do zip
 *   base/condition.json       a projeção leve
 *   desc/condition.json       as descrições, chaveadas por UUID
 *
 * `raw/` é gravado antes de qualquer projeção, e nunca a partir dela. Jogar fora na
 * importação é irreversível; guardar não é (ver OPEN-DECISIONS, item 1).
 *
 * Gravar em disco com `node:fs` é escolha DESTE comando. O app tem outro hospedeiro e
 * outra política de armazenamento — a camada `core/store/` com porta própria entra na
 * Etapa 4, junto com a tela de sincronização que vai precisar dela.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_CHANNEL,
  KNOWN_GOOD_TAG,
  languageFiles,
  loadInventory,
  readEntries,
  readTextEntry,
  resolveRelease,
} from '@core/source/index';
import {
  conditionRecipe,
  formatReport,
  isClean,
  mergeLanguageFiles,
  run,
} from '@core/normalization/index';
import { createFetchHttp } from '@platform/http-fetch';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = resolve(ROOT, '.dados');

function write(layer: string, file: string, contents: string | Uint8Array): string {
  const dir = resolve(DATA, layer);
  mkdirSync(dir, { recursive: true });
  const path = resolve(dir, file);
  writeFileSync(path, contents);
  return `.dados/${layer}/${file}`;
}

function humanBytes(bytes: number): string {
  const kib = bytes / 1024;
  return kib < 1024 ? `${kib.toFixed(1)} KiB` : `${(kib / 1024).toFixed(1)} MiB`;
}

async function main(): Promise<void> {
  const reportOnly = process.argv.slice(2).includes('--report-only');
  const http = createFetchHttp({ headers: { Accept: 'application/vnd.github+json' } });

  const release = await resolveRelease(http, DEFAULT_CHANNEL, { tag: KNOWN_GOOD_TAG });
  const cache = resolve(DATA, `json-assets-${release.tag}.zip`);
  const cached = existsSync(cache) ? new Uint8Array(readFileSync(cache)) : undefined;

  const loaded = await loadInventory(http, {
    channel: DEFAULT_CHANNEL,
    release,
    ...(cached === undefined ? {} : { cachedZip: cached }),
  });
  if (!loaded.fromCache) {
    mkdirSync(DATA, { recursive: true });
    writeFileSync(cache, loaded.zip);
  }

  const packName = conditionRecipe.packs[0];
  const pack = loaded.inventory.packs.find((entry) => entry.name === packName);
  if (!pack) throw new Error(`O pack "${String(packName)}" não está no manifesto do release.`);

  // ── raw/ primeiro, com os bytes exatos da entrada do zip ────────────────────
  const rawBytes = readEntries(loaded.zip, [pack.file]).get(pack.file);
  if (!rawBytes) throw new Error(`Entrada "${pack.file}" não encontrada no zip.`);

  const documents: unknown = JSON.parse(new TextDecoder().decode(rawBytes));
  if (!Array.isArray(documents)) throw new Error(`${pack.file} não é um array de documentos.`);

  const language = mergeLanguageFiles(
    languageFiles(loaded.manifest, 'en').map(
      (entry) => JSON.parse(readTextEntry(loaded.zip, entry.path)) as unknown,
    ),
  );

  const result = run(conditionRecipe, documents, { language });

  console.log('');
  console.log(`sistema   ${loaded.inventory.systemId} v${loaded.inventory.systemVersion}`);
  console.log(
    `pack      ${String(packName)} → ${pack.file}   (${String(documents.length)} documentos)`,
  );
  console.log(
    `idioma    ${String(language.size)} chaves, de ${String(languageFiles(loaded.manifest, 'en').length)} arquivos`,
  );
  console.log('');
  console.log(
    `receita "${result.type}"   ${String(result.entities.length)}/${String(result.total)} normalizadas   ` +
      `${String(result.failures.length)} falhas`,
  );

  for (const failure of result.failures) {
    console.log(`  ! ${failure.name} (${failure.id})  ${failure.message}`);
  }

  console.log(formatReport(result.report));

  if (!isClean(result.report)) {
    console.error('Relatório NÃO está limpo: há caminho por decidir. Ver a lista acima.');
    process.exitCode = 1;
  }

  if (reportOnly) return;

  const written = [
    write('raw', `${String(packName)}.json`, rawBytes),
    write(
      'base',
      `${result.type}.json`,
      JSON.stringify(
        {
          systemVersion: loaded.inventory.systemVersion,
          type: result.type,
          entities: result.entities.map((entity) => ({
            id: entity.identity.id,
            uuid: entity.identity.uuid,
            ...entity.base,
          })),
        },
        null,
        2,
      ),
    ),
    write(
      'desc',
      `${result.type}.json`,
      JSON.stringify(
        {
          systemVersion: loaded.inventory.systemVersion,
          type: result.type,
          entries: Object.fromEntries(
            result.entities.map((entity) => [entity.identity.uuid, entity.desc]),
          ),
        },
        null,
        2,
      ),
    ),
  ];

  console.log('gravado:');
  for (const path of written) {
    console.log(`  ${path.padEnd(34)} ${humanBytes(readFileSync(resolve(ROOT, path)).byteLength)}`);
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
