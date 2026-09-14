"""
A VARREDURA de inconsistências do pack do Foundry (Etapa 29).

Cruza o zip `.dados/json-assets-pf2e-<versão>.zip` com (a) ele mesmo — a prosa do jornal
contra os campos — e (b) o Archives of Nethys baixado por `aon-dump.py`. Não altera nada:
escreve `.dados/varredura/relatorio.md` (para ler) e `relatorio.json` (para o PR ao pf2e).

Uso:  python scripts/varredura-foundry.py [.dados/json-assets-pf2e-8.5.0.zip]

Regras de leitura dos resultados: toda divergência listada é MEDIDA, mas nem toda é erro
do Foundry — a receita de cada bloco explica o que compara e onde o AoN pode ser o errado.
"""

import collections
import json
import os
import re
import sys
import zipfile

ZIP = sys.argv[1] if len(sys.argv) > 1 else '.dados/json-assets-pf2e-8.5.0.zip'
SAIDA = '.dados/varredura'
os.makedirs(SAIDA, exist_ok=True)

z = zipfile.ZipFile(ZIP)


def pack(nome):
    return json.loads(z.read(f'packs/{nome}.json').decode('utf-8'))


def aon(categoria):
    caminho = f'.dados/aon/{categoria}.json'
    return json.load(open(caminho, encoding='utf-8')) if os.path.exists(caminho) else []


def limpa(html):
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', html or '')).strip()


def nome_chave(n):
    return re.sub(r'\s+', ' ', n.strip().lower())


relatorio = []      # blocos de markdown
achados = {}        # bloco → lista de dicts (para o JSON)


def bloco(titulo, comparados, casos, nota='', teto=40):
    achados[titulo] = casos
    linhas = [f'## {titulo}', '', f'Comparados: {comparados}. Divergências: {len(casos)}.', '']
    if nota:
        linhas += [nota, '']
    for c in casos[:teto]:
        linhas.append(f'- **{c["nome"]}** — {c["campo"]}: foundry `{c["foundry"]}` · {c.get("contra", "aon")} `{c["outro"]}`')
    if len(casos) > teto:
        linhas.append(f'- … e mais {len(casos) - teto} (no JSON).')
    linhas.append('')
    relatorio.extend(linhas)
    print(f'{titulo}: {comparados} comparados, {len(casos)} divergências')


def caso(nome, campo, foundry, outro, contra='aon'):
    return {'nome': nome, 'campo': campo, 'foundry': foundry, 'outro': outro, 'contra': contra}


# ---------------------------------------------------------------- AoN por nome
def indice_aon(categorias):
    """Nome → (atual, legado): o AoN guarda as duas versões; `remaster_id` marca o legado."""
    por_nome = collections.defaultdict(lambda: {'atual': None, 'legado': None})
    for cat in categorias:
        for d in aon(cat):
            k = nome_chave(d['name'])
            slot = 'legado' if d.get('remaster_id') else 'atual'
            if por_nome[k][slot] is None:
                por_nome[k][slot] = d
    return por_nome


def escolhe(por_nome, nome, remaster):
    """Só a MESMA era: remaster com remaster, legado com legado. Cruzar eras compararia o
    vocabulário antigo (escolas de magia, positive/negative, tiefling) com o novo, e isso
    não é defeito de ninguém."""
    par = por_nome.get(nome_chave(nome))
    if par is None:
        return None
    return par['atual'] if remaster else par['legado']


def remaster(doc):
    return (doc.get('system', {}).get('publication') or {}).get('remaster') is not False


RARIDADES = {'common', 'uncommon', 'rare', 'unique'}
# O que o AoN escreve como traço e o Foundry guarda em outro lugar (ou não guarda).
TRACOS_FORA = RARIDADES | {'cantrip', 'focus', 'ritual'}
ACOES_AON = {
    '1': 'single action', '2': 'two actions', '3': 'three actions',
    'reaction': 'reaction', 'free': 'free action',
}


