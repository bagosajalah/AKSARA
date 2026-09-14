# Nawasara Agent — Roadmap

## Overview Timeline

```
Phase 1 ──── Phase 2 ──── Phase 3 ──── Phase 4
Monitor       Action        File          AI-Ready
& Report      Approval      Scanner       (Future)

3 bulan       3 bulan       6 bulan       TBD
```

---

## Phase 1 — Monitor & Report (MVP)

**Tujuan:** Agent bisa dipasang, baca log, dan kirim incident ke Dashboard.
Tidak ada action sama sekali — hanya laporan.

### Yang Dibangun

**Sisi Agent (Go binary):**
- [ ] Auto-deteksi OS (Ubuntu/Debian/CentOS/RHEL/AlmaLinux)
- [ ] Auto-deteksi web server (Nginx/Apache) dan path log-nya
- [ ] Collector: baca Nginx/Apache access log realtime
- [ ] Collector: baca SSH auth log (`/var/log/auth.log` / `/var/log/secure`)
- [ ] Analyzer: rule engine berbasis signature (pattern matching)
- [ ] Deteksi 10 pola serangan dasar (lihat daftar di bawah)
- [ ] Reporter: push incident via HTTP POST + API key
- [ ] Reporter: antrian SQLite lokal jika Dashboard down
- [ ] Install script: `curl | bash`, deteksi OS otomatis
- [ ] Systemd service: auto-start, auto-restart
- [ ] Health ping: kirim heartbeat ke Dashboard setiap 1 menit

**Sisi Dashboard (nawasara-secscan):**
- [ ] API endpoint: `POST /api/agent/incidents` (terima laporan)
- [ ] API endpoint: `GET /api/agent/heartbeat` (terima ping)
- [ ] Agent management: daftar agent, status online/offline
- [ ] Findings table: tabel semua incident, filter severity/type/IP
- [ ] IP detail: semua incident dari satu IP dalam timeline

### Deteksi Serangan Phase 1

| # | Nama | Trigger | Severity |
|---|---|---|---|
| 1 | Vulnerability Scan | Request ke `.env`, `.git`, `wp-admin`, `phpinfo` | High |
| 2 | Directory Traversal | `../` di URL path | Critical |
| 3 | SQL Injection (URL) | `UNION SELECT`, `OR 1=1`, `DROP TABLE` di query string | Critical |
| 4 | XSS Probe | `<script>`, `javascript:` di query string | Medium |
| 5 | Brute Force Login | 10+ POST `/login` dalam 60 detik dari 1 IP | High |
| 6 | Scanner Bot | User-Agent mengandung `sqlmap`, `nikto`, `nmap`, `masscan` | High |
| 7 | PHP Webshell Upload | POST ke path yang mengandung `.php` di direktori upload | Critical |
| 8 | SSH Brute Force | 10+ failed SSH login dalam 5 menit dari 1 IP | High |
| 9 | SSH Root Login | Login SSH berhasil sebagai root | Critical |
| 10 | HTTP 4xx Storm | 50+ error 4xx dari 1 IP dalam 30 detik | Medium |

### Deliverable Phase 1
- Binary Go untuk Linux amd64 / arm64
- Install script satu baris
- Dashboard menampilkan incident realtime
- Agent terdaftar dan statusnya terpantau

---

## Phase 2 — Action dengan Approval Admin

**Tujuan:** Admin bisa memerintah agent melakukan tindakan dari Dashboard,
tapi setiap action butuh approval eksplisit. Agent tidak pernah bertindak sendiri.

### Yang Dibangun

**Sisi Agent:**
- [ ] Executor module: poll command dari Dashboard setiap 30 detik
- [ ] Command: Block IP (via iptables/nftables)
- [ ] Command: Unblock IP
- [ ] Command: Restart service (nginx, apache, php-fpm, mysql)
- [ ] Command: Reload service
- [ ] Command: `php artisan queue:restart`
- [ ] Command: `php artisan optimize:clear`
- [ ] Audit log eksekusi: setiap command dicatat + hasilnya dikembalikan ke Dashboard
- [ ] Allowlist command: agent hanya mau jalankan command yang ada di allowlist

