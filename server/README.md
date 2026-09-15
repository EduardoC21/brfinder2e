# A central de traduções

Um worker na Cloudflare com um banco D1: onde as traduções de máquina de cada pessoa se
juntam para que ninguém traduza a mesma entrada duas vezes. Nível gratuito da Cloudflare
(100 mil pedidos/dia, 5 GB de banco) — sobra por anos. As regras estão em
OPEN-DECISIONS #16; o contrato, no cabeçalho de `src/index.ts`.

## Subir a central (uma vez, uns 10 minutos)

1. Crie uma conta gratuita em https://dash.cloudflare.com (só e-mail).
2. Nesta pasta: `npm install` (instala o `wrangler`, a linha de comando da Cloudflare).
3. `npx wrangler login` — abre o navegador para autorizar.
4. `npx wrangler d1 create brfinder2e` — cria o banco e imprime um `database_id`; cole-o
   em `wrangler.toml` no lugar de `SUBSTITUA-PELO-ID`.
5. `npm run db:schema` — cria as tabelas.
6. `npx wrangler secret put IP_SALT` — digite uma frase qualquer (é o sal do hash do IP
   para o limite por hora; o IP em si nunca é guardado).
7. `npm run deploy` — imprime a URL, algo como `https://brfinder2e-central.<conta>.workers.dev`.
8. Cole essa URL no app, em Configurações › Tradução › Traduções compartilhadas.

Para testar sem subir: `npm run db:schema:local` e `npm run dev` (fica em
http://localhost:8787). `GET /v1/health` responde `{"ok":true}`.

## O que fica no banco

Só tradução: língua, tipo, chave e campo da entrada, a impressão digital do original, o
HTML traduzido, a forma e o modelo, um id anônimo por aparelho, o apelido opcional, a
data, e quantas pessoas apertaram "Usar". Nada de IP (só um hash com sal, para o limite
por hora, varrido a cada dia), nada de chave de API, nada de preferência.

## Licença

As traduções são conteúdo derivado do sistema pf2e para o Foundry VTT (Paizo, sob a
Community Use Policy). A central as distribui como a comunidade sempre distribuiu suas
traduções — e o app as BAIXA, nunca as embute.