def acoes_normal(t):
    """Para o vocabulário do Foundry: "Two Actions" → "2", "Single Action or Two Actions" → "1 to 2"."""
    t = t.lower().replace(' or ', ' to ')
    for frase, curto in [('single action', '1'), ('two actions', '2'), ('three actions', '3'),
                         ('free action', 'free'), ('one action', '1')]:
        t = t.replace(frase, curto)
    return t.strip()


def acoes_foundry(system):
    t = (system.get('time') or {}).get('value')
    if t is None:
        at = (system.get('actionType') or {}).get('value')
        n = (system.get('actions') or {}).get('value')
        if at == 'action' and n:
            t = str(n)
        elif at in ('reaction', 'free'):
            t = at
        else:
            return None
    return acoes_normal(str(t).strip())


def acoes_aon(d):
    a = d.get('actions')
    return acoes_normal(a) if isinstance(a, str) else None


ESCOLAS = {'abjuration', 'conjuration', 'divination', 'enchantment', 'evocation', 'illusion', 'necromancy', 'transmutation'}
ALINHAMENTO = {'lawful', 'chaotic', 'good', 'evil'}
RENOMEADOS = {'metamagic': 'spellshape', 'positive': 'vitality', 'negative': 'void', 'aasimar': 'nephilim', 'tiefling': 'nephilim', 'gnoll': 'kholo', 'ifrit': 'naari', 'oread': 'ardande', 'sylph': 'talos', 'undine': 'suli'}


def tracos(lista):
    """Minúsculas, sem raridade, sem escola nem alinhamento (vocabulário legado que o Foundry
    já não guarda), e com o legado renomeado para o Remaster (positive → vitality)."""
    out = set()
    for t in lista or []:
        t = t.lower().replace(' ', '-')
        if t in TRACOS_FORA or t in ESCOLAS or t in ALINHAMENTO:
            continue
        out.add(RENOMEADOS.get(t, t))
    return out


# ---------------------------------------------------------------- 1. magias × AoN
def varre_magias():
    idx = indice_aon(['spell', 'ritual'])
    casos = []
    n = 0
    for d in pack('spells'):
        s = d['system']
        a = escolhe(idx, d['name'], remaster(d))
        if a is None:
            continue
        n += 1
        nome = d['name']
        if s['level']['value'] != a.get('level'):
            casos.append(caso(nome, 'rank', s['level']['value'], a.get('level')))
        # salvamento: `defense.save {statistic, basic}` ou `defense.passive {statistic}`
        df = s.get('defense') or {}
        if df.get('save'):
            fs = ('basic ' if df['save'].get('basic') else '') + df['save']['statistic']
        elif df.get('passive'):
            fs = df['passive']['statistic']
        else:
            fs = ''
        asv = (a.get('saving_throw') or '').lower()
        if asv == 'ac' and 'attack' in s['traits'].get('value', []):
            asv = ''  # o AoN escreve "AC" para toda magia de ataque; o Foundry guarda só o traço
        if asv and fs.lower() != asv:
            campo = 'salvamento (basic?)' if fs.lower().replace('basic ', '') == asv else 'salvamento'
            casos.append(caso(nome, campo, fs or '—', asv))
        ft = {t.lower() for t in s['traits'].get('traditions', [])}
        # `elemental` é lista derivada no AoN; o Foundry não a guarda como tradição.
        at = {t.lower() for t in a.get('tradition', [])} - {'elemental'}
        if ft != at:
            casos.append(caso(nome, 'tradições', sorted(ft), sorted(at)))
        fa, aa = acoes_foundry(s), acoes_aon(a)
        if fa and aa and fa != aa:
            casos.append(caso(nome, 'ações', fa, aa))
        tf = tracos(s['traits'].get('value', []))
        ta = tracos(a.get('trait', []))
        if ta and tf != ta:
            casos.append(caso(nome, 'traços', sorted(tf ^ ta), f'só foundry {sorted(tf - ta)} · só aon {sorted(ta - tf)}'))
        fr = re.match(r'^(\d+) feet$', (s.get('range') or {}).get('value') or '')
        if fr and isinstance(a.get('range'), int) and int(fr.group(1)) != a['range']:
            casos.append(caso(nome, 'alcance', fr.group(1), a['range']))
        if s['traits'].get('rarity', 'common') != (a.get('rarity') or 'common'):
            casos.append(caso(nome, 'raridade', s['traits'].get('rarity'), a.get('rarity')))
    bloco('1. Magias × AoN', n, casos,
          'Rank, salvamento (`defense`), tradições, ações, traços, alcance em pés e raridade. '
          'O AoN escreve "basic Reflex" e "AC"; o Foundry, `save.basic` e `passive.statistic`.')


