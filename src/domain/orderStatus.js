// Aturan bisnis: status order hanya boleh berpindah berurutan.
// PENDING -> DIPROSES -> SIAP -> SELESAI, atau PENDING -> DIBATALKAN
const STATUSES = ['PENDING', 'DIPROSES', 'SIAP', 'SELESAI', 'DIBATALKAN'];

const TRANSITIONS = {
  PENDING: ['DIPROSES', 'DIBATALKAN'],
  DIPROSES: ['SIAP'],
  SIAP: ['SELESAI'],
  SELESAI: [],
  DIBATALKAN: [],
};

function canTransition(from, to) {
  return Array.isArray(TRANSITIONS[from]) && TRANSITIONS[from].includes(to);
}

module.exports = { STATUSES, TRANSITIONS, canTransition };
