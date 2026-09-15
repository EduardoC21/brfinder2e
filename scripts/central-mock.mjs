/**
 * A CENTRAL DE MENTIRA (Etapa 55): um servidor Node em memória com o MESMO contrato do
 * worker (`server/src/index.ts`), para testar o cliente do app sem subir nada na
 * Cloudflare. Não é o servidor de verdade — a validação é a mesma só no essencial (as
 * marcas), e nada persiste ao fechar.
 *
 *   node scripts/central-mock.mjs        (porta 8787)
 */

import { createServer } from 'node:http';

const rows = [];
let proximoId = 1;
/* O uso é o voto (56): por entrada/campo/aparelho → id da candidata. */
const votos = new Map();
const recontar = () => {
  for (const r of rows) r.uses = [...votos.values()].filter((v) => v === r.id).length;
};

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const json = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...cors });
  res.end(JSON.stringify(body));
};
const lerCorpo = (req) =>
  new Promise((resolve) => {
    let dados = '';
    req.on('data', (c) => (dados += c));
    req.on('end', () => {
      try {
        resolve(JSON.parse(dados || 'null'));
      } catch {
        resolve(null);
      }
    });
  });
const melhor = (a, b) => b.uses - a.uses || b.createdAt.localeCompare(a.createdAt);

createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors);
    return res.end();
  }
  const url = new URL(req.url, 'http://x');
  const p = url.pathname.split('/').filter(Boolean);
  if (p[0] !== 'v1') return json(res, 404, { error: 'não há' });
  const [, recurso, a, b, c] = p;
  if (recurso === 'health') return json(res, 200, { ok: true });
  if (recurso === 'stats') {
    const tipos = {};
    for (const r of rows.filter((r) => r.language === a && !r.hidden)) {
      (tipos[r.entityType] ??= new Set()).add(r.key);
    }
    return json(res, 200, {
      types: Object.entries(tipos).map(([type, s]) => ({ type, entries: s.size })),
    });
  }
  if (recurso === 'uses' && req.method === 'POST') {
    const corpo = await lerCorpo(req);
    let n = 0;
    for (const id of corpo?.ids ?? []) {
      const r = rows.find((x) => x.id === id);
      if (!r) continue;
      votos.set(`${r.language}|${r.entityType}|${r.key}|${r.field}|${corpo.senderId}`, r.id);
      n++;
    }
    recontar();
    console.log('votos em lote', n);
    return json(res, 200, { voted: n });
  }
  if (recurso !== 'translations') return json(res, 404, { error: 'não há' });
  if (req.method === 'GET' && a && b && !c) {
    const grupos = new Map();
    for (const r of rows.filter((r) => r.language === a && r.entityType === b && !r.hidden)) {
      const chave = `${r.key}|${r.field}|${r.sourceHash}`;
      (grupos.get(chave) ?? grupos.set(chave, []).get(chave)).push(r);
    }
    const items = [...grupos.values()].map((g) => {
      const m = [...g].sort(melhor)[0];
      return {
        id: m.id,
        key: m.key,
        field: m.field,
        sourceHash: m.sourceHash,
        html: m.html,
        method: m.method,
        model: m.model,
        senderName: m.senderName,
        createdAt: m.createdAt,
        uses: m.uses,
        candidates: g.length,
      };
    });
    return json(res, 200, { items });
  }
  if (req.method === 'GET' && a && b && c) {
    const key = decodeURIComponent(c);
    return json(res, 200, {
      items: rows.filter(
        (r) => r.language === a && r.entityType === b && r.key === key && !r.hidden,
      ),
    });
  }
  if (req.method === 'POST' && !a) {
    const s = await lerCorpo(req);
    if (!s || typeof s.html !== 'string' || !Array.isArray(s.marks))
      return json(res, 400, { error: 'corpo' });
    for (const m of s.marks)
      if (!s.html.includes(m)) return json(res, 400, { error: `marca perdida: ${m}` });
    const existente = rows.find(
      (r) =>
        r.language === s.language &&
        r.entityType === s.entityType &&
        r.key === s.key &&
        r.field === s.field &&
        r.sourceHash === s.sourceHash &&
        r.senderId === s.senderId,
    );
    const createdAt = new Date().toISOString();
    if (existente)
      Object.assign(existente, {
        html: s.html,
        method: s.method,
        model: s.model ?? null,
        senderName: s.senderName ?? null,
        createdAt,
        hidden: false,
      });
    else
      rows.push({
        id: proximoId++,
        ...s,
        model: s.model ?? null,
        senderName: s.senderName ?? null,
        createdAt,
        uses: 0,
        hidden: false,
      });
    console.log('envio', s.entityType, s.field, s.key.slice(-8), 'por', s.senderName ?? s.senderId);
    return json(res, 201, { id: (existente ?? rows[rows.length - 1]).id });
  }
  if (a && /^\d+$/.test(a)) {
    const r = rows.find((x) => x.id === Number(a));
    const corpo = await lerCorpo(req);
    if (!r) return json(res, 404, { error: 'não há' });
    if (req.method === 'POST' && b === 'use') {
      votos.set(`${r.language}|${r.entityType}|${r.key}|${r.field}|${corpo?.senderId}`, r.id);
      recontar();
      console.log('voto', a, '→', r.uses);
      return json(res, 200, { uses: r.uses });
    }
    if (req.method === 'DELETE' && b === 'use') {
      votos.delete(`${r.language}|${r.entityType}|${r.key}|${r.field}|${corpo?.senderId}`);
      recontar();
      console.log('desvoto', a, '→', r.uses);
      return json(res, 200, { ok: true });
    }
    if (req.method === 'DELETE') {
      if (r.senderId === corpo?.senderId) r.hidden = true;
      return json(res, 200, { hidden: r.hidden });
    }
  }
  return json(res, 404, { error: 'não há' });
}).listen(8787, () => console.log('central de mentira em http://localhost:8787'));
