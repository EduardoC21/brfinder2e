/**
 * O POLIMENTO do português que sai de um motor de tradução (Etapa 38; arquivo próprio
 * desde a 42): o que é regra da língua, não escolha de tradução. Medido na amostra: os
 * ordinais saíam "9o nível", "4a:" — o motor não tem o "º" — e o gênero variava entre
 * "3o" e "4a" para o mesmo "3rd/4th". Nível e círculo são masculinos: "º". Só em texto,
 * nunca dentro de uma marca ou tag.
 */
export function polishPortuguese(html: string): string {
  return html
    .split(/(<[^>]+>|@\w+\[[^\]]*\](?:\{[^}]*\})?|\[\[[^\]]*\]\](?:\{[^}]*\})?)/)
    .map((parte, indice) =>
      indice % 2 === 1 ? parte : parte.replace(/\b(\d+)[oa]\b(?=[\s:;,.)]|$)/g, '$1º'),
    )
    .join('');
}
