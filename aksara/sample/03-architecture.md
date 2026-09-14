# Nawasara Agent — Arsitektur Sistem

## Gambaran Besar

```mermaid
graph TB
    subgraph Internet
        ATK[Attacker / Scanner]
    end

    subgraph VM_A["VM A — Diskominfo"]
        WS_A[Web Server Nginx]
        AG_A[Nawasara Agent]
        DB_A[(SQLite Buffer)]
        AG_A --> DB_A
    end

    subgraph VM_B["VM B — Dinas Kesehatan"]
        WS_B[Web Server Apache]
        AG_B[Nawasara Agent]
        DB_B[(SQLite Buffer)]
        AG_B --> DB_B
    end

    subgraph VM_C["VM C — BPKAD"]
        WS_C[Web Server Nginx]
        AG_C[Nawasara Agent]
        DB_C[(SQLite Buffer)]
        AG_C --> DB_C
    end

    subgraph Dashboard["Nawasara Dashboard"]
        API[Agent API Endpoint]
        SC[nawasara-secscan]
        NOTIF[Notification Service]
        DB_DASH[(MySQL)]
        API --> DB_DASH
        SC --> DB_DASH
    end

    ATK -->|HTTP Attack| WS_A
    ATK -->|HTTP Attack| WS_B
    ATK -->|HTTP Attack| WS_C

    WS_A -->|access.log| AG_A
    WS_B -->|access.log| AG_B
    WS_C -->|access.log| AG_C

    AG_A -->|HTTP POST + API Key| API
    AG_B -->|HTTP POST + API Key| API
    AG_C -->|HTTP POST + API Key| API

    SC --> NOTIF
```

---

## Arsitektur Internal Agent

```mermaid
graph LR
    subgraph Sources["Data Sources"]
        NGINX[Nginx Log]
        APACHE[Apache Log]
        SSH[SSH Auth Log]
        SYSLOG[Syslog]
        FS[Filesystem]
        PROC[Process List]
    end

    subgraph Agent["Nawasara Agent (Go)"]
        COL[Collector\ngoroutine per source]
        CH{{"Channel\nbuffered"}}
        ANA[Analyzer\nRule Engine]
        COR[Correlation\nEngine]
        REP[Reporter]
        BUF[(SQLite\nBuffer)]
        EXE[Executor\nPhase 2+]
    end

    subgraph Dashboard
        API_IN[POST /api/agent/incidents]
        API_CMD[GET /api/agent/commands]
    end

    NGINX --> COL
    APACHE --> COL
    SSH --> COL
    SYSLOG --> COL
    FS --> COL
    PROC --> COL

    COL --> CH
    CH --> ANA
    ANA --> COR
    COR -->|incident| REP
    REP -->|online| API_IN
    REP -->|offline| BUF
    BUF -->|reconnect| API_IN

    API_CMD -->|poll 30s| EXE
```

---

## Flow Data Detail

### 1. Collector → Analyzer

```
/var/log/nginx/access.log
│
│  (tail -f, realtime inotify)
▼
Collector goroutine
│
│  parse line → LogEntry struct
│  {
│    timestamp: "2026-06-30T10:00:01Z"
│    source_ip: "185.220.101.45"
│    method: "GET"
│    path: "/.env"
│    status: 404
│    user_agent: "python-requests/2.28"
│  }
▼
buffered channel (cap: 10000)
▼
Analyzer
```

### 2. Analyzer → Incident

```
LogEntry masuk Analyzer
│
├── Match rule: path == "/.env"       → score += 10
├── Match rule: path == "/.git"       → score += 10
├── Match rule: UA contains "python"  → score += 5
│
├── score = 25 >= threshold (20)
│
▼
Incident{
  type:       "vulnerability_scan"
  severity:   "high"
  source_ip:  "185.220.101.45"
  score:      25
  evidence:   ["GET /.env 404", "GET /.git 404"]
  detected_at: "2026-06-30T10:00:03Z"
}
```

### 3. Correlation Engine

