/**
 * O texto de leitura dos tokens de referência.
 *
 * A esmagadora maioria destes tokens não traz rótulo escrito à mão — medido na base
 * inteira, `@Check` 17.434 sem contra 140 com, `@Damage` 14.545 contra 1.362,
 * `@Template` 4.544 contra 506. Sem gerar o texto, a prosa mostra o corpo cru.
 *
 * ⚠️ A REGRA CENTRAL, e a que eu errei na primeira versão: **a palavra substantiva já
 * está no texto ao redor**. Medido:
 *
 *   `@Damage`      seguido da palavra "damage"     11.220 de 14.545  (77,1%)
 *   `@Check`       seguido de "save" ou "saving"    8.577 de 17.434
 *   `@Check[flat]` seguido de "check"                 120 de  1.163  (10,3%)
 *
 * Então acrescentar "damage" ou "save" DUPLICA: saía "1d10 fire damage damage". A única
 * exceção é o flat check, onde em 89,7% dos casos o texto não completa e "DC 5 flat"
 * sozinho não é frase — ali a palavra entra.
 *
 * O texto gerado sai em inglês porque o texto ao redor está em inglês. A tradução é a
 * Etapa 15, e é dela o trabalho de traduzir a frase inteira.
 */

/** `crimson-fulcrum-lens` → `Crimson Fulcrum Lens`. */
function titulo(slug: string): string {
  return slug
    .split(/[-_\s]+/)
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
 * `flat|showDC:all|dc:15` → `DC 15 flat check`; `reflex|basic` → `basic Reflex`.
 *
 * Maiúsculas seguem o PF2e: salvamento e perícia são nome próprio (`Reflex`, `Athletics`,
 * `Perception`); `flat check` é substantivo comum e fica minúsculo.
 *
 * A CD só entra quando é número literal. 15.696 tokens trazem `dc`, e parte vem como
 * `dc:{societyDC}` — variável que só o Foundry resolve. Chave crua é pior que omissão.
 */
export function checkLabel(body: string): string {
  const segmentos = body.split('|');
  const slug = (segmentos[0] ?? '').trim();
  const params = parametros(segmentos.slice(1));
  const ehFlat = slug === 'flat';

  const partes: string[] = [];
  const dc = params.get('dc');
  if (dc !== undefined && /^\d+$/.test(dc)) partes.push(`DC ${dc}`);
  if (params.has('basic')) partes.push('basic');
  partes.push(ehFlat ? 'flat check' : titulo(slug));
  return partes.join(' ');
}

/**
 * `1d10[fire]` → `1d10 fire`; `(3[splash])[acid]` → `3 acid splash`.
 *
 * O último grupo entre colchetes é o tipo de dano; os anteriores são modificadores e vão
 * depois, que é a ordem em que o próprio Paizo escreve os 1.362 rótulos à mão
 * (`@Damage[(3[splash])[acid]]{3 acid splash damage}`).
 *
 * 2.378 fórmulas referem `@actor` ou `@item` — valores que só existem com uma ficha na
 * mão. Nesses casos a fórmula é OMITIDA e sobra o tipo: "persistent acid" é verdade,
 * "(1d6 + @item.system.runes.potency) acid" é ruído.
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

/**
 * `[[/r 1d4 #Recharge Searing Wave]]` → `1d4`; `[[/act sense-direction]]` → `Sense Direction`.
 *
 * Duas formas, medidas na base:
 *
 *   `/act`  1.170 ocorrências, ZERO com `#`. O corpo é o slug da ação, às vezes com
 *           `dc=28` colado. Vira o nome da ação.
 *   `/r`, `/gmr`, `/br`  839 ocorrências, 175 com `#`. O `#` abre o *flavor* da rolagem —
 *           um rótulo para a janela de dados do Foundry, não parte da frase. Sai fora.
 *           Vem com e sem espaço antes (`1d4+1#Lost Omens`), então o corte é no `#`.
 */
/** O slug de um `[[/act …]]`: o corpo sem o `dc=`/`|` que às vezes vem colado. */
export function actSlug(body: string): string {
  return (body.split(/\s*(?:dc=|\|)/)[0] ?? body).trim();
}

/**
 * O ALVO de um `[[/act]]` no vocabulário da ponte (Etapa 52): `act:<slug>`. A ponte resolve
 * pelo slug na fonte de ações — é o que faz "Make an Impression" e "Request" virarem link.
 */
export function actTarget(body: string): string {
  return `act:${actSlug(body)}`;
}

export function rollLabel(command: string, body: string): string {
  if (command === 'act') return titulo(actSlug(body));
  return (body.split('#')[0] ?? body).trim();
}
