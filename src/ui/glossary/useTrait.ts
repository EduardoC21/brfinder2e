import { useContext } from 'react';

import { lookupTrait, type TraitEntry } from '@core/glossary/index';

import { TraitGlossaryContext } from './TraitGlossaryContext';

/**
 * O que um traço quer dizer, ou `null`.
 *
 * Passa por `lookupTrait`, que conhece a regra do sufixo: `deadly-d8` responde com a
 * descrição de `deadly`. Hook e contexto em arquivos separados pelo recarregamento a
 * quente, como em `prefs/`.
 */
export function useTrait(slug: string): TraitEntry | null {
  return lookupTrait(useContext(TraitGlossaryContext), slug);
}
