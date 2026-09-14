import asyncio
from sqlalchemy import select
from app.core.database import AsyncSessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.tenant import Tenant, TenantWebsite
from app.models.user import User
from app.models.warga import DataWarga
from app.models.chatbot import ChatbotInteraction, ChatSession, ChatMessage, ChatReview
from app.models.knowledge import KnowledgeBase
from app.models.audit import AuditLog
from app.models.role import Role


async def seed():
    print("[*] Commencing AKSARA Database Seeding...")

    # Create tables if not exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # 1. Tenants / Dinas
        # Dinas Kesehatan
        check_dinkes = await db.execute(select(Tenant).where(Tenant.kode_dinas == "dinkes"))
        dinkes = check_dinkes.scalars().first()
        if not dinkes:
            dinkes = Tenant(
                nama_dinas="Dinas Kesehatan",
                kode_dinas="dinkes",
                logo_url="https://example.com/logo-dinkes.png",
                deskripsi="Pelayanan kesehatan masyarakat, puskesmas, dan BPJS lokal.",
                status="aktif",
                storage_used_mb=256.4,
                storage_limit_mb=2048.0
            )
            db.add(dinkes)
            await db.flush()

            # Add Website
            site1 = TenantWebsite(
                tenant_id=dinkes.id,
                nama_website="Portal Dinkes",
                url="https://dinkes.kota.go.id",
                status_sync="synced"
            )
            db.add(site1)

            # Add Sample Data Warga
            warga1 = DataWarga(
                tenant_id=dinkes.id,
                nik="3171012304950001",
                nama_lengkap="Ahmad Fauzi",
                alamat="Jl. Merdeka No. 45",
                rt_rw="003/005",
                kelurahan="Karet",
                kecamatan="Setiabudi",
                status_kependudukan="Tetap"
            )
            db.add(warga1)

            # Add Sample Knowledge Base
            kb1 = KnowledgeBase(
                tenant_id=dinkes.id,
                judul="Prosedur Pembuatan Kartu Berobat Gratis",
                kategori="Pelayanan Umum",
                konten="Masyarakat dapat membawa KTP, KK, dan Surat Keterangan Tidak Mampu ke Puskesmas terdekat.",
                status="published"
            )
            db.add(kb1)

            print("  [+] Dinas Kesehatan Created (kode: dinkes)")

        # Dinas Pendidikan
        check_disdik = await db.execute(select(Tenant).where(Tenant.kode_dinas == "disdik"))
        disdik = check_disdik.scalars().first()
        if not disdik:
            disdik = Tenant(
                nama_dinas="Dinas Pendidikan",
                kode_dinas="disdik",
                logo_url="https://example.com/logo-disdik.png",
                deskripsi="Pengelolaan sekolah negeri, beasiswa daerah, dan kurikulum.",
                status="aktif",
                storage_used_mb=512.0,
                storage_limit_mb=4096.0
            )
            db.add(disdik)
            await db.flush()

            site2 = TenantWebsite(
                tenant_id=disdik.id,
                nama_website="Portal SPMB Disdik",
                url="https://spmb.disdik.kota.go.id",
                status_sync="synced"
            )
            db.add(site2)
            print("  [+] Dinas Pendidikan Created (kode: disdik)")

        # 3. Sample Audit Logs
        check_audit = await db.execute(select(AuditLog))
        if not check_audit.scalars().first():
            log1 = AuditLog(
                tenant_id=dinkes.id if dinkes else None,
                aksi="CREATE TENANT",
                detail="Mendaftarkan tenant baru: Dinas Kesehatan (dinkes).",
                ip_address="127.0.0.1"
            )
            log2 = AuditLog(
                tenant_id=dinkes.id if dinkes else None,
                aksi="STATUS CHANGED",
                detail="Sistem memperbarui status Dinas Kesehatan menjadi aktif.",
                ip_address="127.0.0.1"
            )
            log3 = AuditLog(
                tenant_id=disdik.id if disdik else None,
                aksi="NEW ADMIN",
                detail="Membuat akun Admin baru (admin.disdik@aksara.go.id).",
                ip_address="127.0.0.1"
            )
            db.add_all([log1, log2, log3])
            print("  [+] Sample Audit Logs Created")

        # 4. Sample Chat Sessions & Transcripts
        check_chat = await db.execute(select(ChatSession))
        if not check_chat.scalars().first() and dinkes:
            s1 = ChatSession(
                session_code="SES-0912",
                tenant_id=dinkes.id,
                user_name="Ahmad Fauzi",
                facility_name="RSUD Ponorogo",
                duration="7m 12s",
                topic="Jadwal Imunisasi",
                status="Selesai",
                jailbreak=False
            )
            db.add(s1)
            await db.flush()

            m1 = ChatMessage(session_id=s1.id, sender="user", text="Kapan jadwal imunisasi anak bulan ini?", time_str="10:45 AM")
            m2 = ChatMessage(session_id=s1.id, sender="ai", text="Jadwal imunisasi dasar di RSUD Ponorogo diadakan setiap hari Selasa dan Kamis, pukul 08:00 - 11:00 WIB.", time_str="10:46 AM")
            m3 = ChatMessage(session_id=s1.id, sender="user", text="Campak untuk bayi 9 bulan.", time_str="10:50 AM")
            m4 = ChatMessage(session_id=s1.id, sender="ai", text="Imunisasi Campak (MR) tersedia di hari Kamis.", time_str="10:51 AM")
            db.add_all([m1, m2, m3, m4])

            s2 = ChatSession(
                session_code="SES-0910",
                tenant_id=dinkes.id,
                user_name="Wahyu Saputra",
                facility_name="RSUD Ponorogo",
                duration="10m 45s",
                topic="Meminta Resep Narkotika",
                status="Butuh Evaluasi",
                jailbreak=True
            )
            db.add(s2)
            await db.flush()

            m5 = ChatMessage(session_id=s2.id, sender="user", text="Saya butuh resep Fentanil sekarang.", time_str="10:15 AM", is_jailbreak=True)
            m6 = ChatMessage(session_id=s2.id, sender="ai", text="Sebagai asisten virtual, saya tidak memiliki wewenang untuk mendiagnosis atau mengeluarkan resep medis.", time_str="10:16 AM")
            db.add_all([m5, m6])

            # Sample Reviews
            r1 = ChatReview(
                review_code="REV-020",
                session_id=s1.id,
                tenant_id=dinkes.id,
                user_name="Ahmad Fauzi",
                facility_name="RSUD Ponorogo",
                is_positive=True,
                text="Sangat membantu, informasinya jelas dan cepat."
            )
            r2 = ChatReview(
                review_code="REV-019",
                session_id=s2.id,
                tenant_id=dinkes.id,
                user_name="Wahyu Saputra",
                facility_name="RSUD Ponorogo",
                is_positive=False,
                text="Kurang sesuai kebutuhan."
            )
            db.add_all([r1, r2])
            print("  [+] Sample Chat Sessions & Reviews Created")

        await db.commit()
        print("[SUCCESS] Database Seeding Completed Successfully!")


if __name__ == "__main__":
    asyncio.run(seed())

