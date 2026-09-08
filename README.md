# Dashboard-temon

Dashboard status publik ringan untuk memantau apakah layanan 9Router sedang online atau offline. Dashboard menampilkan HTTP status, latency, dan waktu pengecekan terakhir, lalu memperbarui status otomatis setiap 5 detik.

## Requirements

- Node.js 18 atau lebih baru
- 9Router atau layanan HTTP lain yang ingin dipantau

## Menjalankan

```bash
node app.js
```

Default configuration:

- Dashboard: `0.0.0.0:20128`
- Target router: `http://127.0.0.1:20130/`

Konfigurasi dapat diubah lewat environment variable:

```bash
HOST=0.0.0.0 PORT=8080 ROUTER_URL=http://127.0.0.1:20128/ node app.js
```

Buka `http://IP-SERVER:20128` dari browser.

## Menjalankan dengan systemd

```bash
sudo mkdir -p /opt/9router-status
sudo install -m 0644 app.js /opt/9router-status/app.js
sudo install -m 0644 systemd/9router-status.service /etc/systemd/system/9router-status.service
sudo systemctl daemon-reload
sudo systemctl enable --now 9router-status.service
```

Untuk menyesuaikan port atau URL target, tambahkan `Environment=PORT=...` dan `Environment=ROUTER_URL=...` di bagian `[Service]`.

## API

`GET /api/status` menghasilkan respons seperti:

```json
{
  "online": true,
  "httpStatus": 307,
  "latencyMs": 6,
  "checkedAt": "2026-09-08T12:57:09.200Z"
}
```

## License

MIT
