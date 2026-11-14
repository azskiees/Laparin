const { createPool } = require('./db');

(async () => {
  const pool = createPool();
  const [rows] = await pool.query('SELECT COUNT(*) AS n FROM tenants');
  if (rows[0].n > 0) { console.log('Seeder dilewati: data sudah ada'); await pool.end(); return; }
  const tenants = [
    ['Warung Nusantara', 'Masakan rumahan'],
    ['Kopi Kampus', 'Kopi dan roti'],
    ['Mie Jaya', 'Aneka mie dan bakso'],
  ];
  for (const [name, desc] of tenants) {
    const [r] = await pool.query('INSERT INTO tenants (name, description) VALUES (?, ?)', [name, desc]);
    const menus = {
      'Warung Nusantara': [['Nasi Ayam Goreng', 18000, 30], ['Nasi Rawon', 20000, 25]],
      'Kopi Kampus': [['Kopi Susu', 12000, 50], ['Roti Bakar', 10000, 20]],
      'Mie Jaya': [['Mie Ayam', 15000, 40], ['Bakso Urat', 17000, 35]],
    }[name];
    for (const [mn, price, stock] of menus) {
      await pool.query('INSERT INTO menus (tenant_id, name, price, daily_stock) VALUES (?, ?, ?, ?)', [r.insertId, mn, price, stock]);
    }
  }
  console.log('Seeder selesai');
  await pool.end();
})().catch(e => { console.error(e); process.exit(1); });
