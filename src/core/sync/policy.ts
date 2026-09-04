/**
 * A política de versão, como decisão pura.
 *
 * Estava dissolvida em três `if` dentro do callback de sincronização, onde não dava para
 * afirmar nada sobre ela. Aqui ela tem nome, casos enumerados e teste.
 *
 * A regra, em uma frase: **mira sempre na mais nova, e cai para a última que deu certo.**
 *
 *   PRIORIDADE   a versão mais nova. É onde a mesa quer estar — todos jogam na atual.
 *   PISO         a última que deu certo. Numa instalação com base, é a gravada no `meta`;
 *                numa instalação nova, onde não há histórico, é o `KNOWN_GOOD_TAG`.
 *
 * A tolerância a falhas é DERIVADA, nunca escolhida por quem chama:
 *
 *   reparando a MESMA versão gravada   tolera. Recusar prenderia o usuário a uma base
 *                                      corrompida sem poder refazê-la.
 *   trocando de versão                 recusa. Não vale trocar base boa por pior.
 *   instalação nova, nada a perder     tolera no piso. Base parcial serve mais que tela
 *                                      vazia, e o relatório mostra quantas falharam.
 */

export type SyncOutcome =
  /** Grava o resultado. */
  | { readonly kind: 'adopt' }
  /** Não presta e não há base: tenta esta outra versão. */
  | { readonly kind: 'fallback'; readonly tag: string }
  /** Não presta e há base: fica onde está, sem gravar nada. */
  | { readonly kind: 'keep'; readonly keeping: string };

export interface SyncDecision {
  /** A tag que a tentativa realmente resolveu. */
  readonly resolvedTag: string;
  /** Quantas entradas não decodificaram nesta tentativa. */
  readonly failures: number;
  /** A tag gravada hoje, ou `null` numa instalação nova. */
  readonly storedTag: string | null;
  /** O piso do código, usado só quando não há base gravada. */
  readonly floorTag: string;
  /** Se o piso já foi tentado nesta rodada — impede cair duas vezes. */
  readonly floorTried?: boolean;
}

export function decideSync(input: SyncDecision): SyncOutcome {
  const { resolvedTag, failures, storedTag, floorTag, floorTried = false } = input;

  if (failures === 0) return { kind: 'adopt' };

  // Reparando a versão que já está gravada: tolera, senão não há como refazer a base.
  if (storedTag !== null && storedTag === resolvedTag) return { kind: 'adopt' };

  // Há base e a candidata não presta: a mesa fica onde está.
  if (storedTag !== null) return { kind: 'keep', keeping: storedTag };

  // Instalação nova: desce uma vez para o piso do código.
  if (!floorTried && resolvedTag !== floorTag) return { kind: 'fallback', tag: floorTag };

  // O piso também falhou, e não há nada a preservar. Base parcial serve mais que nenhuma.
  return { kind: 'adopt' };
}
