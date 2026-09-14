/**
 * O GLOSSÁRIO FIXO da tradução automática (Etapa 34): os termos do jogo que um tradutor
 * genérico erra, com o termo da comunidade no lugar. Medido no Bergamot en→pt antes de
 * existir isto: "Strike" virou "greve", "Cast" virou "elenco", "saving throw" virou
 * "salvar joga", "Fortitude" virou "fortaleza", "rank" virou "posição". Cada termo aqui
 * é o do módulo pt-BR (`PF2E.Saves*`, `PF2E.Skill.*`, `PF2E.ProficiencyLevel*`,
 * `PF2E.Item.Feat.Category.*`, os nomes de ação de `pf2e.actionspf2e`).
 *
 * `exact` nos NOMES (ações, capitalizados no texto do Foundry): "Strike" é o golpe, mas
 * "strike" no meio da frase pode ser o verbo. Nos termos comuns, sem `exact`, a caixa do
 * original é mantida ("Saving throw" → "Salvamento").
 *
 * Os nomes de entrada do pacote (8.801) NÃO entram aqui: eles só se aplicam ao rótulo
 * das referências (`shield.nameOf`), onde não há dúvida do que são. Solto na prosa,
 * "Light" ou "Shield" seria adivinhação.
 */

import type { Phrase } from './shield';

