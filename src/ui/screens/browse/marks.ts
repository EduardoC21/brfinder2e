/**
 * As MARCAS do Foundry de um HTML, para a trava do editor (Etapa 43): a edição manual só
 * grava se todas as marcas do original continuarem, com o mesmo alvo. Contadas pelo alvo
 * (sem o rótulo entre chaves), porque o rótulo pode mudar e o alvo não. Pelo MESMO
 * tokenizador da leitura e da blindagem (`parseMarkup`): um regex próprio tropeçava no
 * `@Damage[6d6[fire]]`, que tem colchete dentro de colchete.
 */

import { parseMarkup } from '@core/markup/index';

function alvos(html: string): Map<string, number> {
  const contagem = new Map<string, number>();
  for (const token of parseMarkup(html)) {
    if (token.kind === 'text') continue;
    const alvo = token.raw.replace(/\{[^}]*\}$/, '');
    contagem.set(alvo, (contagem.get(alvo) ?? 0) + 1);
  }
  return contagem;
}

/** Os alvos do original que faltam no editado (a mais não é erro). Vazio = pode gravar. */
export function missingMarks(original: string, edited: string): string[] {
  const esperados = alvos(original);
  const achados = alvos(edited);
  const faltam: string[] = [];
  for (const [alvo, n] of esperados) {
    if ((achados.get(alvo) ?? 0) < n) faltam.push(alvo);
  }
  return faltam;
}
