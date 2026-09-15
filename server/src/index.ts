/**
 * A CENTRAL DE TRADUÇÕES (Etapa 54, pelo autor): um worker na Cloudflare com um banco D1,
 * onde as traduções de MÁQUINA de cada pessoa se juntam para que ninguém traduza a mesma
 * entrada duas vezes — nem gaste cota para ler o que outro já traduziu.
 *
 * O contrato (tudo sob `/v1`, JSON, CORS aberto — o app pode viver em qualquer origem):
 *
 *   GET    /health                                  está de pé?
 *   GET    /translations/:lang/:type[?since=ISO]    o pacote do tipo: a melhor candidata por
 *                                                   (chave, campo, impressão) — é o
 *                                                   "Aceitar todas" e a busca por fonte
 *   GET    /translations/:lang/:type/:key           todas as candidatas de uma entrada
 *   POST   /translations                            um envio (ver `parseSubmission`)
 *   POST   /translations/:id/use     {senderId}     "Usar": conta uma vez por aparelho
 *   DELETE /translations/:id         {senderId}     esconde o que VOCÊ mandou
 *   GET    /stats/:lang                             quantas entradas por tipo
 *   GET    /gh-dl/*, /gh-api/*                      o proxy do release do Foundry (CORS),
 *                                                   o mesmo que o Vite faz em dev
 *
 * Sem login: um id anônimo por aparelho, um apelido opcional, e o limite por hora. O que
 * chega passa pela MESMA trava do editor (as marcas do Foundry do original têm de
 * continuar). O IP nunca é guardado — só um hash com sal, para o limite.
 */

import { parseSubmission, pickOffered, SUBMISSIONS_PER_HOUR, type Row } from './logic';

export interface Env {
  readonly DB: D1Database;
  /** O sal do hash do IP. Segredo do worker (`wrangler secret put IP_SALT`). */
  readonly IP_SALT?: string;
}

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS, ...extra },
  });
}

function erro(status: number, why: string): Response {
  return json({ error: why }, status);
}

