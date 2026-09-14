/**
 * O motor de tradução do Firefox (Bergamot, `@browsermt/bergamot-translator`) como
 * `MachineTranslator` — a porta que o provedor local do core usa (Etapa 34).
 *
 * Roda em WASM num Web Worker, dentro da webview: sem servidor, sem chave, sem custo. O
 * trabalhador vem de `public/bergamot/` (copiado no `postinstall`); o MODELO do par
 * en→pt (uns 22 MB: modelo, vocabulário e lista curta) vem do registro público do
 * projeto na primeira tradução — e fica GUARDADO no armazenamento local, sob
 * `bergamot/…`, para as seguintes funcionarem sem internet. É o que faz o executável
 * traduzir offline depois da primeira vez. O registro também fica guardado, senão a
 * primeira pergunta ("há modelo para en→pt?") já precisaria de rede.
 *
 * Medido no navegador em 14/09/2026: 5,7 s na primeira tradução (com o download);
 * 20 a 35 ms por parágrafo depois. O modo HTML preserva tags e atributos, inclusive
 * `<span translate="no">`, que a blindagem usa.
 */

import {
  BatchTranslator,
  TranslatorBacking,
  type BergamotOptions,
} from '@browsermt/bergamot-translator/translator.js';

import { isRecord } from '@core/json';
import type { StorePort } from '@core/store/index';
import type { MachineTranslator, ProviderAvailability } from '@core/translation/index';

const REGISTRO = 'https://bergamot.s3.amazonaws.com/models/index.json';
const TRABALHADOR = '/bergamot/translator-worker.js';
export const keyBergamot = (parte: string): string => `bergamot/${parte}`;

/**
 * O apoio do tradutor com CACHE: o registro e cada arquivo de modelo passam pelo
 * armazenamento antes da rede. É uma subclasse porque a biblioteca resolve os arquivos
 * por `this.fetch(url, checksum)` e o registro por `this.loadModelRegistery()` — trocar
 * os dois é tudo o que o offline precisa.
 */
class ApoioComCache extends TranslatorBacking {
  constructor(
    private readonly store: StorePort,
    options: BergamotOptions,
  ) {
    super(options);
  }

  override async loadModelRegistery(): Promise<unknown> {
    try {
      const registro = await super.loadModelRegistery();
      await this.store.put(keyBergamot('registry'), registro);
      return registro;
    } catch (erro) {
      const guardado = await this.store.get(keyBergamot('registry'));
      if (Array.isArray(guardado)) return guardado;
      throw erro;
    }
  }

  override async fetch(
    url: string,
    checksum?: string,
    extra?: { signal?: AbortSignal },
  ): Promise<ArrayBuffer> {
    const chave = keyBergamot(`file/${checksum ?? url}`);
    const guardado = await this.store.get(chave);
    if (guardado instanceof ArrayBuffer) return guardado;
    const baixado = await super.fetch(url, checksum, extra);
    await this.store.put(chave, baixado);
    return baixado;
  }
}

/** Os arquivos do par estão todos guardados? Lê o registro guardado e confere um a um. */
async function modeloGuardado(store: StorePort, from: string, to: string): Promise<boolean> {
  const registro = await store.get(keyBergamot('registry'));
  if (!Array.isArray(registro)) return false;
  const entrada = registro.find(
    (item): item is { files: Record<string, unknown> } =>
      isRecord(item) && item['from'] === from && item['to'] === to && isRecord(item['files']),
  );
  if (entrada === undefined) return false;
  for (const arquivo of Object.values(entrada.files)) {
    if (!isRecord(arquivo) || typeof arquivo['name'] !== 'string') continue;
    const checksum =
      typeof arquivo['expectedSha256Hash'] === 'string'
        ? arquivo['expectedSha256Hash']
        : arquivo['name'];
    if (!((await store.get(keyBergamot(`file/${checksum}`))) instanceof ArrayBuffer)) return false;
  }
  return true;
}

export function createBergamotTranslator(store: StorePort): MachineTranslator {
  let tradutor: BatchTranslator | null = null;
  const abrir = (): BatchTranslator => {
    if (tradutor === null) {
      const options: BergamotOptions = {
        workerUrl: TRABALHADOR,
        downloadTimeout: 0,
        pivotLanguage: null,
      };
      tradutor = new BatchTranslator(options, new ApoioComCache(store, options));
    }
    return tradutor;
  };

  return {
    async ready(from, to): Promise<ProviderAvailability> {
      if (await modeloGuardado(store, from, to)) return { kind: 'ready' };
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return { kind: 'unavailable', why: 'sem internet e sem o modelo guardado' };
      }
      return { kind: 'needs-setup', what: 'baixa o modelo (uns 22 MB) na primeira tradução' };
    },
    async translateHtml(html, from, to): Promise<string> {
      const resposta = await abrir().translate({ from, to, text: html, html: true });
      return resposta.target.text;
    },
  };
}

/** O registro da biblioteca, para o `ApoioComCache` ler a mesma URL que o padrão. */
export const BERGAMOT_REGISTRY = REGISTRO;
