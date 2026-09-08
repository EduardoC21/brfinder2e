/**
 * TESTE DE CONTRATO da receita de `skill` — as 17 de verdade, e a junção com as ações.
 *
 * Fora do `npm test`: baixa 34 MiB. Roda com `npm run test:contract`, e semanalmente em CI.
 */

import { beforeAll, describe, expect, it } from 'vitest';

import { KNOWN_GOOD_TAG, loadInventory, readTextEntry } from '@core/source/index';
import { createFetchHttp } from '@platform/http-fetch';
import { isClean } from '../report';
import { run, type RunResult } from '../run';
import { actionRecipe } from './action';
import { skillRecipe, type SkillBase, type SkillDesc } from './skill';

const http = createFetchHttp({ headers: { Accept: 'application/vnd.github+json' } });
let result: RunResult<SkillBase, SkillDesc>;
let uuidsDasAcoes: Set<string>;

beforeAll(async () => {
  const loaded = await loadInventory(http, { tag: KNOWN_GOOD_TAG });

  const jornais = loaded.inventory.packs.find((entry) => entry.name === 'journals');
  if (!jornais) throw new Error('o pack journals sumiu do manifesto');
  const documents = JSON.parse(readTextEntry(loaded.zip, jornais.file)) as unknown[];
  result = run(skillRecipe, [{ pack: 'journals', documents }]);

  /* As ações, para provar que as referências da tabela apontam para algo que existe. */
  const acoes = loaded.inventory.packs.find((entry) => entry.name === 'actionspf2e');
  if (!acoes) throw new Error('o pack actionspf2e sumiu do manifesto');
  const documentosDeAcao = JSON.parse(readTextEntry(loaded.zip, acoes.file)) as unknown[];
  const rodada = run(actionRecipe, [{ pack: 'actionspf2e', documents: documentosDeAcao }]);
  uuidsDasAcoes = new Set(rodada.entities.map((entidade) => entidade.identity.uuid));
}, 180_000);

describe('as 17 perícias reais', () => {
  it('normaliza todas, sem nenhuma falha', () => {
    expect(result.failures).toEqual([]);
    expect(result.entities).toHaveLength(17);
  });

  it('o relatório fica limpo', () => {
    expect(result.report.unmapped, JSON.stringify(result.report.unmapped, null, 1)).toEqual([]);
    expect(isClean(result.report)).toBe(true);
  });
});

describe('o que as 17 confirmam', () => {
  const base = (): readonly SkillBase[] => result.entities.map((entity) => entity.base);

  it('são as 17 do jogo, em ordem alfabética', () => {
    expect(base().map((skill) => skill.name)).toEqual([
      'Acrobatics',
      'Arcana',
      'Athletics',
      'Crafting',
      'Deception',
      'Diplomacy',
      'Intimidation',
      'Lore',
      'Medicine',
      'Nature',
      'Occultism',
      'Performance',
      'Religion',
      'Society',
      'Stealth',
      'Survival',
      'Thievery',
    ]);
  });

  it('cada uma tem um atributo-chave, e são os cinco esperados', () => {
    const atributos = new Set(base().map((skill) => skill.attribute));
    expect(atributos).toEqual(
      new Set(['Dexterity', 'Strength', 'Intelligence', 'Wisdom', 'Charisma']),
    );
    expect(base().find((skill) => skill.name === 'Athletics')?.attribute).toBe('Strength');
    expect(base().find((skill) => skill.name === 'Thievery')?.attribute).toBe('Dexterity');
  });

  /*
   * ⚠️ A JUNÇÃO é o que faz a tela funcionar: cada ação citada na tabela tem de existir na
   * fonte de Ações, senão o clique não abre nada. São 71 referências e 50 ações distintas —
   * `Recall Knowledge` aparece em cinco perícias.
   */
  it('TODA referência aponta para uma ação que existe na base', () => {
    const referencias = base().flatMap((skill) => [...skill.untrained, ...skill.trained]);
    expect(referencias).toHaveLength(71);

    const distintas = new Set(referencias.map((acao) => acao.uuid));
    expect(distintas.size).toBe(50);

    const orfas = [...distintas].filter((uuid) => !uuidsDasAcoes.has(uuid));
    expect(orfas, `referências sem ação: ${orfas.join(', ')}`).toEqual([]);
  });

  it('Athletics é a mais rica, e Diplomacy não exige treinamento para nada', () => {
    const athletics = base().find((skill) => skill.name === 'Athletics');
    expect(athletics?.untrained).toHaveLength(9);
    const diplomacy = base().find((skill) => skill.name === 'Diplomacy');
    expect(diplomacy?.trained).toEqual([]);
    expect(diplomacy?.untrained).toHaveLength(3);
  });

  /* Perícia não tem descrição em lugar nenhum do pacote. Ver a nota em `skills.ts`. */
  it('não há descrição, e a ausência é do dado', () => {
    expect(result.entities.every((entidade) => Object.keys(entidade.desc).length === 0)).toBe(true);
  });
});
