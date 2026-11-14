const test = require('node:test');
const assert = require('node:assert');
const { decreaseStock, StockError } = require('../src/domain/stock');

test('stok berkurang sesuai qty saat checkout', () => {
  assert.strictEqual(decreaseStock(10, 3), 7);
});

test('stok habis tepat menjadi 0 (boleh)', () => {
  assert.strictEqual(decreaseStock(5, 5), 0);
});

test('stok tidak boleh minus', () => {
  assert.throws(() => decreaseStock(2, 3), StockError);
});
