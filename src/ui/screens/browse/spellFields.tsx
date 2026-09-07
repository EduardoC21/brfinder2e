import { isRecord } from '@core/json';
import { defenseTokens, type BrowseEntity, type DefenseFields } from '@core/browse/index';
import type { SpellCast } from '@core/normalization/index';
import { strings } from '@i18n/index';

const t = strings.browse;

/**
 * Os três campos de magia que juntam mais de uma chave numa frase só.
 *
 * Moram aqui, e não dentro da lista ou do detalhe, porque os dois desenham os mesmos
 * valores — e duas cópias divergiriam no primeiro caso especial. Devolvem TEXTO, e não
 * componente, porque não têm glifo nenhum: quem tem é o custo, que mora em `CastCost`.
 */

function ler(entity: BrowseEntity, field: string): Record<string, unknown> | null {
  const base = entity.base;
  if (!isRecord(base)) return null;
  const valor = base[field];
  return isRecord(valor) ? valor : null;
}

function texto(entity: BrowseEntity, field: string): string {
  const base = entity.base;
  if (!isRecord(base)) return '';
  const valor = base[field];
  return typeof valor === 'string' ? valor : '';
}

/**
 * A DEFESA, na linha que o livro escreve: "CA", "Vontade básico", "CA e Fortitude básico".
 *
 * Quem decide QUAIS são as defesas é `defenseTokens`, em `core/` — a mesma leitura que o
 * filtro usa, para o que se lê na linha e o que se acha no filtro nunca discordarem. Aqui
 * só se escolhe a palavra, e se cola o "básico" no salvamento a que ele pertence.
 */
export function defenseText(entity: BrowseEntity, fields: DefenseFields): string {
  const tokens = defenseTokens(entity, fields);
  if (tokens.length === 0) return '';

  const save = ler(entity, fields.field);
  const stat = save === null || typeof save['statistic'] !== 'string' ? '' : save['statistic'];
  const basico = save !== null && save['basic'] === true;

  return tokens
    .map((token) => {
      const nome = t.defense.save[token] ?? t.defense.passive[token] ?? token;
      // "básico" é do SALVAMENTO, e não da CA: "CA e Fortitude básico".
      return token === stat && basico ? `${nome} ${t.defense.basic}` : nome;
    })
    .join(` ${t.defense.and} `);
}

/**
 * A DURAÇÃO, com "sustentada" junto.
 *
 * São eixos diferentes e a fonte os guarda separados: 275 magias são sustentadas, e
 * algumas delas TAMBÉM trazem um limite escrito. Sem duração nenhuma a magia é
 * instantânea, e aí a linha some — o livro diz isso com a ausência, e nós também.
 */
export function durationText(entity: BrowseEntity, field: string): string {
  const quanto = texto(entity, field);
  const sustentada =
    entity.base !== null && isRecord(entity.base) && entity.base['sustained'] === true;
  if (sustentada) return quanto === '' ? t.duration.sustained : t.duration.sustainedFor(quanto);
  return quanto;
}

/** O custo de conjurar, já decodificado pela receita. Nulo quando a fonte não tem o campo. */
export function spellCast(entity: BrowseEntity, field: string): SpellCast | null {
  const cru = ler(entity, field);
  if (cru === null || !isRecord(cru['from'])) return null;
  return cru as unknown as SpellCast;
}

/** A ÁREA: a prosa quando existe (20 das 453), senão o par tipo + valor. */
export function areaText(entity: BrowseEntity, field: string): string {
  const area = ler(entity, field);
  if (area === null) return '';
  const detalhe = typeof area['details'] === 'string' ? area['details'] : '';
  if (detalhe !== '') return detalhe;
  const tipo = typeof area['type'] === 'string' ? area['type'] : '';
  const bruto = area['value'];
  const valor = typeof bruto === 'number' ? String(bruto) : '';
  return `${tipo.charAt(0).toUpperCase()}${tipo.slice(1)} ${valor}`.trim();
}

/** O RITUAL, em três frases. Só os 167 rituais têm. */
export function ritualLines(entity: BrowseEntity, field: string): readonly string[] {
  const ritual = ler(entity, field);
  if (ritual === null) return [];
  const linhas: string[] = [];
  const primario = typeof ritual['primaryCheck'] === 'string' ? ritual['primaryCheck'] : '';
  if (primario !== '') linhas.push(t.ritual.primary(primario));
  const casters = ritual['secondaryCasters'];
  // Nulo não é zero: zero é "não precisa de ajuda", nulo é "a fonte não diz".
  if (casters === null) linhas.push(t.ritual.castersUnknown);
  else if (typeof casters === 'number') linhas.push(t.ritual.casters(casters));
  const checks = typeof ritual['secondaryChecks'] === 'string' ? ritual['secondaryChecks'] : '';
  if (checks !== '') linhas.push(checks);
  return linhas;
}
