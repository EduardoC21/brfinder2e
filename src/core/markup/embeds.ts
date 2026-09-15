/**
 * Os ALVOS dos `@Embed` de um HTML (Etapa 49): o que a página cola dentro de si e, por
 * isso, faz parte do que se lê — e do que se traduz. O alvo é a primeira palavra do corpo
 * da marca; o resto (`inline`, `hr=false`) é modo de exibição.
 */

import { parseMarkup } from './parse';

export function embedTarget(body: string): string {
  return body.trim().split(/\s+/)[0] ?? '';
}

export function embedTargets(html: string): string[] {
  const alvos: string[] = [];
  for (const token of parseMarkup(html)) {
    if (token.kind !== 'embed') continue;
    const alvo = embedTarget(token.body);
    if (alvo !== '' && !alvos.includes(alvo)) alvos.push(alvo);
  }
  return alvos;
}
