/**
 * OS SEGREDOS (Etapa 41): a chave de API da pessoa, e só ela.
 *
 * Regra do projeto: chave de modelo de linguagem é da pessoa e NUNCA vai para `prefs/`
 * (que se exporta, se sincroniza, se lê em teste). Este é o único lugar que a guarda.
 *
 * O adaptador de hoje é o do NAVEGADOR: `localStorage`, na origem do app. Não é um cofre
 * — é o que um site tem, e o autor decidiu (Etapa 40) que o app pode viver como site. No
 * executável, o lugar certo é o cofre do sistema (Credential Manager, Keychain) por um
 * plugin do Tauri: mesma porta, outro adaptador, quando o executável voltar a importar.
 */

export interface SecretStore {
  get(name: string): Promise<string | null>;
  set(name: string, value: string): Promise<void>;
  delete(name: string): Promise<void>;
}

const PREFIXO = 'brfinder2e/secret/';

export function createBrowserSecretStore(): SecretStore {
  return {
    get: (name) => Promise.resolve(localStorage.getItem(PREFIXO + name)),
    set: (name, value) => {
      localStorage.setItem(PREFIXO + name, value);
      return Promise.resolve();
    },
    delete: (name) => {
      localStorage.removeItem(PREFIXO + name);
      return Promise.resolve();
    },
  };
}

/** O nome do segredo da chave do modelo de linguagem. */
export const LLM_KEY_SECRET = 'llm-key';
