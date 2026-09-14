# Nawasara Agent — Visi & Posisi Strategis

## Latar Belakang

Kominfo Ponorogo mengelola puluhan VM yang menjalankan website dan aplikasi
pemerintah. Serangan dari luar — vulnerability scan, SQL injection, brute force,
webshell upload — terjadi setiap hari.

Saat ini digunakan **Imunify360** sebagai pelindung, namun:
- Biaya langganan tidak dapat dipertahankan tahun depan
- Closed source, vendor lock-in
- Tidak terintegrasi dengan ekosistem Nawasara

**Nawasara Agent hadir sebagai penggantinya** — self-hosted, open, terintegrasi
penuh dengan Nawasara Dashboard.

---

## Inspirasi

| Produk | Yang Diambil | Yang Ditinggalkan |
|---|---|---|
| **Imunify360** | Fokus web server, file scanner, tidak kirim raw log | Biaya mahal, closed source, auto-action tanpa approval |
| **Wazuh** | Baca banyak sumber data (SSH, system, app log) | Volume log terlalu besar, butuh ELK stack berat |

**DNA Nawasara Agent:**
> Fokus web server seperti Imunify, sumber data luas seperti Wazuh,
> tapi semua keputusan action tetap di tangan admin.

---

## Visi

> Nawasara Agent menjadi **standar keamanan** setiap VM pemerintah daerah —
> satu binary, pasang sekali, pantau selamanya.

---

## Misi

1. Deteksi insiden keamanan realtime dari dalam VM
2. Laporkan ke Dashboard dengan format terstruktur (bukan raw log)
3. Menjadi pengganti Imunify360 yang gratis dan terintegrasi
4. Menjadi cikal bakal sistem security ekosistem Nawasara

---

## Posisi dalam Ekosistem Nawasara

```
Nawasara Dashboard
│
├── nawasara-proxmox      monitor VM infrastructure  (dari luar)
├── nawasara-cctv         monitor kamera             (dari luar)
├── nawasara-database     monitor database           (dari luar)
├── nawasara-uptime       monitor uptime HTTP        (dari luar)
├── nawasara-secscan      tampilkan hasil Agent      (dari luar)
│
└── nawasara-agent ───────────────────────────────── (dari DALAM VM)
        │
        ├── dipasang di setiap VM pelanggan
        ├── baca log, scan file, pantau proses
        └── push incident ke Dashboard via HTTP
```

Semua package Nawasara lain memantau **dari luar VM**.
Nawasara Agent satu-satunya yang beroperasi **dari dalam** — ini yang membuatnya
tidak tergantikan oleh monitoring eksternal apapun.

---

## Prinsip Desain

### 1. Ringan di atas segalanya
Agent harus bisa jalan di VM dengan 1 vCPU / 512MB RAM tanpa terasa.
Tidak boleh mengkonsumsi lebih dari 2% CPU dan 50MB RAM dalam kondisi normal.

### 2. Tidak kirim raw log
Agent bukan log forwarder. Agent mengirim **incident** — hasil analisa,
bukan data mentah. Bandwidth hemat, Dashboard tidak tenggelam data.

### 3. Action hanya dengan approval
Phase awal: monitor dan laporkan saja.
Phase selanjutnya: action (block IP, restart service) harus di-approve admin
terlebih dahulu dari Dashboard. Agent tidak pernah bertindak sendiri.

### 4. Bisa jalan offline
Jika Dashboard down, agent tetap bekerja. Incident disimpan di SQLite lokal
dan dikirim ulang otomatis saat koneksi kembali. Tidak ada data yang hilang.

### 5. Plugin, bukan monolith
Setiap fitur tambahan adalah plugin — bisa diinstall, diaktifkan, dinonaktifkan,
dan dihapus tanpa mengubah core agent. VM sederhana tidak perlu menanggung
beban plugin yang tidak relevan.