# ---------------------------------------------------------------- 2. talentos × AoN
def varre_talentos():
    idx = indice_aon(['feat'])
    casos = []
    n = 0
    for d in pack('feats'):
        s = d['system']
        a = escolhe(idx, d['name'], remaster(d))
        if a is None:
            continue
        n += 1
        nome = d['name']
        if s['level']['value'] != a.get('level'):
            casos.append(caso(nome, 'nível', s['level']['value'], a.get('level')))
        tf = tracos(s['traits'].get('value', []))
        ta = tracos(a.get('trait', []))
        if ta and tf != ta:
            casos.append(caso(nome, 'traços', sorted(tf ^ ta), f'só foundry {sorted(tf - ta)} · só aon {sorted(ta - tf)}'))
        fa, aa = acoes_foundry(s), acoes_aon(a)
        if (fa or aa) and fa != aa:
            casos.append(caso(nome, 'ações', fa or '—', aa or '—'))
        fp = '; '.join(p.get('value', '') for p in (s.get('prerequisites') or {}).get('value', []))
        ap = a.get('prerequisite') or ''
        if bool(fp) != bool(ap):
            casos.append(caso(nome, 'pré-requisitos (presença)', fp or '—', limpa(ap) or '—'))
        if s['traits'].get('rarity', 'common') != (a.get('rarity') or 'common'):
            casos.append(caso(nome, 'raridade', s['traits'].get('rarity'), a.get('rarity')))
    bloco('2. Talentos × AoN', n, casos,
          'Nível, traços, ações, presença de pré-requisitos e raridade. O texto dos '
          'pré-requisitos não é comparado palavra a palavra: só se um lado tem e o outro não.')


# ---------------------------------------------------------------- 3. equipamento × AoN
def preco_cp(valor):
    v = valor or {}
    return v.get('gp', 0) * 100 + v.get('sp', 0) * 10 + v.get('cp', 0) + v.get('pp', 0) * 1000


