/**
 * A REVISÃO DAS RECEITAS: sobe toda vez que uma receita muda o que grava.
 *
 * Existe por um engano de leitura na Etapa 22c: a receita de ancestralidade mudou a
 * descrição (o rodapé saiu, a página passou a ser só a prosa), o autor abriu o app com a
 * base sincronizada ANTES da mudança, e viu o de antes — e leu como se a mudança não
 * tivesse sido feita. A base é calculada na sincronização; código novo com base velha
 * mostra dado velho, e nada dizia isso.
 *
 * O número vai para o `meta` na sincronização. Quando o do app é maior que o gravado, a
 * barra de topo e a tela de configurações pedem a sincronização. Não sincroniza sozinho:
 * baixar 34 MiB é decisão de quem usa.
 *
 * ⚠️ Suba ao mudar `base`, `desc` ou `expand` de qualquer receita. Não suba por mudança de
 * tela: a tela lê o que está gravado, e o que está gravado não mudou.
 *
 *   1  Etapa 22d — ancestralidade: rodapé fora do resumo, página só a prosa,
 *      habilidades com GrantItem, `extraLanguages`; fonte de habilidades.
 *   2  Etapa 22e — a descrição no contexto: `alterations` na ancestralidade e no
 *      talento.
 *   3  Etapa 23 — as 17 heranças versáteis entram na ancestralidade como Tipo; a fonte
 *      de herança (as 311 próprias).
 *   4  Etapa 23c — `countsAs` na ancestralidade (o meio-elfo conta como elfo).
 *   5  Etapa 23d — tamanhos, PV por tamanho e deslocamentos lidos das regras (o Animal
 *      Desperto).
 *   6  Etapa 23e — `speeds` na ancestralidade (a linha única de deslocamento).
 *   7  Etapa 24 — `mechanics` da ancestralidade; visão da versátil pelas regras; a herança
 *      própria com `features` e `vision`.
 *   8  Etapa 25 — a fonte de arquétipo; as 8 páginas de regra do jornal Archetypes.
 *   9  Etapa 25b — os talentos adicionais do arquétipo, e a prosa sem o parágrafo deles.
 *  10  Etapa 25c — a dedicação recuperada pela tabela de talentos (Guardian).
 *  11  Etapa 26 — a fonte de classe; as 874 habilidades de classe entram em Habilidades.
 */
export const RECIPES_REVISION = 14;
