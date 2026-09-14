/**
 * AS FAMÍLIAS DE TERMOS da tabela de idioma (Etapa 35, pelo autor: "aprender com os
 * padrões da comunidade e alimentar o glossário do tradutor").
 *
 * A tabela de idioma do sistema (`lang/en.json`, no zip) e a da comunidade (`pt-BR.json`,
 * no módulo) têm as MESMAS chaves — `PF2E.ConditionTypeFrightened` é "Frightened" numa e
 * "Amedrontado" na outra. Emparelhar as duas pela chave dá o glossário inteiro sem
 * copiar nada à mão: o que a comunidade traduziu, o tradutor passa a respeitar.
 *
 * Só as famílias que são TERMO DE JOGO entram. A tabela tem 4.898 chaves e a maioria é
 * interface ("Cancel", "Save", "Actor") — e "Save" → "Salvar" no meio de uma descrição
 * seria um estrago: ali "save" é salvamento. Por isso a lista é fechada, por prefixo.
 *
 * O lado inglês se guarda na sincronização (`glossary/terms-en`, com a base); o lado
 * português, no download do pacote (`trans/<língua>/glossary/terms`, com as traduções).
 * `pairTerms` junta os dois em frases para a blindagem.
 */

import type { Phrase } from './shield';

/** Os prefixos de chave que são vocabulário do jogo. `exact` quando o termo é NOME. */
export const TERM_FAMILIES: readonly { readonly prefix: string; readonly exact: boolean }[] = [
  { prefix: 'PF2E.ConditionType', exact: true },
  { prefix: 'PF2E.Trait', exact: true },
  { prefix: 'PF2E.WeaponGroup', exact: false },
  { prefix: 'PF2E.ArmorGroup', exact: false },
  { prefix: 'PF2E.WeaponType', exact: false },
  { prefix: 'PF2E.ArmorType', exact: false },
  { prefix: 'PF2E.ActorSize', exact: false },
  { prefix: 'PF2E.Skill.', exact: false },
  { prefix: 'PF2E.Saves', exact: false },
  { prefix: 'PF2E.ProficiencyLevel', exact: false },
  { prefix: 'PF2E.Ability', exact: false },
  { prefix: 'PF2E.Damage.RollFlavor.', exact: false },
  { prefix: 'PF2E.Damage.IWR.Type.', exact: false },
  { prefix: 'PF2E.Item.Feat.Category.', exact: false },
  { prefix: 'PF2E.Item.Deity.Domain.', exact: true },
  { prefix: 'PF2E.Duration.', exact: false },
  { prefix: 'PF2E.Area.Shape.', exact: false },
  /* "Free" → "Livre" casava "break free" e "free Avistan": só com a caixa do nome. */
  { prefix: 'PF2E.ActionType', exact: true },
  { prefix: 'PF2E.AbilityFree', exact: true },
  { prefix: 'PF2E.Focus.', exact: false },
  { prefix: 'PF2E.Item.Spell.Rank.', exact: false },
  { prefix: 'PF2E.PerceptionLabel', exact: false },
  { prefix: 'PF2E.SpellLevelHeightened', exact: false },
];

/** A descrição do traço não é termo: é prosa, e tem chave própria. */
const FORA = ['PF2E.TraitDescription', 'PF2E.Traits.', 'PF2E.Item.Deity.Domain.'];
const DOMINIO_LABEL = /^PF2E\.Item\.Deity\.Domain\.[A-Za-z]+\.Label$/;

function ehTermo(key: string): boolean {
  if (DOMINIO_LABEL.test(key)) return true;
  if (FORA.some((prefixo) => key.startsWith(prefixo))) return false;
  return TERM_FAMILIES.some((familia) => key.startsWith(familia.prefix));
}

/** Um valor que é termo: curto, sem chaves de interpolação, sem HTML. */
function valorDeTermo(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 40 &&
    !value.includes('{') &&
    !value.includes('<') &&
    value.split(' ').length <= 4
  );
}

