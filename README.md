🚀 AKSARA — Asisten Digital untuk Pelayanan Publik

Chatbot AI multi-tenant untuk layanan publik pemerintah daerah.

✨ Fitur

- 🤖 Multi-tenant — Setiap Dinas setting sendiri
- 🧠 RAG (Retrieval-Augmented Generation) — Jawaban berdasarkan knowledge base
- 🔒 API Key Encrypted — Tersimpan aman di database
- 💬 Multi-provider — Google Gemini, OpenAI, Anthropic Claude
- 📊 Token Usage Tracking
- 🚨 Jailbreak Detection
- 🎨 Markdown Render
- ⚡ Redis Cache
- 🌐 Multi-tenant Widget

🛠️ Tech Stack

Backend: FastAPI, PostgreSQL, ChromaDB, Redis
Frontend: React 19, Vite, TailwindCSS
LLM: Google Gemini, OpenAI, Anthropic

🚀 Cara Install

Prasyarat
- Docker Desktop
- Git
- API Key Google Gemini

Langkah-langkah

1. Clone repository
2. Copy `.env.example` jadi `.env` dan isi API Key
3. Jalankan `docker-compose up -d --build`
4. Buka http://localhost:5173

📖 Cara Pakai

1. Login sebagai Super Admin
2. Tambah tenant (Dinas)
3. Setting AI per tenant
4. Upload knowledge base
5. Test chat

🐳 Docker Commands

```bash
Start semua
docker-compose up -d

Stop semua
docker-compose down

Lihat log
docker logs --tail=50 aksara-backend
