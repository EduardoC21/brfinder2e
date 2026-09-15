import { useEffect, useState } from 'react';

import { type TraitGlossary } from '@core/glossary/index';
import { isRecord } from '@core/json';
import { readGlossary } from '@core/store/index';
import {
  readCommunityNames,
  readCommunityTraits,
  readCommunityTerms,
} from '@core/translation/index';
import { createIndexedDbStore } from '@platform/store-indexeddb';

const store = createIndexedDbStore();

/** "Nada carregado ainda" e "não há glossário" são a mesma coisa para quem desenha. */
const VAZIO: TraitGlossary = {};

/**
 * Lê o glossário de traços do armazenamento.
 *
 * Relê quando `version` muda — é o mesmo gatilho de `useBase`: uma sincronização nova pode
 * trazer traço novo com descrição nova, e a caixinha tem de acompanhar.
 *
 * Devolve VAZIO enquanto carrega e quando não há: a caixinha simplesmente não aparece.
 * Não há estado de erro porque não há o que fazer com ele — um traço sem descrição é
 * exatamente o que a tela já sabe mostrar.
 */
export function useTraitGlossary(version: string | null): TraitGlossary {
  const [loaded, setLoaded] = useState<{ version: string | null; glossary: TraitGlossary }>({
    version: null,
    glossary: VAZIO,
  });

  useEffect(() => {
    let alive = true;
    readGlossary(store, 'traits')
      .then((raw) => {
        if (!alive) return;
        setLoaded({ version, glossary: raw === null ? VAZIO : parse(raw) });
      })
      .catch(() => {
        if (alive) setLoaded({ version, glossary: VAZIO });
      });
    return () => {
      alive = false;
    };
  }, [version]);

  return loaded.version === version ? loaded.glossary : VAZIO;
}

/**
 * O glossário de traços TRADUZIDO, do pacote da comunidade (Etapa 31). Relê quando a
 * versão do pacote sobe (um download novo) ou a língua muda. Vazio sem pacote — e aí a
 * tela mostra o original, que é a regra: nada traduzido sem ter de onde.
 */
export function useTranslatedTraitGlossary(language: string, version: number): TraitGlossary {
  const [loaded, setLoaded] = useState<{ token: string; glossary: TraitGlossary }>({
    token: '',
    glossary: VAZIO,
  });
  const token = `${language}#${String(version)}`;

  useEffect(() => {
    let alive = true;
    readCommunityTraits(store, language)
      .then((glossary) => {
        if (alive) setLoaded({ token, glossary });
      })
      .catch(() => {
        if (alive) setLoaded({ token, glossary: VAZIO });
      });
    return () => {
      alive = false;
    };
  }, [language, version, token]);

  return loaded.token === token ? loaded.glossary : VAZIO;
}

/**
 * O que veio do disco, conferido campo a campo.
 *
 * O armazenamento devolve `unknown`, e uma versão anterior do app pode ter gravado outra
 * forma. Entrada que não tem as duas strings fica de fora em vez de derrubar o glossário
 * inteiro — o pior que acontece é um traço sem caixinha.
 */
function parse(raw: Readonly<Record<string, unknown>>): TraitGlossary {
  const glossary: Record<string, { label: string; description: string }> = {};
  for (const [slug, entry] of Object.entries(raw)) {
    if (!isRecord(entry)) continue;
    const label = entry['label'];
    const description = entry['description'];
    if (typeof label === 'string' && typeof description === 'string') {
      glossary[slug] = { label, description };
    }
  }
  return glossary;
}

/** Os TERMOS em português do pacote (Etapa 51), para os filtros e os traços sem descrição. */
export function useCommunityTerms(
  language: string,
  version: number,
): Readonly<Record<string, string>> {
  const [loaded, setLoaded] = useState<{ token: string; terms: Readonly<Record<string, string>> }>({
    token: '',
    terms: {},
  });
  const token = `${language}#${String(version)}`;
  useEffect(() => {
    let alive = true;
    readCommunityTerms(store, language)
      .then((terms) => {
        if (alive) setLoaded({ token, terms });
      })
      .catch(() => {
        if (alive) setLoaded({ token, terms: {} });
      });
    return () => {
      alive = false;
    };
  }, [language, version, token]);
  /* Enquanto relê, o que já tinha: uma tabela velha é melhor que filtro em inglês por um instante. */
  return loaded.terms;
}

export type CommunityNames = Readonly<Record<string, Readonly<Record<string, string>>>>;
const SEM_NOMES: CommunityNames = {};

/**
 * Os NOMES em português do pacote, por tipo de entidade (Etapa 32): é o segundo nome que a
 * busca indexa. Relê quando a versão do pacote sobe ou a língua muda; vazio sem pacote.
 */
export function useCommunityNames(language: string, version: number): CommunityNames {
  const [loaded, setLoaded] = useState<{ token: string; names: CommunityNames }>({
    token: '',
    names: SEM_NOMES,
  });
  const token = `${language}#${String(version)}`;

  useEffect(() => {
    let alive = true;
    readCommunityNames(store, language)
      .then((names) => {
        if (alive) setLoaded({ token, names });
      })
      .catch(() => {
        if (alive) setLoaded({ token, names: SEM_NOMES });
      });
    return () => {
      alive = false;
    };
  }, [language, version, token]);

  return loaded.token === token ? loaded.names : SEM_NOMES;
}
