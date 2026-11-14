# Laparin - Pemesanan Makanan Food Court (K04)

**Stack:** Node.js 20 + Express, MySQL 8, Docker, Jenkins
**Anggota:** (isi nama + peran)

## Fitur
- CRUD tenant & menu (harga, stok harian)
- Keranjang & checkout (total dihitung di server)
- Status order: PENDING -> DIPROSES -> SIAP -> SELESAI, atau PENDING -> DIBATALKAN
- Daftar order per tenant (`?status=`), `GET /health`

## Endpoint
| Method | Path | Keterangan |
|---|---|---|
| GET | /health | status app + database |
| GET/POST | /tenants | daftar / buat tenant |
| GET/PUT/DELETE | /tenants/:id | detail / ubah / hapus |
| GET/POST | /tenants/:id/menus | daftar / tambah menu |
| PUT/DELETE | /menus/:id | ubah / hapus menu |
| POST | /carts | buat keranjang `{tenant_id}` |
| GET | /carts/:id | isi keranjang + total |
| POST | /carts/:id/items | `{menu_id, qty}` |
| POST | /carts/:id/checkout | `{customer_name}` -> order |
| GET | /orders/:id | detail order |
| PATCH | /orders/:id/status | `{status}` |
| GET | /tenants/:id/orders | order per tenant |

## Menjalankan lokal
```bash
cp .env.example .env     # isi nilainya
npm install && npm test  # 15 test otomatis
```
Setelah image ada di Docker Hub:
```bash
docker compose up -d db
docker compose run --rm app node src/migrate.js
docker compose run --rm app node src/seed.js
docker compose up -d
curl localhost:8000/health
```
