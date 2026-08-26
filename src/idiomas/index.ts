import { ptBR, type Textos } from './pt-BR';

/**
 * Ponto unico de leitura do texto de interface.
 * Hoje devolve pt-BR fixo. Quando o ingles entrar (decisao fechada: trocar TUDO de
 * uma vez), a troca acontece aqui dentro e nenhum componente precisa mudar.
 */
export const textos: Textos = ptBR;
