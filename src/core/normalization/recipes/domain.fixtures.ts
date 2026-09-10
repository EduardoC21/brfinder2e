/**
 * O jornal `Domains` reduzido a duas páginas, com a FORMA real do `pf2e-8.5.0`.
 *
 *   Fire Domain    a forma completa: abertura, as duas magias, deuses, alternativos,
 *                  pactos e mistérios de oráculo
 *   Zeal Domain    a forma mínima: abertura, as duas magias, deuses
 *
 * E uma página que NÃO é domínio, para provar que o expansor a ignora. O texto está
 * encurtado — é conteúdo da Paizo sob ORC.
 */

const pagina = (id: string, name: string, content: string) => ({
  _id: id,
  category: null,
  image: {},
  name,
  sort: 1,
  src: null,
  system: {},
  text: { content, format: 1 },
  title: { level: 1, show: true },
  type: 'text',
  video: { controls: true, volume: 0.5 },
  _stats: { coreVersion: '14.361', systemId: 'pf2e', systemVersion: '8.5.0' },
});

const SPELL = 'Compendium.pf2e.spells-srd.Item';
const DEITY = 'Compendium.pf2e.deities.Item';

export const FIRE_HTML =
  '<p>You control flame.</p>' +
  `<p><strong>Domain Spell</strong> @UUID[${SPELL}.oJKZi8OQgmVXHOc0]{Fire Ray}</p>` +
  `<p><strong>Advanced Domain Spell</strong> @UUID[${SPELL}.y7Tusv3CieZktkkV]{Flame Barrier}</p>` +
  '<hr /><h4><strong>Deities</strong></h4>' +
  `<p>@UUID[${DEITY}.BNycwu3I21dTh4D9]{Sarenrae}, @UUID[${DEITY}.QRkcFciCOmFoxF1B]{Asmodeus}</p>` +
  `<p><em>Alternate Domain</em></p><p>@UUID[${DEITY}.vEMCpm7iidycRT5D]{Brigh}</p>` +
  `<h4><strong>Covenants</strong></h4><p>@UUID[${DEITY}.KT7HKL7vbZEwbzX4]{Green Faith}</p>` +
  '<h4><strong>Oracle Mysteries</strong></h4>' +
  '<p>@UUID[Compendium.pf2e.classfeatures.Item.GTSvbFb36InvuH0w]{Flames}</p>';

export const ZEAL_HTML =
  '<p>Your inner fire […]</p>' +
  `<p><strong>Domain Spell</strong> @UUID[${SPELL}.aaaaaaaaaaaaaaaa]{Weapon Surge}</p>` +
  `<p><strong>Advanced Domain Spell</strong> @UUID[${SPELL}.bbbbbbbbbbbbbbbb]{Zeal for Battle}</p>` +
  `<hr /><h4><strong>Deities</strong></h4><p>@UUID[${DEITY}.cccccccccccccccc]{Gorum}</p>`;

export const jornalDominios = {
  _id: 'EEZvDB1Z7ezwaxIr',
  categories: [],
  name: 'Domains',
  ownership: { default: 0 },
  pages: [
    pagina('egSErNozlL3HRK1y', 'Fire Domain', FIRE_HTML),
    pagina('zzzzzzzzzzzzzzzz', 'Zeal Domain', ZEAL_HTML),
    pagina('yyyyyyyyyyyyyyyy', 'Introduction', '<p>Domains grant […]</p>'),
  ],
  _stats: { coreVersion: '14.361', systemId: 'pf2e', systemVersion: '8.5.0' },
};

/** Outro jornal do mesmo pack, que o expansor tem de ignorar inteiro. */
export const outroJornal = {
  _id: 'outro',
  categories: [],
  name: 'Remaster Changes',
  ownership: { default: 0 },
  pages: [pagina('p1', 'Alignment', '<p>Removed.</p>')],
  _stats: { coreVersion: '14.361', systemId: 'pf2e', systemVersion: '8.5.0' },
};

export const todos = [jornalDominios, outroJornal];
