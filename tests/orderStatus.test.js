const test = require('node:test');
const assert = require('node:assert');
const { canTransition } = require('../src/domain/orderStatus');

test('alur normal: PENDING -> DIPROSES -> SIAP -> SELESAI diizinkan', () => {
  assert.ok(canTransition('PENDING', 'DIPROSES'));
  assert.ok(canTransition('DIPROSES', 'SIAP'));
  assert.ok(canTransition('SIAP', 'SELESAI'));
});

test('lompatan status ditolak (PENDING -> SIAP, PENDING -> SELESAI, DIPROSES -> SELESAI)', () => {
  assert.strictEqual(canTransition('PENDING', 'SIAP'), false);
  assert.strictEqual(canTransition('PENDING', 'SELESAI'), false);
  assert.strictEqual(canTransition('DIPROSES', 'SELESAI'), false);
});

test('PENDING boleh DIBATALKAN, tetapi DIPROSES dan SIAP tidak', () => {
  assert.ok(canTransition('PENDING', 'DIBATALKAN'));
  assert.strictEqual(canTransition('DIPROSES', 'DIBATALKAN'), false);
  assert.strictEqual(canTransition('SIAP', 'DIBATALKAN'), false);
});

test('status akhir (SELESAI, DIBATALKAN) tidak bisa berpindah lagi', () => {
  assert.strictEqual(canTransition('SELESAI', 'PENDING'), false);
  assert.strictEqual(canTransition('DIBATALKAN', 'PENDING'), false);
});

test('mundur ke status sebelumnya ditolak', () => {
  assert.strictEqual(canTransition('SIAP', 'DIPROSES'), false);
  assert.strictEqual(canTransition('DIPROSES', 'PENDING'), false);
});
