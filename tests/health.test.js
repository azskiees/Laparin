const test = require('node:test');
const assert = require('node:assert');
const { createApp } = require('../src/app');

async function withServer(db, fn) {
  const server = createApp({ db }).listen(0);
  try { await fn(`http://127.0.0.1:${server.address().port}`); }
  finally { server.close(); }
}

test('GET /health -> 200 dan database up', async () => {
  await withServer({ query: async () => [[{ 1: 1 }]] }, async (base) => {
    const res = await fetch(`${base}/health`);
    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(await res.json(), { status: 'ok', database: 'up' });
  });
});

test('GET /health -> 503 jika database mati', async () => {
  await withServer({ query: async () => { throw new Error('down'); } }, async (base) => {
    const res = await fetch(`${base}/health`);
    assert.strictEqual(res.status, 503);
  });
});

test('PATCH status dengan nilai di luar enum -> 422', async () => {
  await withServer({ query: async () => [[]] }, async (base) => {
    const res = await fetch(`${base}/orders/1/status`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'TERBANG' }),
    });
    assert.strictEqual(res.status, 422);
  });
});
