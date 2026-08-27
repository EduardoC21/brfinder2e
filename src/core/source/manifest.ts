/** Leitura e validação do manifesto do sistema (`system.json`). */

import { asArray, asRecord, stringField } from '../json';
import type { LanguageDeclaration, Manifest, PackDeclaration } from './types';

/**
 * Valida o manifesto.
 *
 * Lê só o que a camada de fonte precisa. O manifesto tem dezenas de outros campos
 * (compatibilidade com o core, autores, URLs) que não interessam aqui — e ignorá-los
 * é seguro porque nenhum deles muda ONDE os arquivos estão.
 */
export function parseManifest(payload: unknown): Manifest {
  const root = asRecord(payload, 'system.json');

  const packs = asArray(root['packs'], 'system.json.packs').map((item, index) => {
    const path = `system.json.packs[${String(index)}]`;
    const record = asRecord(item, path);
    return {
      name: stringField(record, 'name', path),
      path: stringField(record, 'path', path),
      label: stringField(record, 'label', path),
      type: stringField(record, 'type', path),
    } satisfies PackDeclaration;
  });

  const languages = asArray(root['languages'], 'system.json.languages').map((item, index) => {
    const path = `system.json.languages[${String(index)}]`;
    const record = asRecord(item, path);
    return {
      lang: stringField(record, 'lang', path),
      name: stringField(record, 'name', path),
      path: stringField(record, 'path', path),
    } satisfies LanguageDeclaration;
  });

  return {
    id: stringField(root, 'id', 'system.json'),
    version: stringField(root, 'version', 'system.json'),
    packs,
    languages,
  };
}

/**
 * Os arquivos de idioma de um idioma, na ordem em que o manifesto declara.
 *
 * ⚠️ Briefing 7.7: o inglês tem QUATRO arquivos e o Foundry funde todos. As chaves de
 * `prompt` dos `ChoiceSet` estão em `re-en.json`, não em `en.json` — ler só o primeiro
 * deixa todo painel de escolha mostrando a chave crua em vez do texto.
 */
export function languageFiles(manifest: Manifest, lang: string): readonly LanguageDeclaration[] {
  return manifest.languages.filter((entry) => entry.lang === lang);
}
