const express = require('express');
const path = require('path');
const { STATUSES, canTransition } = require('./domain/orderStatus');
const { calculateTotal } = require('./domain/pricing');
const { decreaseStock, StockError } = require('./domain/stock');

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const isPosInt = (v) => Number.isInteger(v) && v > 0;

function createApp({ db }) {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'public')));
  const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

  // ---------- Health ----------
  app.get('/health', async (req, res) => {
    try {
      await db.query('SELECT 1');
      res.status(200).json({ status: 'ok', database: 'up' });
    } catch {
      res.status(503).json({ status: 'error', database: 'down' });
    }
  });

  // ---------- Tenant ----------
  app.get('/tenants', wrap(async (req, res) => {
    const [rows] = await db.query('SELECT * FROM tenants ORDER BY id');
    res.json(rows);
  }));

  app.post('/tenants', wrap(async (req, res) => {
    const { name, description = null } = req.body;
    if (!name) throw new HttpError(422, 'name wajib diisi');
    const [r] = await db.query('INSERT INTO tenants (name, description) VALUES (?, ?)', [name, description]);
    res.status(201).json({ id: r.insertId, name, description });
  }));

  app.get('/tenants/:id', wrap(async (req, res) => {
    const [rows] = await db.query('SELECT * FROM tenants WHERE id = ?', [req.params.id]);
    if (!rows.length) throw new HttpError(404, 'Tenant tidak ditemukan');
    res.json(rows[0]);
  }));

  app.put('/tenants/:id', wrap(async (req, res) => {
    const { name, description = null } = req.body;
    if (!name) throw new HttpError(422, 'name wajib diisi');
    const [r] = await db.query('UPDATE tenants SET name = ?, description = ? WHERE id = ?', [name, description, req.params.id]);
    if (!r.affectedRows) throw new HttpError(404, 'Tenant tidak ditemukan');
    res.json({ id: Number(req.params.id), name, description });
  }));

  app.delete('/tenants/:id', wrap(async (req, res) => {
    const [r] = await db.query('DELETE FROM tenants WHERE id = ?', [req.params.id]);
    if (!r.affectedRows) throw new HttpError(404, 'Tenant tidak ditemukan');
    res.status(204).end();
  }));

  // ---------- Menu ----------
  app.get('/tenants/:id/menus', wrap(async (req, res) => {
    const [rows] = await db.query('SELECT * FROM menus WHERE tenant_id = ? ORDER BY id', [req.params.id]);
    res.json(rows);
  }));

  app.post('/tenants/:id/menus', wrap(async (req, res) => {
    const { name, price, daily_stock = 0 } = req.body;
    if (!name || !Number.isInteger(price) || price < 0 || !Number.isInteger(daily_stock) || daily_stock < 0) {
      throw new HttpError(422, 'name, price (>=0), daily_stock (>=0) tidak valid');
    }
    const [t] = await db.query('SELECT id FROM tenants WHERE id = ?', [req.params.id]);
    if (!t.length) throw new HttpError(404, 'Tenant tidak ditemukan');
    const [r] = await db.query('INSERT INTO menus (tenant_id, name, price, daily_stock) VALUES (?, ?, ?, ?)',
      [req.params.id, name, price, daily_stock]);
    res.status(201).json({ id: r.insertId, tenant_id: Number(req.params.id), name, price, daily_stock });
  }));

  app.put('/menus/:id', wrap(async (req, res) => {
    const { name, price, daily_stock } = req.body;
    if (!name || !Number.isInteger(price) || price < 0 || !Number.isInteger(daily_stock) || daily_stock < 0) {
      throw new HttpError(422, 'name, price (>=0), daily_stock (>=0) tidak valid');
    }
    const [r] = await db.query('UPDATE menus SET name = ?, price = ?, daily_stock = ? WHERE id = ?',
      [name, price, daily_stock, req.params.id]);
    if (!r.affectedRows) throw new HttpError(404, 'Menu tidak ditemukan');
    res.json({ id: Number(req.params.id), name, price, daily_stock });
  }));

  app.delete('/menus/:id', wrap(async (req, res) => {
    const [r] = await db.query('DELETE FROM menus WHERE id = ?', [req.params.id]);
    if (!r.affectedRows) throw new HttpError(404, 'Menu tidak ditemukan');
    res.status(204).end();
  }));

  // ---------- Keranjang ----------
  app.post('/carts', wrap(async (req, res) => {
    const { tenant_id } = req.body;
    if (!isPosInt(tenant_id)) throw new HttpError(422, 'tenant_id wajib diisi');
    const [t] = await db.query('SELECT id FROM tenants WHERE id = ?', [tenant_id]);
    if (!t.length) throw new HttpError(404, 'Tenant tidak ditemukan');
    const [r] = await db.query('INSERT INTO carts (tenant_id) VALUES (?)', [tenant_id]);
    res.status(201).json({ id: r.insertId, tenant_id });
  }));

  async function loadCart(id) {
    const [carts] = await db.query('SELECT * FROM carts WHERE id = ?', [id]);
    if (!carts.length) throw new HttpError(404, 'Keranjang tidak ditemukan');
    const [items] = await db.query(
      `SELECT ci.menu_id, m.name, m.price, ci.qty
         FROM cart_items ci JOIN menus m ON m.id = ci.menu_id
        WHERE ci.cart_id = ? ORDER BY ci.menu_id`, [id]);
    const total = items.length ? calculateTotal(items) : 0; // total dihitung server
    return { ...carts[0], items, total };
  }

  app.get('/carts/:id', wrap(async (req, res) => res.json(await loadCart(req.params.id))));

  app.post('/carts/:id/items', wrap(async (req, res) => {
    const { menu_id, qty } = req.body; // harga TIDAK diterima dari klien
    if (!isPosInt(menu_id) || !isPosInt(qty)) throw new HttpError(422, 'menu_id dan qty harus bilangan bulat > 0');
    const cart = await loadCart(req.params.id);
    const [m] = await db.query('SELECT id FROM menus WHERE id = ? AND tenant_id = ?', [menu_id, cart.tenant_id]);
    if (!m.length) throw new HttpError(422, 'Menu tidak ada di tenant keranjang ini');
    await db.query(
      `INSERT INTO cart_items (cart_id, menu_id, qty) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE qty = qty + VALUES(qty)`, [req.params.id, menu_id, qty]);
    res.status(201).json(await loadCart(req.params.id));
  }));

  // ---------- Checkout ----------
  app.post('/carts/:id/checkout', wrap(async (req, res) => {
    const { customer_name } = req.body;
    if (!customer_name) throw new HttpError(422, 'customer_name wajib diisi');
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const [carts] = await conn.query('SELECT * FROM carts WHERE id = ? FOR UPDATE', [req.params.id]);
      if (!carts.length) throw new HttpError(404, 'Keranjang tidak ditemukan');
      const [items] = await conn.query(
        `SELECT ci.menu_id, m.name, m.price, m.daily_stock, ci.qty
           FROM cart_items ci JOIN menus m ON m.id = ci.menu_id
          WHERE ci.cart_id = ? ORDER BY ci.menu_id FOR UPDATE`, [req.params.id]);
      if (!items.length) throw new HttpError(422, 'Keranjang kosong');

      for (const it of items) {
        try { decreaseStock(it.daily_stock, it.qty); } // validasi stok tidak boleh minus
        catch (e) { throw new HttpError(409, `${it.name}: ${e.message}`); }
        const [u] = await conn.query(
          'UPDATE menus SET daily_stock = daily_stock - ? WHERE id = ? AND daily_stock >= ?',
          [it.qty, it.menu_id, it.qty]);
        if (!u.affectedRows) throw new HttpError(409, `${it.name}: Stok tidak mencukupi`);
      }
      const total = calculateTotal(items);
      const [o] = await conn.query(
        'INSERT INTO orders (tenant_id, customer_name, status, total) VALUES (?, ?, ?, ?)',
        [carts[0].tenant_id, customer_name, 'PENDING', total]);
      for (const it of items) {
        await conn.query('INSERT INTO order_items (order_id, menu_id, name, price, qty) VALUES (?, ?, ?, ?, ?)',
          [o.insertId, it.menu_id, it.name, it.price, it.qty]);
      }
      await conn.query('DELETE FROM cart_items WHERE cart_id = ?', [req.params.id]);
      await conn.commit();
      res.status(201).json({ id: o.insertId, status: 'PENDING', total, customer_name });
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }));

  // ---------- Order ----------
  app.get('/orders/:id', wrap(async (req, res) => {
    const [o] = await db.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!o.length) throw new HttpError(404, 'Order tidak ditemukan');
    const [items] = await db.query('SELECT menu_id, name, price, qty FROM order_items WHERE order_id = ?', [req.params.id]);
    res.json({ ...o[0], items });
  }));

  app.get('/tenants/:id/orders', wrap(async (req, res) => {
    const { status } = req.query;
    if (status && !STATUSES.includes(status)) throw new HttpError(422, 'status tidak valid');
    const [rows] = status
      ? await db.query('SELECT * FROM orders WHERE tenant_id = ? AND status = ? ORDER BY id DESC', [req.params.id, status])
      : await db.query('SELECT * FROM orders WHERE tenant_id = ? ORDER BY id DESC', [req.params.id]);
    res.json(rows);
  }));

  app.patch('/orders/:id/status', wrap(async (req, res) => {
    const { status } = req.body;
    if (!STATUSES.includes(status)) throw new HttpError(422, 'status tidak valid');
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const [o] = await conn.query('SELECT * FROM orders WHERE id = ? FOR UPDATE', [req.params.id]);
      if (!o.length) throw new HttpError(404, 'Order tidak ditemukan');
      if (!canTransition(o[0].status, status)) {
        throw new HttpError(422, `Perpindahan status ${o[0].status} -> ${status} tidak diizinkan`);
      }
      if (status === 'DIBATALKAN') { // stok dikembalikan saat order dibatalkan
        await conn.query(
          `UPDATE menus m JOIN order_items oi ON oi.menu_id = m.id
              SET m.daily_stock = m.daily_stock + oi.qty WHERE oi.order_id = ?`, [req.params.id]);
      }
      await conn.query('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
      await conn.commit();
      res.json({ id: Number(req.params.id), status });
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }));

  // ---------- Error handler ----------
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    if (err instanceof StockError) return res.status(409).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  });

  return app;
}

module.exports = { createApp };