def varre_equipamento():
    idx = indice_aon(['weapon', 'armor', 'shield', 'equipment'])
    casos = []
    n = 0
    for d in pack('equipment'):
        s = d['system']
        a = escolhe(idx, d['name'], remaster(d))
        if a is None:
            continue
        n += 1
        nome = d['name']
        nivel = (s.get('level') or {}).get('value')
        if nivel is not None and isinstance(a.get('level'), int) and a['level'] >= 0 and nivel != a['level']:
            casos.append(caso(nome, 'nível', nivel, a.get('level')))
        pf = preco_cp((s.get('price') or {}).get('value'))
        if isinstance(a.get('price'), (int, float)) and pf != a['price']:
            casos.append(caso(nome, 'preço (cp)', pf, a['price']))
        bf = (s.get('bulk') or {}).get('value')
        # Só quando o AoN ESCREVE o volume (`bulk_raw`): `bulk: 0` sem `bulk_raw` é ausência, não zero.
        if a.get('bulk_raw') and isinstance(a.get('bulk'), (int, float)) and bf is not None and float(bf) != float(a['bulk']):
            casos.append(caso(nome, 'volume', bf, a['bulk_raw']))
        if s['traits'].get('rarity', 'common') != (a.get('rarity') or 'common'):
            casos.append(caso(nome, 'raridade', s['traits'].get('rarity'), a.get('rarity')))
        if d['type'] == 'weapon' and s.get('damage'):
            fd = f"{s['damage'].get('dice', 1)}d{str(s['damage'].get('die', '')).lstrip('d')}"
            ad = (a.get('damage') or '').split(' ')[0]
            if ad and fd != ad and not ad.startswith(fd):
                casos.append(caso(nome, 'dano', fd, a.get('damage')))
            if (s.get('group') or '') != (a.get('weapon_group') or '').lower().replace(' ', '-') and a.get('weapon_group'):
                casos.append(caso(nome, 'grupo', s.get('group'), a.get('weapon_group')))
            if (s.get('category') or '') != (a.get('weapon_category') or '').lower() and a.get('weapon_category'):
                casos.append(caso(nome, 'categoria', s.get('category'), a.get('weapon_category')))
        if d['type'] == 'armor':
            for fcampo, acampo in [('acBonus', 'ac'), ('dexCap', 'dex_cap'), ('checkPenalty', 'check_penalty'), ('strength', 'strength')]:
                if acampo in a and s.get(fcampo) != a[acampo]:
                    casos.append(caso(nome, fcampo, s.get(fcampo), a[acampo]))
            if (s.get('category') or '') != (a.get('armor_category') or '').lower() and a.get('armor_category'):
                casos.append(caso(nome, 'categoria', s.get('category'), a.get('armor_category')))
        if d['type'] == 'shield':
            for fcampo, acampo in [('acBonus', 'ac'), ('hardness', 'hardness')]:
                if acampo in a and s.get(fcampo) != a[acampo]:
                    casos.append(caso(nome, fcampo, s.get(fcampo), a[acampo]))
            if 'hp' in a and (s.get('hp') or {}).get('max') != a['hp']:
                casos.append(caso(nome, 'PV', (s.get('hp') or {}).get('max'), a['hp']))
    bloco('3. Equipamento × AoN', n, casos,
          'Nível, preço em cp, volume, raridade; arma: dano, grupo, categoria; armadura: CA, limite '
          'de Des, penalidade, Força; escudo: CA, dureza, PV. Itens com o mesmo nome em '
          'graus (Minor/Lesser…) são comparados pelo nome inteiro.')


# ---------------------------------------------------------------- 4. antecedentes × AoN
TAMANHO = {'tiny': 'tiny', 'sm': 'small', 'med': 'medium', 'lg': 'large', 'huge': 'huge', 'grg': 'gargantuan'}
ATR = {'str': 'strength', 'dex': 'dexterity', 'con': 'constitution', 'int': 'intelligence', 'wis': 'wisdom', 'cha': 'charisma'}


def varre_antecedentes():
    idx = indice_aon(['background'])
    casos = []
    n = 0
    for d in pack('backgrounds'):
        s = d['system']
        a = escolhe(idx, d['name'], remaster(d))
        if a is None:
            continue
        n += 1
        nome = d['name']
        slots = [v.get('value', []) for v in (s.get('boosts') or {}).values()]
        fixos = sorted({ATR[c] for sl in slots if len(sl) < 6 for c in sl})
        aon_atr = sorted({x.lower() for x in a.get('attribute', []) if x.lower() != 'free'})
        if fixos != aon_atr:
            casos.append(caso(nome, 'aumento', fixos, aon_atr))
        # Só as perícias NOMEADAS: o Saber "à escolha" o AoN escreve em prosa e o Foundry não guarda.
        def nomeada(x):
            x = x.lower().strip().rstrip('.')
            return x if len(x.split()) <= 3 and not re.search(r'choice|related|relevant|appropriate|your|one ', x) else None
        fsk = sorted({*(x.lower() for x in s['trainedSkills'].get('value', [])), *(n for n in map(nomeada, s['trainedSkills'].get('lore', [])) if n)})
        ask = sorted(n for n in map(nomeada, a.get('skill', [])) if n)
        if fsk != ask:
            casos.append(caso(nome, 'perícias', fsk, ask))
        ff = sorted(i['name'].lower() for i in (s.get('items') or {}).values())
        af = sorted(x.lower() for x in a.get('feat', []))
        if ff != af:
            casos.append(caso(nome, 'talento', ff, af))
    bloco('4. Antecedentes × AoN', n, casos, 'Aumentos fixos, perícias (com o Saber) e o talento concedido.')


