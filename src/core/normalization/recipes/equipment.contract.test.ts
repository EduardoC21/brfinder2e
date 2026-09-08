/**
 * TESTE DE CONTRATO da receita de `equipment` — os 5.869 de verdade.
 *
 * Fora do `npm test`: baixa 34 MiB. Roda com `npm run test:contract`, e semanalmente em CI.
 */

import { beforeAll, describe, expect, it } from 'vitest';

import {
  DEFAULT_CHANNEL,
  KNOWN_GOOD_TAG,
  languageFiles,
  loadInventory,
  parseFolderRoots,
  readTextEntry,
} from '@core/source/index';
import { createFetchHttp } from '@platform/http-fetch';
import { mergeLanguageFiles } from '../language';
import { isClean } from '../report';
import { run, type RunResult } from '../run';
import { equipmentRecipe, type EquipmentBase, type EquipmentDesc } from './equipment';

const http = createFetchHttp({ headers: { Accept: 'application/vnd.github+json' } });
let result: RunResult<EquipmentBase, EquipmentDesc>;

beforeAll(async () => {
  const loaded = await loadInventory(http, { tag: KNOWN_GOOD_TAG });

  const pack = loaded.inventory.packs.find((entry) => entry.name === 'equipment-srd');
  if (!pack) throw new Error('o pack equipment sumiu do manifesto');
  const documents = JSON.parse(readTextEntry(loaded.zip, pack.file)) as unknown[];

  const declaration = loaded.manifest.packs.find((entry) => entry.name === 'equipment-srd');
  if (!declaration) throw new Error('o pack equipment sumiu do manifesto');
  const folders = parseFolderRoots(
    JSON.parse(readTextEntry(loaded.zip, DEFAULT_CHANNEL.packFoldersFile(declaration))),
  );

  const language = mergeLanguageFiles(
    languageFiles(loaded.manifest, 'en').map(
      (entry) => JSON.parse(readTextEntry(loaded.zip, entry.path)) as unknown,
    ),
  );

  result = run(equipmentRecipe, [{ pack: 'equipment-srd', documents, folders }], { language });
}, 180_000);

describe('os 5.869 itens reais', () => {
  it('normaliza todos, sem nenhuma falha', () => {
    expect(result.failures).toEqual([]);
    expect(result.entities).toHaveLength(5869);
  });

  it('o relatório fica limpo', () => {
    expect(result.report.unmapped, JSON.stringify(result.report.unmapped, null, 1)).toEqual([]);
    expect(isClean(result.report)).toBe(true);
  });
});

