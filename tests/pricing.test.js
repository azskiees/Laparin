const test = require('node:test');
const assert = require('node:assert');
const { calculateTotal } = require('../src/domain/pricing');

test('total = jumlah (harga x qty) dari semua item', () => {
  assert.strictEqual(calculateTotal([{ price: 18000, qty: 2 }, { price: 12000, qty: 1 }]), 48000);
});

test('qty nol atau negatif ditolak', () => {
  assert.throws(() => calculateTotal([{ price: 10000, qty: 0 }]));
  assert.throws(() => calculateTotal([{ price: 10000, qty: -1 }]));
});

test('keranjang kosong ditolak', () => {
  assert.throws(() => calculateTotal([]));
});

test('total dihitung dari harga server, field total dari klien diabaikan', () => {
  const dariDb = [{ price: 15000, qty: 2, total: 1 }]; // klien mencoba curang
  assert.strictEqual(calculateTotal(dariDb), 30000);
});