# ---------------------------------------------------------------- 5. ancestralidades × AoN
def varre_ancestralidades():
    idx = indice_aon(['ancestry'])
    casos = []
    n = 0
    for d in pack('ancestries'):
        s = d['system']
        a = escolhe(idx, d['name'], remaster(d))
        if a is None:
            continue
        n += 1
        nome = d['name']
        if s.get('hp') != a.get('hp'):
            casos.append(caso(nome, 'PV', s.get('hp'), a.get('hp')))
        if (s.get('speed') or 0) != (a.get('speed') or {}).get('land'):
            casos.append(caso(nome, 'deslocamento', s.get('speed'), (a.get('speed') or {}).get('land')))
        if TAMANHO.get((s.get('size') or '').lower(), s.get('size')) != ' '.join(a.get('size', [])).lower() and len(a.get('size', [])) == 1:
            casos.append(caso(nome, 'tamanho', s.get('size'), a.get('size')))
        slots = [v.get('value', []) for v in (s.get('boosts') or {}).values()]
        fixos = sorted(ATR[c] for sl in slots if len(sl) == 1 for c in sl)
        aon_atr = sorted(x.lower() for x in a.get('attribute', []) if 'free' not in x.lower())
        if fixos != aon_atr:
            casos.append(caso(nome, 'aumentos', fixos, aon_atr))
        ffl = sorted(ATR[c] for v in (s.get('flaws') or {}).values() for c in v.get('value', []))
        afl = sorted(x.lower() for x in a.get('attribute_flaw', []))
        if ffl != afl:
            casos.append(caso(nome, 'falha', ffl, afl))
        fl = sorted(x.lower() for x in (s.get('languages') or {}).get('value', []))
        al = sorted(x.lower() for x in a.get('language', []))
        if fl != al:
            casos.append(caso(nome, 'idiomas', fl, al))
    bloco('5. Ancestralidades × AoN', n, casos, 'PV, deslocamento, tamanho, aumentos fixos, falha e idiomas.')


# ---------------------------------------------------------------- 6. classe: jornal × campos
RANK = {'trained': 1, 'expert': 2, 'master': 3, 'legendary': 4}


def bloco_jornal(texto, titulo, proximo):
    i = texto.find(titulo + ' ')
    if i < 0:
        return ''
    j = texto.find(proximo, i + len(titulo))
    return texto[i + len(titulo):j if j > 0 else None]