export const CORE_PHRASES: readonly Phrase[] = [
  /* Salvamentos e percepção (PF2E.Saves*, PF2E.PerceptionLabel). */
  { en: 'saving throws', pt: 'salvamentos' },
  { en: 'saving throw', pt: 'salvamento' },
  { en: 'Fortitude', pt: 'Fortitude' },
  { en: 'Reflex', pt: 'Reflexos' },
  { en: 'Will', pt: 'Vontade', exact: true },
  { en: 'Perception', pt: 'Percepção' },
  /* Graus de proficiência (PF2E.ProficiencyLevel*). */
  { en: 'untrained', pt: 'destreinado' },
  { en: 'trained', pt: 'treinado' },
  { en: 'expert', pt: 'especialista' },
  { en: 'master', pt: 'mestre' },
  { en: 'legendary', pt: 'lendário' },
  /* Perícias (PF2E.Skill.*). */
  { en: 'Acrobatics', pt: 'Acrobatismo' },
  { en: 'Arcana', pt: 'Arcanismo' },
  { en: 'Athletics', pt: 'Atletismo' },
  { en: 'Crafting', pt: 'Manufatura' },
  { en: 'Deception', pt: 'Dissimulação' },
  { en: 'Diplomacy', pt: 'Diplomacia' },
  { en: 'Intimidation', pt: 'Intimidação' },
  { en: 'Medicine', pt: 'Medicina' },
  { en: 'Nature', pt: 'Natureza', exact: true },
  { en: 'Occultism', pt: 'Ocultismo' },
  { en: 'Religion', pt: 'Religião', exact: true },
  { en: 'Society', pt: 'Sociedade', exact: true },
  { en: 'Stealth', pt: 'Furtividade' },
  { en: 'Survival', pt: 'Sobrevivência', exact: true },
  { en: 'Thievery', pt: 'Ladroagem' },
  { en: 'Lore', pt: 'Saber', exact: true },
  /* Atributos (PF2E.Ability*). */
  { en: 'Strength', pt: 'Força', exact: true },
  { en: 'Dexterity', pt: 'Destreza' },
  { en: 'Constitution', pt: 'Constituição' },
  { en: 'Intelligence', pt: 'Inteligência' },
  { en: 'Wisdom', pt: 'Sabedoria' },
  { en: 'Charisma', pt: 'Carisma' },
  /* As categorias (PF2E.Item.Feat.Category.*) e os graus de resultado. */
  { en: 'class feature', pt: 'característica de classe' },
  { en: 'class feat', pt: 'talento de classe' },
  { en: 'ancestry feat', pt: 'talento de ancestralidade' },
  { en: 'skill feat', pt: 'talento de perícia' },
  { en: 'general feat', pt: 'talento geral' },
  { en: 'feats', pt: 'talentos' },
  { en: 'feat', pt: 'talento' },
  /*
   * A tabela de progressão da classe (Etapa 35): medido, "attribute boosts" virou
   * "atributo impulsiona", "skill increase" virou "aumento de habilidade", "shield block"
   * virou "bloco escudo". Os termos são os do módulo (PF2E.AbilityBoost,
   * PF2E.SkillIncreaseLevels, PF2E.DamageButton.ShieldBlockContext).
   */
  { en: 'attribute boosts', pt: 'melhorias de atributo' },
  { en: 'attribute boost', pt: 'melhoria de atributo' },
  { en: 'skill increases', pt: 'incrementos de perícia' },
  { en: 'skill increase', pt: 'incremento de perícia' },
  { en: 'initial proficiencies', pt: 'proficiências iniciais' },
  { en: 'ancestry and background', pt: 'ancestralidade e biografia' },
  { en: 'shield block', pt: 'bloqueio com escudo' },
  /* Os rótulos do domínio: medido, "Domain Spell" sozinho virou "Orto Domínio". */
  { en: 'Advanced Domain Spell', pt: 'Magia de Domínio Avançada', exact: true },
  { en: 'Domain Spell', pt: 'Magia de Domínio', exact: true },
  { en: 'Deities', pt: 'Divindades', exact: true },
  { en: 'critical success', pt: 'sucesso crítico' },
  { en: 'critical failure', pt: 'falha crítica' },
  { en: 'critical hit', pt: 'acerto crítico' },
  /*
   * ⚠️ Um termo só pode existir UMA vez, em qualquer caixa: a substituição é uma passada
   * com todos os termos, e "critical success" (qualquer caixa) e "Critical Success"
   * (exata) seriam a mesma chave — o segundo apagaria o primeiro. Quem mantém a caixa
   * do original já cobre o rótulo em negrito.
   */
  /* Magia (PF2E.Item.Spell.Rank.Label, PF2E.Focus.*). */
  { en: 'spell rank', pt: 'círculo da magia' },
  { en: 'cantrips', pt: 'truques' },
  { en: 'cantrip', pt: 'truque' },
  { en: 'focus spells', pt: 'magias de foco' },
  { en: 'focus spell', pt: 'magia de foco' },
  { en: 'focus points', pt: 'pontos de foco' },
  { en: 'focus point', pt: 'ponto de foco' },
  { en: 'Cast a Spell', pt: 'Conjurar uma Magia', exact: true },
  /* As ações básicas mais frequentes na prosa (pf2e.actionspf2e, pelo pacote). */
  { en: 'Strikes', pt: 'Golpes', exact: true },
  { en: 'Strike', pt: 'Golpe', exact: true },
  { en: 'Stride', pt: 'Avançar', exact: true },
  { en: 'Step', pt: 'Passo', exact: true },
  { en: 'Interact', pt: 'Interagir', exact: true },
  { en: 'Seek', pt: 'Procurar', exact: true },
  { en: 'Recall Knowledge', pt: 'Recordar Conhecimento', exact: true },
  { en: 'Sustain', pt: 'Sustentar', exact: true },
  { en: 'Raise a Shield', pt: 'Erguer um Escudo', exact: true },
  { en: 'Take Cover', pt: 'Buscar Cobertura', exact: true },
  { en: 'Treat Wounds', pt: 'Tratar Ferimentos', exact: true },
  /* Os rótulos de bloco em negrito no texto do Foundry (PF2E.Spell*, PF2E.Item.*). */
  { en: 'Heightened', pt: 'Elevada', exact: true },
  { en: 'Success', pt: 'Sucesso', exact: true },
  { en: 'Failure', pt: 'Falha', exact: true },
  { en: 'Trigger', pt: 'Gatilho', exact: true },
  { en: 'Requirements', pt: 'Requisitos', exact: true },
  { en: 'Prerequisites', pt: 'Pré-requisitos', exact: true },
  { en: 'Frequency', pt: 'Frequência', exact: true },
  { en: 'Effect', pt: 'Efeito', exact: true },
  { en: 'Special', pt: 'Especial', exact: true },
  { en: 'Activate', pt: 'Ativar', exact: true },
  { en: 'Usage', pt: 'Uso', exact: true },
  { en: 'Range', pt: 'Alcance', exact: true },
  { en: 'Area', pt: 'Área', exact: true },
  { en: 'Duration', pt: 'Duração', exact: true },
  { en: 'Targets', pt: 'Alvos', exact: true },
  /* O resto do vocabulário de mesa. */
  { en: 'hit points', pt: 'pontos de vida' },
  { en: 'armor class', pt: 'classe de armadura' },
  { en: 'status bonus', pt: 'bônus de estado' },
  { en: 'circumstance bonus', pt: 'bônus de circunstância' },
  { en: 'item bonus', pt: 'bônus de item' },
  { en: 'status penalty', pt: 'penalidade de estado' },
  { en: 'circumstance penalty', pt: 'penalidade de circunstância' },
  { en: 'item penalty', pt: 'penalidade de item' },
  { en: 'multiple attack penalty', pt: 'penalidade de ataques múltiplos' },
  { en: 'flat check', pt: 'teste simples' },
  { en: 'reaction', pt: 'reação' },
  { en: 'free action', pt: 'ação livre' },
];