/** As chaves das famílias, com o valor, de uma tabela de idioma já achatada. */
export function pickTerms(language: ReadonlyMap<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of language) {
    if (ehTermo(key) && valorDeTermo(value)) out[key] = value;
  }
  return out;
}

const NUNCA: ReadonlySet<string> = new Set(['label', 'header', 'none', 'other', 'all']);

/**
 * Emparelha as duas tabelas pela chave e devolve as frases para a blindagem. Iguais dos
 * dois lados (o "Fortitude" que é "Fortitude") saem: não há o que proteger. Valores de
 * rótulo genérico ("Label", "None") também.
 */
export function pairTerms(
  en: Readonly<Record<string, string>>,
  pt: Readonly<Record<string, string>>,
): Phrase[] {
  const frases = new Map<string, Phrase>();
  for (const [key, termoEn] of Object.entries(en)) {
    const termoPt = pt[key];
    if (termoPt === undefined || termoPt === termoEn) continue;
    if (NUNCA.has(termoEn.toLowerCase())) continue;
    /* O prefixo mais LONGO decide: `PF2E.AbilityFree` (exato) antes de `PF2E.Ability`. */
    const familia = TERM_FAMILIES.filter((f) => key.startsWith(f.prefix)).sort(
      (a, b) => b.prefix.length - a.prefix.length,
    )[0];
    const exact = familia?.exact === true;
    /* "air", "day", "Cha": curto demais para casar sem caixa exata — sairia em qualquer frase. */
    if (!exact && termoEn.length < 4) continue;
    /* Uma chave por termo, em qualquer caixa: a blindagem faz uma passada só. */
    const chave = termoEn.toLowerCase();
    if (!frases.has(chave)) frases.set(chave, { en: termoEn, pt: termoPt, exact });
  }
  return [...frases.values()];
}

/** As frases fixas do `dictionary.json` do pacote: `{campo: {en: pt}}` → frases, sem caixa. */
export function dictionaryPhrases(
  dictionary: Readonly<Record<string, Readonly<Record<string, string>>>>,
): Phrase[] {
  const frases = new Map<string, Phrase>();
  for (const porCampo of Object.values(dictionary)) {
    for (const [en, pt] of Object.entries(porCampo)) {
      if (en === pt || en.length < 4) continue;
      const chave = en.toLowerCase();
      if (!frases.has(chave)) frases.set(chave, { en, pt });
    }
  }
  return [...frases.values()];
}

/**
 * Os NOMES do pacote que valem solto na prosa:
 *
 * - condição e ação, como frases EXATAS quando são UMA palavra ("Strike" é o golpe,
 *   "strike" pode ser o verbo); com duas ou mais, em qualquer caixa — a tabela de
 *   progressão lista "reactive strike" em minúscula, e "reactive strike" não é outra coisa;
 * - habilidade de classe com DUAS ou mais palavras, em qualquer caixa — a tabela de
 *   progressão as lista em minúscula ("reactive strike, shield block"); as de uma palavra
 *   ficam de fora porque "Battle" é "Mistério de Batalha" e "Time" é "Tempo";
 * - "<classe> feat" → "talento de <Classe>": medido, o tradutor separava a classe do
 *   talento ("Guerreiro talento").
 */
export function namePhrases(
  names: Readonly<Record<string, Readonly<Record<string, string>>>>,
): Phrase[] {
  const frases: Phrase[] = [];
  for (const tipo of ['condition', 'action']) {
    for (const [en, pt] of Object.entries(names[tipo] ?? {})) {
      if (en !== pt && /^[A-Z]/.test(en)) frases.push({ en, pt, exact: !en.includes(' ') });
    }
  }
  for (const [en, pt] of Object.entries(names['feature'] ?? {})) {
    if (en !== pt && en.includes(' ') && !/[()]/.test(en)) frases.push({ en, pt });
  }
  for (const [en, pt] of Object.entries(names['class'] ?? {})) {
    frases.push({ en: `${en} feat`, pt: `talento de ${pt}` });
  }
  return frases;
}
