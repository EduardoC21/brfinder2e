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

## Backup e restauração

O banco é um SQLite na Cloudflare. Três redes:

- **Exportar tudo** (traduções, votos, apelidos) para um `.sql` local — faça antes de
  qualquer mudança grande, e de vez em quando:

  ```
  npm run db:backup
  ```

  Restaurar num banco novo: rode `db:schema`, renomeie o arquivo para `backup.sql` e
  `npm run db:restore`. Um `.sql` exportado inclui `INSERT`s; num banco já com dados,
  restaure só depois de limpar as tabelas.

- **Toda semana, sozinho**: a Action `Backup da central` (`.github/workflows/backup.yml`)
  exporta o banco aos domingos e guarda como artefato do repositório por 90 dias
  (Actions › Backup da central › a execução › Artifacts). Precisa dos segredos
  `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID` no repositório — o cabeçalho do
  arquivo diz onde criar cada um. O token precisa da permissão **Account › D1 › Edit**;
  o modelo "Edit Cloudflare Workers" não a inclui (o export falha com erro 10000).

- **Time Travel**: o D1 guarda 30 dias de histórico sozinho, no plano gratuito. Para
  voltar a um instante: `npx wrangler d1 time-travel restore brfinder2e --timestamp=<ISO>`.

- **Cada aparelho tem as próprias traduções**: uma central que sumir não apaga o que os
  jogadores já aceitaram ou traduziram — só o que ainda não foi trazido por eles.

## O que fica no banco

Só tradução: língua, tipo, chave e campo da entrada, a impressão digital do original, o
HTML traduzido, a forma e o modelo, um id anônimo por aparelho, o apelido opcional, a
data, e quantas pessoas apertaram "Usar". Nada de IP (só um hash com sal, para o limite
por hora, varrido a cada dia), nada de chave de API, nada de preferência.

## Licença

As traduções são conteúdo derivado do sistema pf2e para o Foundry VTT (Paizo, sob a
Community Use Policy). A central as distribui como a comunidade sempre distribuiu suas
traduções — e o app as BAIXA, nunca as embute.