```
Event 1: GET /.env         (score 10)
Event 2: GET /.git         (score 10)
Event 3: GET /wp-admin     (score 5)
Event 4: POST /login × 15  (score 20)
Event 5: HTTP 500          (score 5)

Time window: 2 menit
Source IP: sama

─────────────────────────────────
Correlation: POSSIBLE EXPLOIT CHAIN

Daripada 5 incident terpisah → 1 incident:

{
  type:     "exploit_chain"
  severity: "critical"
  phases:   ["recon", "brute_force", "exploitation"]
  score:    50
}
```

### 4. Reporter → Dashboard

```
Incident ready
│
├── [online]  → HTTP POST ke Dashboard
│               Authorization: Bearer {api_key}
│               Content-Type: application/json
│               body: { incident payload }
│
└── [offline] → simpan ke SQLite lokal
                tabel: pending_incidents
                retry: setiap 30 detik
                max_age: 7 hari
```

---

## Multi-Tenant Architecture

```mermaid
graph TB
    AG_1["Agent VM-1\napi_key: nwa_abc123"]
    AG_2["Agent VM-2\napi_key: nwa_def456"]
    AG_3["Agent VM-3\napi_key: nwa_ghi789"]

    API["API Gateway\nvalidasi api_key"]

    subgraph Tenant_A["OPD: Diskominfo"]
        VM1[VM Data]
        INC1[Incidents]
    end

    subgraph Tenant_B["OPD: Dinkes"]
        VM2[VM Data]
        INC2[Incidents]
    end

    subgraph Tenant_C["OPD: BPKAD"]
        VM3[VM Data]
        INC3[Incidents]
    end

    AG_1 --> API
    AG_2 --> API
    AG_3 --> API

    API -->|api_key → opd_id| Tenant_A
    API -->|api_key → opd_id| Tenant_B
    API -->|api_key → opd_id| Tenant_C
```

Setiap `api_key` terikat ke satu `agent` record di Database.
Agent record terikat ke `opd_id` (via nawasara-registry).
Isolasi data otomatis — OPD A tidak bisa lihat incident OPD B.

---

## OS Adaptability

```mermaid
graph TD
    START[Agent Start]
    DETECT[Detect OS]

    subgraph Ubuntu_Debian["Ubuntu / Debian"]
        UB_LOG[/var/log/nginx/access.log]
        UB_SSH[/var/log/auth.log]
        UB_SVC[systemctl]
    end

    subgraph CentOS_RHEL["CentOS / RHEL / AlmaLinux"]
        RH_LOG[/var/log/nginx/access.log]
        RH_SSH[/var/log/secure]
        RH_SVC[systemctl]
        RH_FW[firewall-cmd]
    end

    subgraph Config["Runtime Config"]
        CFG[log_paths\nservice_manager\nfirewall_cmd\npackage_manager]
    end

    START --> DETECT
    DETECT -->|/etc/debian_version| Ubuntu_Debian
    DETECT -->|/etc/redhat-release| CentOS_RHEL
    Ubuntu_Debian --> CFG
    CentOS_RHEL --> CFG
```

---

## Auto-Update Flow

```
Agent jalan
│
├── setiap 6 jam: GET /api/agent/version
│   response: { "latest": "1.2.0", "current": "1.1.0" }
│
├── versi baru tersedia?
│   ├── download binary dari /api/agent/download/linux-amd64/1.2.0
│   ├── verify SHA256 checksum
│   ├── simpan sebagai /usr/local/bin/nawasara-agent.new
│   ├── systemctl stop nawasara-agent
│   ├── mv nawasara-agent.new nawasara-agent
│   └── systemctl start nawasara-agent
│
└── versi sama → skip
```

---

## Offline Resilience

```
Normal:
Agent → [HTTP POST] → Dashboard ✓

Dashboard down:
Agent → [HTTP POST] → GAGAL
Agent → simpan ke SQLite (pending_incidents)

Dashboard kembali online:
Agent → retry worker (setiap 30 detik)
     → baca pending_incidents ORDER BY created_at
     → kirim satu per satu
     → hapus dari SQLite setelah berhasil
```

Batas penyimpanan lokal: **7 hari** atau **100MB**, mana yang tercapai lebih dulu.