**Sisi Dashboard:**
- [ ] Action panel di setiap incident: tombol "Block IP", "Restart Service"
- [ ] Approval workflow: action masuk antrian, admin approve/reject
- [ ] Notifikasi: WhatsApp/email saat incident Critical
- [ ] Audit trail: siapa approve apa, kapan, hasilnya apa
- [ ] Sudo gate: action destruktif butuh re-auth admin (via nawasara/auth-primitives)

### Plugin System (mulai Phase 2)
- [ ] Plugin loader: agent bisa load plugin dari folder `/etc/nawasara-agent/plugins/`
- [ ] Plugin: `docker` — monitor container restart/stop/unhealthy
- [ ] Plugin: `laravel` — monitor queue, scheduler, horizon
- [ ] Plugin: `ssl` — monitor expiry SSL certificate
- [ ] Plugin: `cron` — monitor perubahan crontab
- [ ] CLI: `nawasara-agent plugin install docker`
- [ ] CLI: `nawasara-agent plugin remove docker`

---

## Phase 3 — File Scanner & CVE Database

**Tujuan:** Agent bisa mendeteksi file berbahaya di filesystem — webshell, backdoor,
malware PHP — seperti kemampuan utama Imunify360.

### Yang Dibangun

**File Scanner:**
- [ ] Scan direktori web (`/var/www`, `/home/*/public_html`) secara berkala
- [ ] Deteksi webshell PHP (c99, r57, b374k, WSO, dll)
- [ ] Deteksi backdoor pattern (eval+base64, system(), exec(), passthru())
- [ ] Deteksi file baru di direktori publik yang tidak seharusnya ada
- [ ] Monitor perubahan file kritis (`.env`, `composer.json`, `config/app.php`)
- [ ] Hash database: bandingkan file dengan known-good hash (seperti AIDE/Tripwire)

**CVE Signature Database:**
- [ ] Format database: JSON lokal yang bisa di-update tanpa update binary
- [ ] Signature untuk: PHP webshell patterns, exploit kit signatures, malicious UA
- [ ] Update database: pull dari Dashboard saat ada update baru
- [ ] Versioning: setiap VM tahu versi database yang dipakainya
- [ ] Kontribusi: admin bisa tambah custom signature dari Dashboard

**Plugin tambahan Phase 3:**
- [ ] Plugin: `file-integrity` — full AIDE-like file integrity monitoring
- [ ] Plugin: `rootkit-detect` — deteksi hidden process, hidden port
- [ ] Plugin: `mysql-audit` — monitor slow query, failed auth MySQL

---

## Phase 4 — AI-Ready (Future)

**Tujuan:** Siapkan arsitektur agar bisa ditambahkan AI Analyzer di kemudian hari
tanpa mengubah core agent.

### Konsep
- AI hanya **menggantikan atau melengkapi Analyzer** — Collector, Reporter,
  Executor tetap sama
- Analyzer AI bisa jalan di Dashboard (bukan di VM) untuk hemat resource
- Agent kirimi raw events ke Dashboard, Dashboard yang analisa dengan AI
- Fallback ke rule engine jika AI tidak tersedia

### Yang Disiapkan dari Sekarang
- Event schema yang konsisten dan kaya konteks (siap untuk ML training)
- Tagging setiap incident: apakah berasal dari rule engine atau AI
- Feedback loop: admin bisa mark incident sebagai "false positive" atau "confirmed"

---

## Summary Timeline

```
Bulan 1-2   Phase 1 MVP (agent + dashboard dasar)
Bulan 3     Phase 1 polish + install script + multi-tenant
Bulan 4-5   Phase 2 action + approval + plugin system
Bulan 6     Phase 2 polish + notifikasi
Bulan 7-9   Phase 3 file scanner + CVE database
Bulan 10+   Phase 4 AI-ready architecture
```