/** Só o que a fonte é: o release do sistema pf2e no GitHub. Nada mais passa pelo proxy. */
const PROXY: Record<string, { readonly base: string; readonly allow: RegExp }> = {
  'gh-dl': { base: 'https://github.com', allow: /^\/foundryvtt\/pf2e\/releases\/download\// },
  'gh-api': { base: 'https://api.github.com', allow: /^\/repos\/foundryvtt\/pf2e\/releases/ },
};

async function proxy(prefixo: string, resto: string, request: Request): Promise<Response> {
  const regra = PROXY[prefixo];
  if (!regra?.allow.test(resto)) return erro(404, 'fora do proxy');
  const upstream = await fetch(regra.base + resto, {
    headers: { 'User-Agent': 'brfinder2e-central', Accept: request.headers.get('Accept') ?? '*/*' },
    redirect: 'follow',
  });
  const headers = new Headers(CORS);
  for (const nome of ['Content-Type', 'Content-Length', 'ETag', 'Last-Modified']) {
    const valor = upstream.headers.get(nome);
    if (valor !== null) headers.set(nome, valor);
  }
  return new Response(upstream.body, { status: upstream.status, headers });
}

async function hashIp(request: Request, salt: string): Promise<string> {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'sem-ip';
  const bytes = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest).slice(0, 12)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

const SELECT =
  'SELECT id, entity_key, field, source_hash, html, method, model, sender_id, sender_name, created_at, uses FROM translations';

async function pacote(
  env: Env,
  lang: string,
  type: string,
  since: string | null,
): Promise<Response> {
  const stmt =
    since === null
      ? env.DB.prepare(`${SELECT} WHERE language = ?1 AND entity_type = ?2 AND hidden = 0`).bind(
          lang,
          type,
        )
      : env.DB.prepare(
          `${SELECT} WHERE language = ?1 AND entity_type = ?2 AND hidden = 0 AND created_at > ?3`,
        ).bind(lang, type, since);
  const { results } = await stmt.all<Row>();
  return json({ items: pickOffered(results) });
}

async function candidatas(env: Env, lang: string, type: string, key: string): Promise<Response> {
  const { results } = await env.DB.prepare(
    `${SELECT} WHERE language = ?1 AND entity_type = ?2 AND entity_key = ?3 AND hidden = 0 ORDER BY uses DESC, created_at DESC`,
  )
    .bind(lang, type, key)
    .all<Row>();
  return json({
    items: results.map((r) => ({
      id: r.id,
      field: r.field,
      sourceHash: r.source_hash,
      html: r.html,
      method: r.method,
      model: r.model,
      senderName: r.sender_name,
      createdAt: r.created_at,
      uses: r.uses,
    })),
  });
}

async function enviar(env: Env, request: Request): Promise<Response> {
  const corpo: unknown = await request.json().catch(() => null);
  const lido = parseSubmission(corpo);
  if (!lido.ok) return erro(400, lido.why);
  const s = lido.value;

  /* O limite por hora, pelo hash do IP: o IP em si nunca é gravado. */
  const ip = await hashIp(request, env.IP_SALT ?? 'sem-sal');
  const agora = new Date();
  const umaHoraAtras = new Date(agora.getTime() - 3_600_000).toISOString();
  const contagem = await env.DB.prepare(
    'SELECT COUNT(*) AS n FROM submissions WHERE ip_hash = ?1 AND at > ?2',
  )
    .bind(ip, umaHoraAtras)
    .first<{ n: number }>();
  if ((contagem?.n ?? 0) >= SUBMISSIONS_PER_HOUR) return erro(429, 'limite por hora');

  const at = agora.toISOString();
  await env.DB.batch([
    env.DB.prepare('INSERT INTO submissions (ip_hash, at) VALUES (?1, ?2)').bind(ip, at),
    env.DB.prepare(
      `INSERT INTO translations (language, entity_type, entity_key, field, source_hash, html, method, model, sender_id, sender_name, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
       ON CONFLICT (language, entity_type, entity_key, field, source_hash, sender_id)
       DO UPDATE SET html = excluded.html, method = excluded.method, model = excluded.model,
                     sender_name = excluded.sender_name, created_at = excluded.created_at, hidden = 0`,
    ).bind(
      s.language,
      s.entityType,
      s.key,
      s.field,
      s.sourceHash,
      s.html,
      s.method,
      s.model,
      s.senderId,
      s.senderName,
      at,
    ),
    /* A varredura do limite: o que tem mais de um dia não conta para nada. */
    env.DB.prepare('DELETE FROM submissions WHERE at < ?1').bind(
      new Date(agora.getTime() - 86_400_000).toISOString(),
    ),
  ]);
  const linha = await env.DB.prepare(
    'SELECT id FROM translations WHERE language = ?1 AND entity_type = ?2 AND entity_key = ?3 AND field = ?4 AND source_hash = ?5 AND sender_id = ?6',
  )
    .bind(s.language, s.entityType, s.key, s.field, s.sourceHash, s.senderId)
    .first<{ id: number }>();
  return json({ id: linha?.id ?? null }, 201);
}

async function remetenteDe(request: Request): Promise<string | null> {
  const corpo: unknown = await request.json().catch(() => null);
  const id =
    typeof corpo === 'object' && corpo !== null ? (corpo as { senderId?: unknown }).senderId : null;
  return typeof id === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(id) ? id : null;
}

async function usar(env: Env, id: number, request: Request): Promise<Response> {
  const senderId = await remetenteDe(request);
  if (senderId === null) return erro(400, 'remetente');
  await env.DB.batch([
    env.DB.prepare('INSERT OR IGNORE INTO uses (translation_id, sender_id) VALUES (?1, ?2)').bind(
      id,
      senderId,
    ),
    env.DB.prepare(
      'UPDATE translations SET uses = (SELECT COUNT(*) FROM uses WHERE translation_id = ?1) WHERE id = ?1',
    ).bind(id),
  ]);
  const linha = await env.DB.prepare('SELECT uses FROM translations WHERE id = ?1')
    .bind(id)
    .first<{ uses: number }>();
  return json({ uses: linha?.uses ?? 0 });
}

async function esconder(env: Env, id: number, request: Request): Promise<Response> {
  const senderId = await remetenteDe(request);
  if (senderId === null) return erro(400, 'remetente');
  const r = await env.DB.prepare(
    'UPDATE translations SET hidden = 1 WHERE id = ?1 AND sender_id = ?2',
  )
    .bind(id, senderId)
    .run();
  return json({ hidden: r.meta.changes > 0 });
}

async function stats(env: Env, lang: string): Promise<Response> {
  const { results } = await env.DB.prepare(
    'SELECT entity_type AS type, COUNT(DISTINCT entity_key) AS entries, COUNT(*) AS rows FROM translations WHERE language = ?1 AND hidden = 0 GROUP BY entity_type',
  )
    .bind(lang)
    .all<{ type: string; entries: number; rows: number }>();
  return json({ types: results });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const url = new URL(request.url);
    const partes = url.pathname.split('/').filter((p) => p !== '');
    const [raiz, ...resto] = partes;

    if (raiz === 'gh-dl' || raiz === 'gh-api') {
      if (request.method !== 'GET') return erro(405, 'só GET');
      return proxy(raiz, `/${resto.map(decodeURIComponent).join('/')}${url.search}`, request);
    }
    if (raiz !== 'v1') return erro(404, 'não há');

    const [recurso, a, b, c] = resto;
    try {
      if (recurso === 'health') return json({ ok: true });
      if (recurso === 'stats' && a !== undefined && request.method === 'GET') {
        return await stats(env, a);
      }
      if (recurso === 'translations') {
        if (request.method === 'GET' && a !== undefined && b !== undefined) {
          return c === undefined
            ? await pacote(env, a, b, url.searchParams.get('since'))
            : await candidatas(env, a, b, decodeURIComponent(c));
        }
        if (request.method === 'POST' && a === undefined) return await enviar(env, request);
        if (a !== undefined && /^\d+$/.test(a)) {
          const id = Number(a);
          if (request.method === 'POST' && b === 'use') return await usar(env, id, request);
          if (request.method === 'DELETE' && b === undefined) {
            return await esconder(env, id, request);
          }
        }
      }
      return erro(404, 'não há');
    } catch (causa) {
      return erro(500, causa instanceof Error ? causa.message : 'erro');
    }
  },
};
