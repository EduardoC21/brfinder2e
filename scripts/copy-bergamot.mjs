/**
 * Copia o TRABALHADOR do Bergamot (o motor de tradução do Firefox, em WASM) de
 * `node_modules` para `public/bergamot/`, de onde o app o carrega como arquivo estático.
 *
 * Por que copiar e não importar: o trabalhador carrega dois irmãos pelo caminho relativo
 * (`importScripts('bergamot-translator-worker.js')` e o `.wasm` por `self.location`), e
 * o empacotador não segue esses caminhos. Como arquivo estático eles ficam onde o
 * trabalhador espera — no `vite dev`, no `vite build` e no Tauri. `public/bergamot/` fica
 * fora do git: é dependência, não fonte (MPL-2.0, de browsermt/bergamot-translator).
 *
 * Roda no `postinstall`. Os MODELOS (uns 22 MB por par de línguas) não passam por aqui:
 * o app os baixa na primeira tradução e guarda no armazenamento local.
 */

import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const origem = join(raiz, 'node_modules', '@browsermt', 'bergamot-translator', 'worker');
const destino = join(raiz, 'public', 'bergamot');

if (!existsSync(origem)) {
  console.warn(
    'copy-bergamot: node_modules/@browsermt/bergamot-translator/worker não existe; nada copiado.',
  );
  process.exit(0);
}

mkdirSync(destino, { recursive: true });
for (const nome of [
  'translator-worker.js',
  'bergamot-translator-worker.js',
  'bergamot-translator-worker.wasm',
]) {
  copyFileSync(join(origem, nome), join(destino, nome));
}
console.log('copy-bergamot: 3 arquivos em public/bergamot/');