def varre_classes():
    J = pack('journals')
    paginas = {p['name']: limpa(p['text']['content']) for j in J if j['name'] == 'Classes' for p in j['pages']}
    casos = []
    n = 0
    for d in pack('classes'):
        s = d['system']
        nome = d['name']
        t = paginas.get(nome)
        if not t:
            continue
        n += 1
        # PV
        m = re.search(r'Hit Points (\d+) plus', t)
        if m and int(m.group(1)) != s['hp']:
            casos.append(caso(nome, 'PV', s['hp'], m.group(1), 'jornal'))
        # percepção
        m = re.search(r'Perception (Trained|Expert|Master|Legendary) in Perception', t)
        if m and RANK[m.group(1).lower()] != s['perception']:
            casos.append(caso(nome, 'percepção', s['perception'], m.group(1), 'jornal'))
        # resistências
        b = bloco_jornal(t, 'Saving Throws', 'Skills')
        for chave, rotulo in [('fortitude', 'Fortitude'), ('reflex', 'Reflex'), ('will', 'Will')]:
            m = re.search(r'(Trained|Expert|Master|Legendary) in ' + rotulo, b)
            if m and RANK[m.group(1).lower()] != s['savingThrows'][chave]:
                casos.append(caso(nome, f'resistência {chave}', s['savingThrows'][chave], m.group(1), 'jornal'))
        # perícias fixas
        b = bloco_jornal(t, 'Skills', 'Attacks')
        SK = ['acrobatics', 'arcana', 'athletics', 'crafting', 'deception', 'diplomacy', 'intimidation', 'medicine', 'nature', 'occultism', 'performance', 'religion', 'society', 'stealth', 'survival', 'thievery']
        livro = set()
        for m in re.finditer(r'Trained in ((?:[A-Z][a-z]+(?:, and |, | and )?)+)', b):
            livro |= {w.lower() for w in re.findall(r'[A-Z][a-z]+', m.group(1)) if w.lower() in SK}
        if livro and livro != set(s['trainedSkills']['value']):
            casos.append(caso(nome, 'perícias fixas', sorted(s['trainedSkills']['value']), sorted(livro), 'jornal'))
        m = re.search(r'additional skills equal to (\d+)', b)
        if m and int(m.group(1)) != s['trainedSkills']['additional']:
            casos.append(caso(nome, 'perícias extras', s['trainedSkills']['additional'], m.group(1), 'jornal'))
        # ataques
        b = bloco_jornal(t, 'Attacks', 'Defenses').replace('simple and martial weapons', 'simple weapons, martial weapons').replace('simple weapons and martial weapons', 'simple weapons, martial weapons')
        for chave, rotulo in [('simple', 'simple weapons'), ('martial', 'martial weapons'), ('advanced', 'advanced weapons'), ('unarmed', 'unarmed attacks')]:
            m = re.search(r'(Trained|Expert|Master|Legendary) in (?:[a-z ,]*?, )?' + rotulo, b)
            livro = RANK[m.group(1).lower()] if m else 0
            if livro != s['attacks'][chave]:
                casos.append(caso(nome, f'ataque {chave}', s['attacks'][chave], livro, 'jornal'))
        # defesas
        b = bloco_jornal(t, 'Defenses', 'Class DC').replace('all armor', 'light armor, medium armor, heavy armor').replace('light and medium armor', 'light armor, medium armor').replace('light, medium, and heavy armor', 'light armor, medium armor, heavy armor')
        for chave, rotulo in [('unarmored', 'unarmored defense'), ('light', 'light armor'), ('medium', 'medium armor'), ('heavy', 'heavy armor')]:
            m = re.search(r'(Trained|Expert|Master|Legendary) in (?:[a-z ,]*?, )?' + rotulo, b)
            livro = RANK[m.group(1).lower()] if m else 0
            if livro != s['defenses'][chave]:
                casos.append(caso(nome, f'defesa {chave}', s['defenses'][chave], livro, 'jornal'))
    bloco('6. Classe: página do jornal × campos', n, casos,
          'PV, percepção, resistências, perícias fixas e extras, ataques e defesas, lidos do bloco '
          '"Initial Proficiencies" da página. Ausente no texto vale destreinado.')


