import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
});

export async function query(text, params) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

export async function initDb() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id         SERIAL PRIMARY KEY,
      name       TEXT NOT NULL,
      email      TEXT UNIQUE NOT NULL,
      password   TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id         TEXT PRIMARY KEY,
      user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS research_items (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
      type       TEXT NOT NULL CHECK (type IN ('investigate','build','compare')),
      title      TEXT NOT NULL,
      topic      TEXT,
      region     TEXT,
      country_a  TEXT,
      country_b  TEXT,
      payload    JSONB NOT NULL,
      saved      BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
      messages   JSONB NOT NULL DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  // OAuth support — safe to run multiple times
  await query(`ALTER TABLE users ALTER COLUMN password DROP NOT NULL`).catch(() => {});
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider TEXT`).catch(() => {});
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_id TEXT`).catch(() => {});
  console.log("[DB] Tables ready");
}