describe('o que os 5.869 confirmam', () => {
  const base = (): readonly EquipmentBase[] => result.entities.map((entity) => entity.base);

  /*
   * A razão de `accepts` existir no motor. NOVE tipos do Foundry num pack só, e todos são
   * "um item" para quem consulta.
   */
  it('os nove tipos entram, e o Tipo da tela é o `kind`', () => {
    const porTipo = new Map<string, number>();
    for (const item of base()) porTipo.set(item.kind, (porTipo.get(item.kind) ?? 0) + 1);
    expect(Object.fromEntries(porTipo)).toEqual({
      equipment: 2394,
      consumable: 1703,
      weapon: 1018,
      ammo: 216,
      armor: 211,
      treasure: 153,
      shield: 126,
      backpack: 46,
      kit: 2,
    });
  });

  it('o preço é lido em cobre, e a maior moeda não estoura', () => {
    const espada = base().find((item) => item.name === 'Longsword');
    expect(espada?.price).toBe(100);
    const mochila = base().find((item) => item.name === 'Backpack');
    expect(mochila?.price).toBe(10);
    // 367 itens não têm preço impresso, e zero é como a fonte diz isso.
    expect(base().filter((item) => item.price === 0)).toHaveLength(367);
  });

  /** 48 itens vêm em lote; sem `pricePer` uma flecha custaria dez vezes o que custa. */
  it('o lote existe em 48 itens', () => {
    expect(base().filter((item) => item.pricePer !== 1)).toHaveLength(48);
  });

  it('o volume usa a escala do jogo: 0 é insignificante e 0,1 é o "L"', () => {
    expect(base().filter((item) => item.bulk === 0)).toHaveLength(1949);
    expect(base().filter((item) => item.bulk === 0.1)).toHaveLength(2620);
    // O mais pesado da base tem Volume 50. (Meu palpite era 18: eu tinha olhado só as
    // formas mais COMUNS do JSON, e não o máximo.)
    expect(Math.max(...base().map((item) => item.bulk))).toBe(50);
  });

  /*
   * As DUAS formas do dano, que custaram 85 falhas antes de serem medidas: arma traz
   * `{dice, die, damageType}` e consumível traz `{formula, kind, type}`.
   */
  it('as duas formas do dano viram uma', () => {
    const comDano = base().filter((item) => item.damage !== null);
    expect(comDano).toHaveLength(1090);
    expect(comDano.filter((item) => item.kind === 'weapon')).toHaveLength(1013);
    expect(comDano.filter((item) => item.kind === 'consumable')).toHaveLength(77);
    /*
     * CINCO armas não têm dano nenhum, e não é defeito da leitura: são bombas e sacolas
     * (`Spider Satchel`) cujo efeito está escrito na descrição, não numa fórmula.
     */
    expect(base().filter((item) => item.kind === 'weapon' && item.damage === null)).toHaveLength(5);
  });

  /*
   * ⚠️ O QUE SEPARA OS GRAUS DE UMA BOMBA, e o que a tela mostrava errado: os quatro Acid
   * Flask têm o MESMO `1` de dano direto, e diferem no persistente e no respingo.
   *
   * Conferido contra a própria descrição do item, que escreve por extenso: "deals 1 acid
   * damage, 1d6 persistent acid damage, and 1 acid splash damage".
   */
  it('o dano persistente e o respingo separam os graus da bomba', () => {
    const grau = (nome: string) => base().find((item) => item.name === nome);
    expect(grau('Acid Flask (Lesser)')?.damage).toEqual({
      formula: '1',
      type: 'acid',
      persistent: { formula: '1d6', type: 'acid' },
    });
    expect(grau('Acid Flask (Lesser)')?.splash).toBe(1);
    expect(grau('Acid Flask (Major)')?.damage?.persistent).toEqual({
      formula: '4d6',
      type: 'acid',
    });
    expect(grau('Acid Flask (Major)')?.splash).toBe(4);
    /* `faces` nulo é dano FIXO: 1 persistente, e não `1dN`. */
    expect(grau("Alchemist's Fire (Lesser)")?.damage?.persistent).toEqual({
      formula: '1',
      type: 'fire',
    });

    expect(base().filter((item) => item.damage?.persistent != null)).toHaveLength(66);
    /*
     * 157, e não os "zero" que o `ignore` afirmava antes de eu medir. O respingo é dado de
     * verdade, e cresce com o grau.
     */
    expect(base().filter((item) => item.splash > 0)).toHaveLength(157);
  });

  /*
   * ⚠️ ZERO É "NÃO INFORMADO", e por isso vira nulo. A fonte traz `hardness: 0` nos 5.743
   * itens que não são escudo, e item nenhum tem dureza zero no jogo.
   */
  it('dureza e PV só existem onde a fonte os imprime', () => {
    const comDureza = base().filter((item) => item.hardness !== null);
    // 125 e não 126: `Worldscale Shield` vem zerado na fonte.
    expect(comDureza).toHaveLength(125);
    expect(comDureza.every((item) => item.kind === 'shield')).toBe(true);
    expect(base().filter((item) => item.hitPoints !== null)).toHaveLength(125);
  });

  it('os cinco números de armadura só existem em armadura e escudo', () => {
    const comCA = base().filter((item) => item.acBonus !== null);
    expect(comCA).toHaveLength(337);
    expect(new Set(comCA.map((item) => item.kind))).toEqual(new Set(['armor', 'shield']));
    // Armadura pesada limita a Destreza a ZERO — e zero não é ausência.
    expect(base().filter((item) => item.dexCap === 0).length).toBeGreaterThan(0);
  });

  it('a raridade exercita as quatro etiquetas', () => {
    const porRaridade = new Map<string, number>();
    for (const item of base())
      porRaridade.set(item.rarity, (porRaridade.get(item.rarity) ?? 0) + 1);
    expect(Object.fromEntries(porRaridade)).toEqual({
      common: 2981,
      uncommon: 1916,
      rare: 714,
      unique: 258,
    });
  });

  /*
   * Os três campos que a fonte NÃO tem e o AoN mostra como coluna. Se as contagens mudarem,
   * é porque a fonte inventou uma forma nova de usar — e aí a conta precisa saber dela.
   */
  it('as mãos saem das 120 formas de `usage`', () => {
    const maos = new Map<string, number>();
    for (const item of base()) maos.set(item.hands, (maos.get(item.hands) ?? 0) + 1);
    expect(Object.fromEntries(maos)).toEqual({ '': 2464, '1': 2757, '2': 620, '1+': 28 });
  });

  it('as oito formas de carregar substituem as 120 do `usage`', () => {
    const carry = new Map<string, number>();
    for (const item of base()) carry.set(item.carry, (carry.get(item.carry) ?? 0) + 1);
    /*
     * `other` são 159, e não os 87 que declaram `usage: "other"`: as outras 72 são grafias
     * que não começam por nenhum dos sete verbos conhecidos (`sewn-into-clothing`,
     * `bonded`…). Se este número subir, é forma nova que merece um verbo próprio.
     */
    expect(carry.get('other')).toBe(159);
    expect(carry.get('held')).toBe(3363);
    expect(carry.get('worn')).toBe(892);
    expect(new Set(carry.keys())).toEqual(
      new Set([
        '',
        'held',
        'worn',
        'affixed',
        'etched',
        'tattooed',
        'carried',
        'implanted',
        'other',
      ]),
    );
  });

  /*  tem o traço  e alcance NULO — o AoN o lista como Melee. */
  /* `Club` tem o traço `thrown-10` e alcance NULO — o AoN o lista como Melee. */
  it('corpo a corpo e à distância saem do alcance, e só valem para arma', () => {
    expect(base().filter((item) => item.weaponType === 'ranged')).toHaveLength(350);
    expect(base().filter((item) => item.weaponType === 'melee')).toHaveLength(668);
    expect(base().find((item) => item.name === 'Club')?.weaponType).toBe('melee');
    expect(base().find((item) => item.name === 'Longbow')?.weaponType).toBe('ranged');
    expect(base().find((item) => item.name === 'Longbow')?.hands).toBe('1+');
    // Nada fora de arma recebe tipo: uma poção também tem alcance nulo.
    expect(base().every((item) => item.weaponType === '' || item.kind === 'weapon')).toBe(true);
  });

  it('o nível vai de 0 a 28, e zero é item mundano', () => {
    const niveis = base().map((item) => item.level);
    expect(Math.min(...niveis)).toBe(0);
    expect(Math.max(...niveis)).toBe(28);
    // 742, e não os 740 que o JSON cru mostra: os 2 kits não trazem nível, e caem no padrão.
    expect(base().filter((item) => item.level === 0)).toHaveLength(742);
  });
});
