-- A central de traduções (Etapa 54). Rode uma vez: `npx wrangler d1 execute brfinder2e --remote --file=schema.sql`.

CREATE TABLE IF NOT EXISTS translations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  language TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_key TEXT NOT NULL,
  field TEXT NOT NULL,
  -- a impressão digital do ORIGINAL: só se oferece o que casa com o texto de hoje
  source_hash TEXT NOT NULL,
  html TEXT NOT NULL,
  method TEXT NOT NULL,
  model TEXT,
  -- um id anônimo por aparelho, e o apelido que a pessoa escolheu (opcional)
  sender_id TEXT NOT NULL,
  sender_name TEXT,
  created_at TEXT NOT NULL,
  uses INTEGER NOT NULL DEFAULT 0,
  hidden INTEGER NOT NULL DEFAULT 0,
  UNIQUE (language, entity_type, entity_key, field, source_hash, sender_id)
);

CREATE INDEX IF NOT EXISTS translations_lookup
  ON translations (language, entity_type, entity_key, field);
CREATE INDEX IF NOT EXISTS translations_bundle
  ON translations (language, entity_type, hidden, created_at);

-- O USO É O VOTO (Etapa 56): uma pessoa, um voto por entrada e campo — a candidata que
-- está no aparelho dela. Passar para outra move o voto; apagar a compartilhada tira.
CREATE TABLE IF NOT EXISTS uses (
  language TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_key TEXT NOT NULL,
  field TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  translation_id INTEGER NOT NULL,
  at TEXT NOT NULL,
  PRIMARY KEY (language, entity_type, entity_key, field, sender_id)
);
CREATE INDEX IF NOT EXISTS uses_por_traducao ON uses (translation_id);

-- O limite por hora: só o hash do IP com sal, nunca o IP. Varrido a cada envio.
CREATE TABLE IF NOT EXISTS submissions (
  ip_hash TEXT NOT NULL,
  at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS submissions_janela ON submissions (ip_hash, at);
