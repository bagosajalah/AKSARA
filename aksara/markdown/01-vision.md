# Aksara Multi-Tenant Platform — Visi & Posisi Strategis

## Latar Belakang

Pemerintah Daerah mengelola puluhan instansi, dinas, dan fasilitas layanan publik (seperti RSUD dan Puskesmas). Setiap hari, warga membutuhkan informasi yang cepat dan akurat terkait jadwal layanan, syarat pendaftaran, hingga dokumen birokrasi. 

Saat ini, solusi pelayanan informasi digital yang ada menghadapi beberapa masalah:
- **Fragmentasi Tinggi:** Tiap dinas membangun aplikasi atau *chatbot* sendiri-sendiri dengan standar yang berbeda.
- **Biaya Mahal & Vendor Lock-in:** Menggunakan layanan pihak ketiga (seperti Zendesk atau Intercom) memakan biaya langganan yang tidak efisien jika dikalikan puluhan dinas.
- **Keterbatasan SDM:** Admin dinas kewalahan membalas pesan repetitif dari warga di luar jam kerja.

**Asisten Aksara hadir sebagai solusinya** — platform *chatbot* AI yang mandiri (self-hosted), berbasis *multi-tenant*, dan tersentralisasi dalam satu ekosistem.

---

## Inspirasi

| Produk / Platform | Yang Diambil | Yang Ditinggalkan |
|---|---|---|
| **ChatGPT / Gemini** | Kecerdasan analitik, UI/UX *sidebar* dua kolom yang familiar | Konteks informasi yang terlalu umum (sering halusinasi) |
| **Intercom / Zendesk** | Manajemen *widget* yang mudah diintegrasikan ke *website* | Biaya langganan mahal per agen, data tersimpan di luar negeri |
| **Chatbot Rule-Based** | Kemampuan membalas instan via *Quick Replies* (FAQ) | Interaksi kaku dan tidak bisa memahami bahasa natural warga |

**DNA Platform Aksara:**
> Cerdas merespon seperti AI modern, mudah dikelola seperti platform SaaS kelas dunia, namun kontrol dan data tetap 100% berada di tangan Pemerintah Daerah melalui Super Admin.

---

## Visi

> Aksara menjadi **standar layanan komunikasi publik** untuk setiap titik instansi daerah — satu platform sentral, pasang *widget* sekali, layani warga 24/7 selamanya.

---

## Misi

1. Memberikan respon informasi publik yang instan, akurat, dan ramah kepada warga melalui AI.
2. Mengeliminasi fragmentasi sistem IT dengan menyediakan manajemen *multi-tenant* dari satu pintu.
3. Menyediakan visibilitas total bagi pengambil kebijakan (Super Admin) melalui analitik terpusat.
4. Melindungi sistem dari interaksi *spam/bot* melalui mekanisme wajib identifikasi (*Google SSO*).

---

## Posisi dalam Ekosistem Layanan Daerah

Struktur ekosistem Aksara dibangun dengan hierarki yang terpusat dan terisolasi secara rapi: Pendaftaran sebuah **Dinas** oleh Super Admin akan secara otomatis membuatkan akun **Admin Dinas** tersebut. Admin Dinas kemudian dapat mengelola berbagai **Tenant** (Sistem/Website) yang berada di bawah naungannya.

```text
Platform Aksara (Super Admin)
│
├── Dinas Kesehatan (Dikelola oleh Admin Dinkes)
│   ├── Tenant: RSUD Ponorogo
│   └── Tenant: Puskesmas Utara
│
├── Dinas Komunikasi dan Informatika (Dikelola oleh Admin Diskominfo)
│   ├── Tenant: Portal ASN Ponorogo (asn.ponorogo.go.id)
│   ├── Tenant: PPID Utama (ppid.ponorogo.go.id)
│   ├── Tenant: Satu Data Ponorogo (satudata.ponorogo.go.id)
│   ├── Tenant: E-Kinerja Ponorogo (ekinerja.ponorogo.go.id)
│   ├── Tenant: Layanan Pengadaan (lpse.ponorogo.go.id)
│   ├── Tenant: Portal Utama (ponorogo.go.id)
│   └── Tenant: Lapor Ponorogo (lapor.ponorogo.go.id)
│
└── Aksara Widget ──────────────────────────────── (Menempel di Website Publik)
        │
        ├── dipasang di masing-masing domain Tenant di atas
        ├── interaksi langsung dengan warga (End-User)
        ├── wajibkan login Google SSO untuk warga
        └── sediakan jawaban dari model AI & FAQ Quick Replies

Banyak layanan pemerintah mengharuskan warga mengunduh aplikasi baru yang berat. Aksara Widget mengambil pendekatan berbeda — ia beroperasi secara *omnipresent* (selalu ada) dengan menempel langsung di *website-website* yang sudah diakses warga setiap hari.

```

---

## Prinsip Desain

### 1. Multi-Tenant by Design
Platform ini dirancang sejak hari pertama untuk melayani banyak instansi. Data, konfigurasi tema, dan riwayat obrolan Dinas A (misal: RSUD) terisolasi sepenuhnya dan tidak akan bocor ke Dinas B.

### 2. Sentralisasi Kontrol (Super Admin)
Kebebasan diberikan kepada Admin Tenant, tetapi kontrol mutlak ada di tangan Super Admin. Super Admin memiliki wewenang *kill-switch* untuk menonaktifkan (*suspend*) status operasional dinas mana pun kapan saja.

### 3. Widget Ringan & Adaptif
*Widget* Aksara di sisi publik tidak boleh merusak tata letak *website* utama. Antarmuka dirancang dengan *max-height* dinamis agar tidak menabrak *header* navigasi, dan mendukung transisi mulus dari ukuran kecil, *expanded*, hingga mode layar penuh (*standalone*).

### 4. Familiar UI/UX untuk Warga
Warga tidak perlu belajar cara menggunakan Aksara. Dengan mengadopsi gaya percakapan AI populer (mode *fullscreen* bergaya Gemini/ChatGPT lengkap dengan *sidebar* riwayat obrolan), interaksi terasa natural dan profesional.

### 5. Kualitas Data (Anti-Spam)
Aksara bukanlah kotak saran anonim. Fitur *Pre-Chat Form* (wajib Google SSO) diberlakukan untuk memastikan setiap interaksi dapat dipertanggungjawabkan, sekaligus membantu instansi membangun basis data (*lead*) warga untuk pelayanan yang lebih personal di masa depan.