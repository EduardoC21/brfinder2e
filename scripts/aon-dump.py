"""
Baixa do Archives of Nethys (API pública de busca, Elasticsearch) os documentos de uma
categoria, para a varredura de inconsistências cruzar com o pack do Foundry.

Uso:  python scripts/aon-dump.py spell feat weapon armor shield equipment background ancestry class

Grava em `.dados/aon/<categoria>.json` — fora do git: é conteúdo da Paizo, como o zip.
Só os campos que a varredura compara; o texto inteiro fica de fora.
"""

import json
import os
import sys
import urllib.request

URL = 'https://elasticsearch.aonprd.com/aon/_search'
CAMPOS = [
    'name', 'category', 'type', 'level', 'legacy_id', 'remaster_id', 'source', 'primary_source',
    'saving_throw', 'actions', 'actions_number', 'trait', 'tradition', 'range', 'area', 'target',
    'duration', 'spell_type', 'rarity', 'prerequisite', 'price', 'price_raw', 'bulk', 'bulk_raw',
    'damage', 'damage_die', 'damage_type', 'hands', 'weapon_category', 'weapon_group',
    'armor_category', 'armor_group', 'ac', 'dex_cap', 'check_penalty', 'speed_penalty',
    'strength', 'hardness', 'hp', 'bt', 'attribute', 'attribute_boost', 'skill', 'feat',
    'size', 'speed', 'vision', 'language', 'attribute_flaw', 'ability_boost', 'ability_flaw',
    'key_attribute', 'perception', 'fortitude_save', 'reflex_save', 'will_save',
    'skill_proficiency', 'url', 'item_category', 'item_subcategory', 'usage', 'cast',
]


def baixar(categoria: str) -> list:
    saida = []
    depois = None
    while True:
        corpo = {
            'size': 1000,
            'query': {'term': {'category': categoria}},
            'sort': [{'id.keyword': 'asc'}],
            '_source': CAMPOS,
        }
        if depois is not None:
            corpo['search_after'] = depois
        pedido = urllib.request.Request(
            URL, data=json.dumps(corpo).encode(), headers={'Content-Type': 'application/json'}
        )
        with urllib.request.urlopen(pedido, timeout=60) as resposta:
            dados = json.load(resposta)
        hits = dados['hits']['hits']
        if not hits:
            break
        saida.extend(h['_source'] | {'_id': h['_id']} for h in hits)
        depois = hits[-1]['sort']
    return saida


if __name__ == '__main__':
    os.makedirs('.dados/aon', exist_ok=True)
    for categoria in sys.argv[1:]:
        docs = baixar(categoria)
        with open(f'.dados/aon/{categoria}.json', 'w', encoding='utf-8') as f:
            json.dump(docs, f, ensure_ascii=False)
        print(categoria, len(docs))
