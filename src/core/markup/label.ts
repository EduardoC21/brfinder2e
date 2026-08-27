/**
 * O texto de leitura dos tokens de referência cruzada.
 *
 * Sem isto, `@Check[flat|showDC:all|dc:15]` aparece no meio da prosa como
 * "roll a flat|showDC:all|dc:15" — que foi exatamente o que apareceu na tela quando
 * ligamos a descrição pela primeira vez. E não é um caso raro: medido na base inteira,
 * a esmagadora maioria destes tokens NÃO tem rótulo escrito à mão.
 *
 *   @Check      17.434 sem rótulo  contra    140 com
 *   @Damage     14.545 sem rótulo  contra  1.362 com
 *   @Template    4.544 sem rótulo  contra    506 com
 *
 * O texto gerado sai em inglês porque o texto ao redor está em inglês — o corpo do
 * Paizo é inglês, e a tradução é a Etapa 15. Enfiar palavra em português no meio de uma
 * frase inglesa seria pior que a frase inteira em inglês.
 */

/** `crimson-fulcrum-lens` → `Crimson Fulcrum Lens`. */
function titulo(slug: string): string {
  return slug
    .split(/[-_]/)
    .filter((parte) => parte !== '')
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join(' ');
}

/** Os segmentos depois do primeiro, como pares. `basic` sozinho vira `basic: ''`. */
function parametros(segmentos: readonly string[]): Map<string, string> {
  const saida = new Map<string, string>();
  for (const segmento of segmentos) {
    const corte = segmento.indexOf(':');
    if (corte < 0) saida.set(segmento.trim(), '');
    else saida.set(segmento.slice(0, corte).trim(), segmento.slice(corte + 1).trim());
  }
  return saida;
}

/**
 * `flat|showDC:all|dc:15` → `DC 15 Flat`.
 *
 * A CD só entra quando é número literal: 15.696 tokens trazem `dc`, e parte vem como
 * `dc:{societyDC}` — uma variável que só o Foundry resolve. Mostrar a chave crua seria
 * pior que omitir.
 */
export function checkLabel(body: string): string {
  const segmentos = body.split('|');
  const nome = titulo(segmentos[0] ?? '');
  const params = parametros(segmentos.slice(1));

  const dc = params.get('dc');
  const partes: string[] = [];
  if (dc !== undefined && /^\d+$/.test(dc)) partes.push(`DC ${dc}`);
  if (params.has('basic')) partes.push('basic');
  partes.push(nome);
  return partes.join(' ');
}

/**
 * `2d6[fire]` → `2d6 fire damage`; `(3[splash])[acid]` → `3 acid splash damage`.
 *
 * O último grupo entre colchetes é o tipo de dano; os anteriores são modificadores e vão
 * depois, que é a ordem em que o próprio Paizo escreve os 1.362 rótulos à mão.
 *
 * 2.378 fórmulas referem `@actor` ou `@item` — valores que só existem com uma ficha na
 * mão. Nesses casos a fórmula é OMITIDA e sobra o tipo: "persistent acid damage" é
 * verdade, "(1d6 + @item.system.runes.potency) acid damage" é ruído.
 */
export function damageLabel(body: string): string {
  const cabeca = body.split('|')[0] ?? '';
  const grupos = [...cabeca.matchAll(/\[([^\]]*)\]/g)].map((achado) => achado[1] ?? '');

  const formula = cabeca
    .replace(/\[[^\]]*\]/g, '')
    .replace(/^\((.*)\)$/, '$1')
    .trim();

  const palavras = grupos.map((grupo) =>
    grupo
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item !== ''),
  );

  const partes: string[] = [];
  if (formula !== '' && !/[@{]/.test(formula)) partes.push(formula);
  const tipo = palavras[palavras.length - 1];
  if (tipo) partes.push(...tipo);
  for (const anterior of palavras.slice(0, -1)) partes.push(...anterior);
  partes.push('damage');
  return partes.join(' ');
}

/** `type:emanation|distance:10` → `10-foot emanation`. */
export function templateLabel(body: string): string {
  const segmentos = body.split('|');
  const primeiro = segmentos[0] ?? '';
  const forma = (primeiro.startsWith('type:') ? primeiro.slice(5) : primeiro).trim();
  const distancia = parametros(segmentos.slice(1)).get('distance');

  if (distancia === undefined || !/^\d+$/.test(distancia)) return forma;
  return `${distancia}-foot ${forma}`;
}