# ---------------------------------------------------------------- 7. classe: tabela de progressão × items
def varre_progressao():
    J = pack('journals')
    paginas = {p['name']: p['text']['content'] for j in J if j['name'] == 'Classes' for p in j['pages']}
    casos = []
    n = 0
    for d in pack('classes'):
        html = paginas.get(d['name'])
        if not html:
            continue
        tabelas = re.findall(r'<table.*?</table>', html, re.S)
        tab = next((t for t in tabelas if 'Class Features' in t), None)
        if tab is None:
            continue
        n += 1
        linhas = {}
        for tr in re.findall(r'<tr.*?</tr>', tab, re.S):
            cels = [limpa(c) for c in re.findall(r'<t[dh][^>]*>(.*?)</t[dh]>', tr, re.S)]
            if len(cels) >= 2 and cels[0].isdigit():
                linhas[int(cels[0])] = cels[1].lower()
        for it in d['system']['items'].values():
            nome = re.sub(r'\s*\(.*?\)\s*$', '', it['name']).lower()
            linha = linhas.get(it['level'], '')
            if nome not in linha:
                casos.append(caso(d['name'], f'nível {it["level"]}', it['name'], linha[:90] + ('…' if len(linha) > 90 else ''), 'jornal'))
    bloco('7. Classe: habilidades por nível × tabela de progressão', n, casos,
          'Cada habilidade de `system.items` deve aparecer, pelo nome, na linha do seu nível na '
          'tabela da página. O parêntese do nome ("Anathema (Druid)") é ignorado. Muitos casos são '
          'só nome diferente ("2nd-rank spells" na tabela, "Druid Spellcasting" no item) — ler antes de contar.')


# ---------------------------------------------------------------- 8. ancestralidade: mecânica do jornal × campos
def varre_ancestralia_jornal():
    J = pack('journals')
    paginas = {p['name']: limpa(p['text']['content']) for j in J if j['name'] == 'Ancestries' for p in j['pages']}
    casos = []
    n = 0
    for d in pack('ancestries'):
        s = d['system']
        t = paginas.get(d['name'])
        if not t:
            continue
        n += 1
        nome = d['name']
        m = re.search(r'Hit Points (\d+)', t)
        if m and int(m.group(1)) != s.get('hp'):
            casos.append(caso(nome, 'PV', s.get('hp'), m.group(1), 'jornal'))
        m = re.search(r'Speed (\d+) feet', t)
        if m and int(m.group(1)) != s.get('speed'):
            casos.append(caso(nome, 'deslocamento', s.get('speed'), m.group(1), 'jornal'))
        m = re.search(r'Size (Tiny|Small|Medium|Large|Huge)(?: or (Tiny|Small|Medium|Large|Huge))?', t)
        if m and len([x for x in m.groups() if x]) == 1 and m.group(1).lower() != TAMANHO.get((s.get('size') or '').lower(), s.get('size')):
            casos.append(caso(nome, 'tamanho', s.get('size'), m.group(1), 'jornal'))
        m = re.search(r'Attribute Boosts? ((?:Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma|Free|Two free attribute boosts|, | )+)', t)
        if m:
            livro = sorted(w.lower() for w in re.findall(r'Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma', m.group(1)))
            slots = [v.get('value', []) for v in (s.get('boosts') or {}).values()]
            fixos = sorted(ATR[c] for sl in slots if len(sl) == 1 for c in sl)
            if livro != fixos:
                casos.append(caso(nome, 'aumentos', fixos, livro, 'jornal'))
        m = re.search(r'Attribute Flaw ((?:Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma))', t)
        ffl = sorted(ATR[c] for v in (s.get('flaws') or {}).values() for c in v.get('value', []))
        if m and [m.group(1).lower()] != ffl:
            casos.append(caso(nome, 'falha', ffl, m.group(1), 'jornal'))
    bloco('8. Ancestralidade: bloco de mecânica do jornal × campos', n, casos,
          'PV, deslocamento, tamanho (quando é um só), aumentos fixos e falha, lidos da página.')


# ---------------------------------------------------------------- 9. divindades: texto × campos
def varre_divindades():
    casos = []
    n = 0
    for d in pack('deities'):
        s = d['system']
        t = limpa(s['description']['value'])
        m = re.search(r'Domains ([A-Za-z, ]+?)(?: Alternate Domains| Cleric Spells| Divine Font| Favored Weapon| Divine Skill| Sanctification|$)', t)
        if not m:
            continue
        n += 1
        livro = sorted(x.strip().lower() for x in m.group(1).split(',') if x.strip())
        campo = sorted(x.lower() for x in (s.get('domains') or {}).get('primary', []))
        if livro != campo:
            casos.append(caso(d['name'], 'domínios', campo, livro, 'texto'))
    bloco('9. Divindades: texto × domínios', n, casos, 'A linha "Domains" da descrição contra `domains.primary`.')


