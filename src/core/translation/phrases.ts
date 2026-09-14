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
  { en: 'hit point', pt: 'ponto de vida' },
  { en: 'armor class', pt: 'classe de armadura' },
  /*
   * As SIGLAS (Etapa 38): medido na amostra, o motor deixa AC, DC, HP, GM e PC em
   * inglês — 26 "DC" e 26 "PC" em 120 entradas. As do módulo: CA (PF2E.ArmorClassShortLabel),
   * CD (PF2E.Check.DC.Unspecific), PV (PF2E.HitPointsShortLabel); Mestre e PJ são as do
   * Livro Básico em português. Exatas: "ac" e "dc" minúsculos não são siglas.
   */
  { en: 'class DC', pt: 'CD de classe', exact: true },
  { en: 'spell DC', pt: 'CD de magia', exact: true },
  { en: 'AC', pt: 'CA', exact: true },
  { en: 'DC', pt: 'CD', exact: true },
  { en: 'DCs', pt: 'CDs', exact: true },
  { en: 'HP', pt: 'PV', exact: true },
  { en: 'GM', pt: 'Mestre', exact: true },
  { en: 'GMs', pt: 'Mestres', exact: true },
  { en: 'PC', pt: 'PJ', exact: true },
  { en: 'PCs', pt: 'PJs', exact: true },
  { en: 'NPC', pt: 'PdM', exact: true },
  { en: 'NPCs', pt: 'PdMs', exact: true },
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
  /*
   * Testes, jogadas e salvamentos por nome (Etapa 38): medido, "Reflex saves" saía
   * "Reflexos salvamentos", "ranged attack rolls" saía "intervalos de ataques", "skill
   * checks" saía "verificações de habilidade". Os termos são os do módulo
   * (PF2E.Check.Label "Teste", PF2E.Familiar.AttackRoll, PF2E.SavingThrow).
   */
  { en: 'Fortitude saves', pt: 'salvamentos de Fortitude' },
  { en: 'Reflex saves', pt: 'salvamentos de Reflexos' },
  { en: 'Will saves', pt: 'salvamentos de Vontade' },
  { en: 'Fortitude save', pt: 'salvamento de Fortitude' },
  { en: 'Reflex save', pt: 'salvamento de Reflexos' },
  { en: 'Will save', pt: 'salvamento de Vontade' },
  { en: 'basic Fortitude save', pt: 'salvamento básico de Fortitude' },
  { en: 'basic Reflex save', pt: 'salvamento básico de Reflexos' },
  { en: 'basic Will save', pt: 'salvamento básico de Vontade' },
  { en: 'ranged attack rolls', pt: 'jogadas de ataque à distância' },
  { en: 'melee attack rolls', pt: 'jogadas de ataque corpo a corpo' },
  { en: 'spell attack rolls', pt: 'jogadas de ataque de magia' },
  { en: 'spell attack roll', pt: 'jogada de ataque de magia' },
  { en: 'attack rolls', pt: 'jogadas de ataque' },
  { en: 'attack roll', pt: 'jogada de ataque' },
  { en: 'skill checks', pt: 'testes de perícia' },
  { en: 'skill check', pt: 'teste de perícia' },
  { en: 'Perception checks', pt: 'testes de Percepção' },
  { en: 'Perception check', pt: 'teste de Percepção' },
  { en: 'counteract check', pt: 'teste de neutralização' },
  { en: 'persistent damage', pt: 'dano persistente' },
  { en: 'Dismiss', pt: 'Dispensar', exact: true },
  /*
   * Os rótulos de bloco da DIVINDADE (PF2E.Item.Deity.*, PF2E.Biography*): são 8 por
   * divindade, em 500 divindades, e sozinhos o motor fazia "Editas" de "Edicts".
   */
  { en: 'Edicts', pt: 'Éditos', exact: true },
  { en: 'Anathema', pt: 'Anátema', exact: true },
  { en: 'Areas of Concern', pt: 'Áreas de Interesse', exact: true },
  { en: 'Divine Attribute', pt: 'Atributo Divino', exact: true },
  { en: 'Divine Font', pt: 'Fonte Divina', exact: true },
  { en: 'Divine Skill', pt: 'Perícia Divina', exact: true },
  { en: 'Divine Sanctification', pt: 'Santificação Divina', exact: true },
  { en: 'Favored Weapon', pt: 'Arma Favorita', exact: true },
  { en: 'Favored Weapons', pt: 'Armas Favoritas', exact: true },
  { en: 'Domains', pt: 'Domínios', exact: true },
  { en: 'Alternate Domains', pt: 'Domínios Alternativos', exact: true },
  { en: 'Cleric Spells', pt: 'Magias de Clérigo', exact: true },
  { en: 'Religious Symbol', pt: 'Símbolo Religioso', exact: true },
  { en: 'Sacred Animal', pt: 'Animal Sagrado', exact: true },
  { en: 'Sacred Colors', pt: 'Cores Sagradas', exact: true },
  { en: 'Pantheons', pt: 'Panteões', exact: true },
  { en: 'Pantheon Members', pt: 'Membros do Panteão', exact: true },
];
