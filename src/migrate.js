// Menjalankan migrasi SQL berurutan. Dipanggil sebagai langkah terpisah di pipeline:
//   docker compose run --rm app node src/migrate.js
const fs = require('fs');
const path = require('path');
const { createPool } = require('./db');

async function waitForDb(pool, tries = 30) {
  for (let i = 0; i < tries; i++) {
    try { await pool.query('SELECT 1'); return; } catch { await new Promise(r => setTimeout(r, 2000)); }
  }
  throw new Error('Database tidak bisa dijangkau');
}

(async () => {
  const pool = createPool();
  await waitForDb(pool);
  await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations (name VARCHAR(255) PRIMARY KEY, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
  const dir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
  for (const f of files) {
    const [rows] = await pool.query('SELECT 1 FROM schema_migrations WHERE name = ?', [f]);
    if (rows.length) { console.log(`skip   ${f}`); continue; }
    await pool.query(fs.readFileSync(path.join(dir, f), 'utf8'));
    await pool.query('INSERT INTO schema_migrations (name) VALUES (?)', [f]);
    console.log(`applied ${f}`);
  }
  await pool.end();
})().catch(e => { console.error(e); process.exit(1); });
