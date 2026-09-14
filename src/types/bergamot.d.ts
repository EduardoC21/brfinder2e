/**
 * Os tipos mínimos de `@browsermt/bergamot-translator`, que não traz os seus.
 * Só o que o adaptador em `platform/translator-bergamot.ts` usa.
 */
declare module '@browsermt/bergamot-translator/translator.js' {
  export interface BergamotOptions {
    registryUrl?: string;
    workerUrl?: string;
    downloadTimeout?: number;
    cacheSize?: number;
    pivotLanguage?: string | null;
    workers?: number;
    batchSize?: number;
  }

  export interface BergamotRequest {
    from: string;
    to: string;
    text: string;
    html?: boolean;
  }

  export interface BergamotResponse {
    target: { text: string };
  }

  export class TranslatorBacking {
    constructor(options?: BergamotOptions);
    registryUrl: string;
    registry: Promise<unknown>;
    loadModelRegistery(): Promise<unknown>;
    fetch(url: string, checksum?: string, extra?: { signal?: AbortSignal }): Promise<ArrayBuffer>;
  }

  export class BatchTranslator {
    constructor(options?: BergamotOptions, backing?: TranslatorBacking);
    translate(request: BergamotRequest): Promise<BergamotResponse>;
    delete(): void;
  }
}
