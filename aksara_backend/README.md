# AKSARA Multi-Tenant Backend API (FastAPI)

Backend REST API modern untuk platform **AKSARA** (Sistem Manajemen Multi-Tenant Dinas, Pelayanan Publik, Data Warga, Knowledge Base, & Chatbot Widget).

Dibuat menggunakan **FastAPI**, **SQLAlchemy 2.0 (Async Engine)**, **Pydantic v2**, **PostgreSQL / SQLite**, dan **JWT Authentication** (dengan Role-Based Access Control / RBAC).

---

## 🚀 Fitur Utama

- **Authentication & Security**:
  - JWT Access Token & Refresh Token.
  - Password hashing aman dengan `bcrypt`.
  - Impersonation Mode untuk SuperAdmin dengan *Audit Logging Warning*.
  - Middleware CORS untuk menghubungkan Frontend (Vite / React).

- **Multi-Tenant (Dinas & Sub-domain)**:
  - Pengecekan real-time `kode_dinas` unik (`/api/v1/tenants/check-kode?kode=dinkes`) yang sesuai dengan form validation `isKodeDuplicate` pada `TenantList.jsx`.
  - Manajemen status Dinas (`aktif`, `nonaktif`, `ditangguhkan`).
  - Alokasi & Kuota Storage (`storage_used_mb`, `storage_limit_mb`).
  - Manajemen Website Dinas terhubung (`TenantWebsite`).

- **Penugasan Admin Dinas & User Roles**:
  - `superadmin`: Akses penuh ke seluruh sistem dan seluruh Dinas.
  - `admin_dinas`: Akses khusus ke Dinas tempat admin ditugaskan.
  - `operator`: Akses operasional data warga dan pelayanan.

- **Modul Layanan Publik**:
  - **Data Warga**: Pengelolaan data kependudukan per Dinas.
  - **Knowledge Base & Chatbot**: Pengelolaan artikel panduan dan log riwayat interaksi chatbot.
  - **Auditing System**: Pencatatan log aktivitas sistem per Dinas.

---

## 💻 Cara Menjalankan (Local Development)

### 1. Masuk ke Folder Proyek
```bash
cd C:\Users\HELLO\.gemini\antigravity\scratch\aksara_backend
```

### 2. Aktifkan Virtual Environment & Install Dependensi
```bash
# Pengaktifan Venv (Windows PowerShell)
.\venv\Scripts\Activate.ps1

# (Jika belum install dependensi)
pip install -r requirements.txt
```

### 3. Jalankan Seeding Data Awal (SuperAdmin & Sample Dinas)
```bash
python seed.py
```

### 4. Jalankan Server FastAPI (Uvicorn)
```bash
uvicorn app.main:app --reload --port 8000
```

Server API akan berjalan di: `http://127.0.0.1:8000`

---

## 📖 Interactive API Documentation (Swagger & ReDoc)

Buka browser dan akses:
- **Swagger UI**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## 🔑 Kredensial Awal (Setelah Seeding `seed.py`)

| Role | Email | Password | Scope Akses |
| :--- | :--- | :--- | :--- |
| **SuperAdmin** | `superadmin@aksara.go.id` | `admin123` | Seluruh Sistem & All Tenants |
| **Admin Dinkes** | `admin.dinkes@aksara.go.id` | `admin123` | Dinas Kesehatan (`dinkes`) |
| **Admin Disdik** | `admin.disdik@aksara.go.id` | `admin123` | Dinas Pendidikan (`disdik`) |

---

## 🧪 Menjalankan Automated Tests (Pytest)

```bash
pytest
```
