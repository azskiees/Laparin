// Aturan bisnis: total harga dihitung di server dari harga menu di database,
// BUKAN dari angka yang dikirim klien.
function calculateTotal(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Item tidak boleh kosong');
  }
  return items.reduce((sum, it) => {
    if (!Number.isInteger(it.qty) || it.qty <= 0) throw new Error('Qty harus bilangan bulat > 0');
    if (!Number.isInteger(it.price) || it.price < 0) throw new Error('Harga tidak valid');
    return sum + it.price * it.qty;
  }, 0);
}

module.exports = { calculateTotal };
