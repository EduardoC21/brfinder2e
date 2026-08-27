/**
 * TESTE DE CONTRATO da marcação — o critério da Etapa 7.
 *
 * "Invariante de ida e volta passa em 100% das descrições" (briefing, seção 6). Aqui ele é
 * afirmado sobre TODA string de TODO pack, não só as descrições: se algo com marcação
 * existir em qualquer canto do dado, ele tem que sobreviver ao analisador.
 *
 * Fora do `npm test`: baixa 34 MiB. Roda com `npm run test:contract`.
 */

import { beforeAll, describe, expect, it } from 'vitest';

import { KNOWN_GOOD_TAG, listEntries, loadInventory, readEntries } from '@core/source/index';
import { createFetchHttp } from '@platform/http-fetch';
import { parseMarkup } from './parse';

const http = createFetchHttp({ headers: { Accept: 'application/vnd.github+json' } });

interface Varredura {
  readonly comMarcacao: number;
  readonly quebras: readonly string[];
  readonly desconhecidos: ReadonlyMap<string, number>;
  readonly porSintaxe: ReadonlyMap<string, number>;
}

let tudo: Varredura;
let itens: Varredura;

/** Os 25 packs do tipo `Item` — o recorte que a seção 7.6 do briefing mediu. */
const PACOTES_DE_ITEM = new Set(
  [
    'equipment',
    'feats',
    'spells',
    'class-features',
    'feat-effects',
    'deities',
    'equipment-effects',
    'backgrounds',
    'spell-effects',
    'actions',
    'bestiary-effects',
    'bestiary-family-ability-glossary',
    'heritages',
    'adventure-specific-actions',
    'boons-and-curses',
    'kingmaker-features',
    'pathfinder-society-boons',
    'classes',
    'familiar-abilities',
    'campaign-effects',
    'ancestry-features',
    'ancestries',
    'other-effects',
    'conditions',
    'bestiary-ability-glossary-srd',
  ].map((nome) => `packs/${nome}.json`),
);

function varrer(zip: Uint8Array, arquivos: readonly string[]): Varredura {
  let comMarcacao = 0;
  const quebras: string[] = [];
  const desconhecidos = new Map<string, number>();
  const porSintaxe = new Map<string, number>();

  const conta = (mapa: Map<string, number>, chave: string): void => {
    mapa.set(chave, (mapa.get(chave) ?? 0) + 1);
  };

  const visitar = (valor: unknown): void => {
    if (typeof valor === 'string') {
      if (!valor.includes('@') && !valor.includes('[[')) return;
      comMarcacao++;

      const tokens = parseMarkup(valor);
      if (tokens.map((token) => token.raw).join('') !== valor) {
        if (quebras.length < 5) quebras.push(valor.slice(0, 160));
      }
      for (const token of tokens) {
        if (token.kind === 'text') continue;
        if (token.kind === 'unknown') conta(desconhecidos, token.opener);
        conta(porSintaxe, token.kind === 'roll' ? `[[/${token.command}` : `@${token.kind}`);
      }
      return;
    }
    if (Array.isArray(valor)) {
      for (const item of valor) visitar(item);
      return;
    }
    if (valor !== null && typeof valor === 'object') {
      for (const item of Object.values(valor)) visitar(item);
    }
  };

  for (const arquivo of arquivos) {
    const bytes = readEntries(zip, [arquivo]).get(arquivo);
    if (bytes) visitar(JSON.parse(new TextDecoder().decode(bytes)));
  }

  return { comMarcacao, quebras, desconhecidos, porSintaxe };
}

beforeAll(async () => {
  const loaded = await loadInventory(http, { tag: KNOWN_GOOD_TAG });
  const packs = listEntries(loaded.zip)
    .map((entrada) => entrada.name)
    .filter(
      (nome) => nome.startsWith('packs/') && nome.endsWith('.json') && !nome.includes('_folders'),
    );

  tudo = varrer(loaded.zip, packs);
  itens = varrer(
    loaded.zip,
    packs.filter((nome) => PACOTES_DE_ITEM.has(nome)),
  );
}, 240_000);

describe('o invariante de ida e volta, sobre a base inteira', () => {
  /** O critério da Etapa 7. Se isto quebrar, texto está se perdendo em silêncio. */
  it('nenhuma string com marcação quebra o invariante', () => {
    expect(tudo.quebras, `quebraram:\n${tudo.quebras.join('\n')}`).toEqual([]);
  });

  it('a varredura é grande o bastante para valer alguma coisa', () => {
    expect(tudo.comMarcacao).toBeGreaterThan(50_000);
  });
});

describe('são exatamente dez sintaxes (briefing 7.6)', () => {
  it('nenhum token desconhecido em nenhum pack', () => {
    const achados = [...tudo.desconhecidos].map(([nome, n]) => `${nome} ×${String(n)}`);
    expect(achados, `sintaxe nova apareceu: ${achados.join(', ')}`).toEqual([]);
  });

  it('as dez aparecem, e nenhuma a mais', () => {
    expect([...tudo.porSintaxe.keys()].sort()).toEqual([
      '@check',
      '@damage',
      '@embed',
      '@localize',
      '@template',
      '@uuid',
      '[[/act',
      '[[/br',
      '[[/gmr',
      '[[/r',
    ]);
  });
});

describe('as contagens batem com as do briefing 7.6', () => {
  /**
   * O briefing mediu os 25 packs de `Item`. Reproduzir os números dele com um analisador
   * escrito do zero é a melhor prova de que os dois estão certos.
   *
   * A margem existe porque o briefing foi medido num release ligeiramente diferente: o
   * total de entidades difere em ~100 de 21 mil.
   */
  const esperado: Readonly<Record<string, number>> = {
    '@uuid': 25836,
    '@check': 3043,
    '@damage': 2805,
    '@template': 1184,
    '@localize': 126,
    '@embed': 118,
    '[[/r': 572,
    '[[/act': 480,
    '[[/gmr': 107,
    '[[/br': 23,
  };

  for (const [sintaxe, alvo] of Object.entries(esperado)) {
    it(`${sintaxe} ≈ ${String(alvo)}`, () => {
      const medido = itens.porSintaxe.get(sintaxe) ?? 0;
      /*
       * 3% ou 10 ocorrências, o que for maior.
       *
       * O piso de 10 existe por causa das sintaxes raras: `[[/gmr` mediu 115 contra 107,
       * e 3% de 107 são 4 — apertado demais para tolerar troca de release numa contagem
       * de duas casas. Isto aqui é margem de deriva, não asserção de precisão: quem
       * afirma correção são os dois testes acima, ida-e-volta zero e desconhecidos zero.
       */
      const margem = Math.max(10, Math.ceil(alvo * 0.03));
      expect(
        Math.abs(medido - alvo),
        `medido ${String(medido)}, esperado ${String(alvo)}`,
      ).toBeLessThanOrEqual(margem);
    });
  }
});
