import { ptBR, type Strings } from './pt-BR';

/**
 * Ponto único de leitura do texto de interface.
 *
 * Hoje devolve pt-BR fixo. Quando o inglês entrar (decisão fechada: troca TUDO de
 * uma vez), a troca acontece aqui dentro e nenhum componente precisa mudar.
 */
export const strings: Strings = ptBR;
