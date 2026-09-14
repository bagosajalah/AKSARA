# Aksara Multi-Tenant Platform — Roadmap

## Overview Timeline

```text
Phase 1 ──── Phase 2 ──── Phase 3 ──── Phase 4
MVP Widget   AI Tuning    Reporting    Live Agent
& Platform   & KB         & Analytics  (Future)

3 bulan      3 bulan      4 bulan      TBD
```
## Phase 1 — Core Platform & MVP Widget (Saat Ini)

**Tujuan:** Membangun fondasi arsitektur *multi-tenant* yang solid untuk Super Admin dan memastikan *widget* publik beroperasi dengan aman serta ramah pengguna.

### Yang Dibangun

**Sisi Super Admin (Back-Office):**
*   [x] Manajemen hierarki otorisasi (Super Admin -> Admin Dinas).
*   [x] CRUD Manajemen Dinas dan Sub-Tenant (RSUD, Puskesmas, Web Dinas).
*   [x] Pencatatan aktivitas terpusat (Audit Logs) untuk melacak rekam jejak mutasi data operasional.
*   [x] Fitur operasional status Kill-Switch (Active/Suspend) per dinas.
*   [x] Desain Dark Mode untuk dashboard Super Admin.

**Sisi Publik (Widget Aksara):**
*   [x] Pre-Chat Form interaktif dengan otentikasi Google SSO (Anti-Spam).
*   [x] Dynamic Layout: Mode Default (kecil), Expanded (setengah layar), dan Standalone (fullscreen).
*   [x] Mode Standalone bergaya Two-Column Sidebar (mirip Gemini/ChatGPT).
*   [x] Manajemen elemen UI statis: Floating button berlogo Aksara yang persisten.
*   [x] Quick Replies (FAQ) untuk panduan instan warga.

### Deliverable Phase 1
*   Repositori platform frontend (React/Vite/Tailwind) dan backend yang terintegrasi.
*   Widget siap tanam (embeddable script) ke website instansi sasaran.

---

## Phase 2 — Knowledge Base & AI Tuning

**Tujuan:** Memberikan "otak" spesifik bagi AI di setiap tenant. AI harus bisa menjawab berdasarkan dokumen resmi instansi tersebut (SOP, Syarat Pendaftaran, dll), bukan dari pengetahuan umum internet.

### Yang Dibangun

**Sisi Admin Dinas (Workspace):**
*   [ ] Modul Manajemen Knowledge Base (KB).
*   [ ] Fitur Upload dokumen (PDF, DOCX) untuk SOP dan pedoman pelayanan.
*   [ ] Fitur sinkronisasi artikel/berita (scraping) otomatis dari domain website tenant.
*   [ ] Manajemen parameter AI (Persona, Tone of Voice, Batasan Topik).

**Sisi Engine (AI & Backend):**
*   [ ] Implementasi Retrieval-Augmented Generation (RAG) menggunakan Vector Database.
*   [ ] Isolasi konteks RAG: Warga di widget RSUD hanya mendapat jawaban dari dokumen RSUD, tidak tercampur dengan data Diskominfo.
*   [ ] Fallback mechanism: AI menjawab "Saya tidak memiliki informasi tersebut" alih-alih berhalusinasi jika data tidak ada di KB.

---

## Phase 3 — Analytics & Reporting

**Tujuan:** Memberikan visibilitas kepada pengambil kebijakan melalui data analitik percakapan dan metrik evaluasi langsung dari warga.

### Yang Dibangun

**Sisi Analitik (Dashboard Super Admin & Dinas):**
*   [ ] Metrik Volume Percakapan harian/mingguan per tenant.
*   [ ] Evaluasi Kepuasan Warga: Mengukur tingkat kepuasan berdasarkan umpan balik interaktif (*thumbs up* / *thumbs down*) yang diberikan warga setelah sesi obrolan dengan AI selesai.
*   [ ] Top FAQ Tracking: Mendeteksi topik apa yang paling sering ditanyakan warga di bulan tersebut.

---

## Phase 4 — Live Agent Handoff (Future)

**Tujuan:** Mengakomodasi kebutuhan penyelesaian masalah (troubleshooting) spesifik atau eskalasi aduan yang tidak bisa diselesaikan oleh mesin.

### Konsep
*   AI bekerja sebagai Tier 1 Support (menyelesaikan 80% pertanyaan repetitif).
*   Jika warga meminta eskalasi (misal mengetik "Bicara dengan admin"), sesi dapat dialihkan ke manusia (Human-in-the-loop).

### Yang Disiapkan
*   **Sisi Warga:** Indikator perubahan sesi dari "Asisten Aksara" menjadi "Admin Instansi (Manusia)".
*   **Sisi Admin:** Live Chat Dashboard untuk admin dinas (layaknya Customer Service) dengan fitur takeover percakapan.
*   Notifikasi *real-time* (via In-App/Email) ke Admin Dinas jika ada permintaan handoff yang masuk.

---

## Summary Timeline

```text
Bulan 1-3   Phase 1 (MVP Widget, Multi-Tenant Base, SSO Auth)
Bulan 4-6   Phase 2 (RAG Integration, Knowledge Base Upload)
Bulan 7-10  Phase 3 (Dashboard Analytics, User Satisfaction Rating)
Bulan 11+   Phase 4 (Live Agent Dashboard & Handoff Routing)