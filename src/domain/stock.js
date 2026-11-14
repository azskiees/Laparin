// Aturan bisnis: stok menu berkurang saat checkout dan tidak boleh minus.
class StockError extends Error {}

function decreaseStock(stock, qty) {
  if (!Number.isInteger(qty) || qty <= 0) throw new StockError('Qty harus bilangan bulat > 0');
  if (stock - qty < 0) throw new StockError('Stok tidak mencukupi');
  return stock - qty;
}

module.exports = { decreaseStock, StockError };