# ---------------------------------------------------------------- 10. as quatro pendentes
def varre_pendentes():
    eq = pack('equipment')
    try:
        pastas = {f['_id']: f for f in pack('equipment_folders')}
    except KeyError:
        pastas = {}
    casos = []
    n = 0
    for d in eq:
        fid = d.get('folder')
        if not fid or fid not in pastas:
            continue
        n += 1
        pasta = pastas[fid]['name']
        palavras = {re.sub(r'ves$', 'f', w.lower()).rstrip('s') for w in re.findall(r'[A-Za-z]+', pasta)}
        tr = {x.lower() for x in d['system']['traits'].get('value', [])} | {str(d['system'].get('category', '')).lower(), str(d['system'].get('group', '')).lower(), d['type']}
        if not any(p in ' '.join(tr) for p in palavras):
            casos.append(caso(d['name'], 'pasta × traços', pasta, sorted(tr), 'pasta'))
    bloco('10a. Equipamento: pasta do compêndio × traços', n, casos,
          'Itens em pasta cujo nome não aparece em traço, categoria, grupo ou tipo. Heurística: ler.')

    casos = [caso(d['name'], 'traço composto', [t for t in d['system']['traits'].get('value', []) if t.startswith('integrated-')], '—', 'traços')
             for d in eq if any(t.startswith('integrated-') for t in d['system']['traits'].get('value', []))]
    bloco('10b. Escudo: traços compostos `integrated-*`', len(eq), casos, 'Slug composto que nenhuma regra de sufixo alcança.')

    lang = json.loads(z.read('lang/en.json').decode('utf-8'))
    descr = set()
    def anda(o, chave=''):
        if isinstance(o, dict):
            for k, v in o.items():
                anda(v, f'{chave}.{k}' if chave else k)
        elif chave.startswith('PF2E.TraitDescription'):
            descr.add(chave[len('PF2E.TraitDescription'):].lower())
    anda(lang)
    usados = collections.Counter()
    for p in ['feats', 'spells', 'equipment', 'actions', 'ancestries', 'heritages', 'backgrounds', 'class-features', 'ancestry-features', 'conditions', 'deities', 'familiar-abilities', 'classes']:
        try:
            docs = pack(p)
        except KeyError:
            continue
        for d in docs:
            for t in (d.get('system', {}).get('traits') or {}).get('value', []) or []:
                usados[t] += 1
    conhecidos = {x.replace('-', '') for x in descr}

    def tem(t):
        partes = t.lower().split('-')
        while partes:
            if ''.join(partes) in conhecidos:
                return True
            partes.pop()
        return False
    sem = [caso(t, 'traço sem PF2E.TraitDescription', n_, '—', 'idioma') for t, n_ in sorted(usados.items(), key=lambda x: -x[1]) if not tem(t)]
    bloco('10c. Traços usados sem descrição na tabela de idioma', len(usados), sem,
          f'{len(descr)} descrições na tabela; o número é quantas entradas usam o traço.', teto=60)


if __name__ == '__main__':
    for f in [varre_magias, varre_talentos, varre_equipamento, varre_antecedentes, varre_ancestralidades,
              varre_classes, varre_progressao, varre_ancestralia_jornal, varre_divindades, varre_pendentes]:
        f()
    with open(f'{SAIDA}/relatorio.md', 'w', encoding='utf-8') as f:
        f.write('# Varredura do pack do Foundry\n\n' + '\n'.join(relatorio))
    with open(f'{SAIDA}/relatorio.json', 'w', encoding='utf-8') as f:
        json.dump(achados, f, ensure_ascii=False, indent=1)
    print('relatório em', SAIDA)
