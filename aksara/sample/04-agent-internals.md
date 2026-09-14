# Nawasara Agent — Internal Modules

## Overview

```
nawasara-agent (binary Go)
│
├── core/
│   ├── collector/     ← ambil data mentah dari berbagai sumber
│   ├── analyzer/      ← analisa + scoring + correlation
│   ├── reporter/      ← kirim ke Dashboard, buffer offline
│   └── executor/      ← jalankan command dari Dashboard (Phase 2+)
│
├── plugins/           ← plugin yang bisa di-enable/disable
│   ├── docker/
│   ├── laravel/
│   ├── ssl/
│   └── ...
│
└── config/            ← baca config + OS detection
```

---

## 1. Collector

Collector bertugas **hanya membaca data mentah**. Tidak analisa, tidak filter,
tidak keputusan apapun.

### Prinsip
- Satu goroutine per sumber data
- Output ke shared buffered channel
- Jika channel penuh → drop oldest (tidak block goroutine lain)

### Sumber Data

#### Web Server Log
```go
type LogEntry struct {
    Timestamp  time.Time
    SourceIP   string
    Method     string
    Path       string
    Query      string
    StatusCode int
    BytesSent  int
    UserAgent  string
    Referer    string
    Source     string // "nginx" | "apache"
}
```

Path yang dibaca (auto-detect):
```
Nginx  : /var/log/nginx/access.log
         /var/log/nginx/*_access.log  (virtual hosts)
Apache : /var/log/apache2/access.log  (Debian/Ubuntu)
         /var/log/httpd/access_log    (RHEL/CentOS)
```

Metode baca: **inotify** (Linux) → tidak polling, tidak busy-wait.
Fallback: `tail -f` style jika inotify tidak tersedia.

#### SSH Auth Log
```go
type SSHEvent struct {
    Timestamp time.Time
    SourceIP  string
    User      string
    EventType string // "failed" | "accepted" | "invalid_user"
    Port      int
}
```

Path:
```
Ubuntu/Debian : /var/log/auth.log
RHEL/CentOS   : /var/log/secure
```

#### System Metrics (polling tiap 30 detik)
```go
type SystemMetrics struct {
    Timestamp   time.Time
    CPUPercent  float64
    MemUsed     uint64
    MemTotal    uint64
    DiskUsed    map[string]uint64  // per mount point
    LoadAvg1    float64
    LoadAvg5    float64
    NetworkIn   uint64  // bytes/s
    NetworkOut  uint64  // bytes/s
}
```

#### File System Events (plugin: file-integrity)
```go
type FileEvent struct {
    Timestamp time.Time
    Path      string
    EventType string // "created" | "modified" | "deleted"
    Hash      string // SHA256 setelah event
}
```

---

## 2. Analyzer

Analyzer adalah otak agent. Menerima semua output Collector dan menghasilkan Incidents.

### Rule Engine

Rule disimpan dalam format YAML, bisa di-sync dari Dashboard:

```yaml
# rules/vulnerability-scan.yaml
id: rule_001
name: Vulnerability Scan Detection
enabled: true
conditions:
  source: web_log
  window_seconds: 60
  min_matches: 3
  any_of:
    - path_contains: [".env", ".git", ".htaccess", "phpinfo", "wp-admin",
                      "wp-login", "vendor/phpunit", "adminer", "phpmyadmin"]
score: 10_per_match
threshold: 20
severity: high
type: vulnerability_scan
```

```yaml
# rules/sql-injection.yaml
id: rule_002
name: SQL Injection Attempt
conditions:
  source: web_log
  any_of:
    - query_contains_regex: ["UNION.+SELECT", "OR.+1.?=.?1", "DROP.+TABLE",
                             "INSERT.+INTO", "xp_cmdshell", "EXEC.+\\("]
score: 30
threshold: 30
severity: critical
type: sql_injection
```

```yaml
# rules/brute-force.yaml
id: rule_003
name: Login Brute Force
conditions:
  source: web_log
  window_seconds: 60
  path_match: ["/login", "/wp-login.php", "/admin/login", "/auth/login"]
  method: POST
  count_per_ip: 10
score: 5_per_request
threshold: 50
severity: high
type: brute_force
```

### Scoring & Threshold

```
Setiap rule punya:
- score     : poin yang ditambahkan saat rule match
- threshold : skor minimum untuk jadi Incident
- window    : time window penghitungan (default 60 detik)
- per_ip    : apakah skor dihitung per IP (hampir semua: ya)

Contoh:
- Rule "vulnerability scan" threshold 20
- IP 185.x.x.x hit .env (score 10) + .git (score 10) = 20 → INCIDENT
```

### Severity Mapping

| Score | Severity |
|---|---|
| < 20 | info |
| 20-39 | medium |
| 40-69 | high |
| 70+ | critical |

Override: rule bisa set severity eksplisit.

### Correlation Engine

Menghubungkan beberapa Incident dari IP yang sama dalam time window lebih besar:

```go
type CorrelationRule struct {
    Name        string
    Window      time.Duration  // misal 5 menit
    Phases      []string       // urutan type incident yang expected
    ResultType  string
    ResultSeverity string
}

// Contoh: recon → brute_force → exploit → error
var exploitChain = CorrelationRule{
    Name:   "Possible Exploit Chain",
    Window: 5 * time.Minute,
    Phases: []string{
        "vulnerability_scan",
        "brute_force",
        "sql_injection",
    },
    ResultType:     "exploit_chain",
    ResultSeverity: "critical",
}
```

Jika semua phase terpenuhi → Incident baru dengan severity lebih tinggi,
individual incidents di-mark sebagai `correlated: true`.

---

## 3. Reporter

Reporter menerima Incident dari Analyzer dan mengirimkannya ke Dashboard.

### Payload Format

```json
{
  "agent_id": "agt_01j2k3l4m5",
  "api_key": "nwa_xxxxxxxxxxxx",
  "incident": {
    "id": "inc_local_uuid",
    "type": "vulnerability_scan",
    "severity": "high",
    "source_ip": "185.220.101.45",
    "score": 30,
    "correlated": false,
    "evidence": [
      {
        "timestamp": "2026-06-30T10:00:01Z",
        "raw": "GET /.env HTTP/1.1\" 404 162",
        "matched_rule": "rule_001"
      },
      {
        "timestamp": "2026-06-30T10:00:02Z",
        "raw": "GET /.git/config HTTP/1.1\" 404 162",
        "matched_rule": "rule_001"
      }
    ],
    "detected_at": "2026-06-30T10:00:05Z"
  }
}
```

### Offline Buffer

```go
// SQLite schema
CREATE TABLE pending_incidents (
    id          TEXT PRIMARY KEY,  -- UUID lokal
    payload     TEXT NOT NULL,     -- JSON payload
    created_at  DATETIME NOT NULL,
    attempts    INTEGER DEFAULT 0,
    last_attempt DATETIME
);

// Retry worker
// - jalan setiap 30 detik
// - kirim max 10 incident per batch
// - hapus setelah berhasil
// - hapus jika > 7 hari (data stale)
```

### Heartbeat

Setiap 60 detik, agent kirim heartbeat:

```json
{
  "agent_id": "agt_01j2k3l4m5",
  "version": "1.2.0",
  "uptime_seconds": 86400,
  "pending_incidents": 0,
  "plugins_active": ["nginx", "ssl"],
  "health": {
    "cpu_percent": 12.5,
    "mem_used_mb": 38,
    "disk_used_percent": 45
  }
}
```

Dashboard tandai agent `offline` jika tidak ada heartbeat > 3 menit.

---

## 4. Executor (Phase 2+)

Executor menjalankan perintah dari Dashboard. **Hanya aktif jika di-enable di config.**

### Command Polling

```
Agent → GET /api/agent/commands?agent_id=agt_xxx
      ← { "commands": [{ "id": "cmd_123", "action": "block_ip", "params": {"ip": "185.x.x.x"} }] }

Agent jalankan command
Agent → POST /api/agent/commands/cmd_123/result
      → { "success": true, "output": "iptables rule added" }
```

### Allowlist (hardcoded di binary)

Executor hanya mau jalankan command yang ada di allowlist. Tidak bisa di-override
dari Dashboard — ini adalah safety net terakhir.

```go
var allowedActions = map[string]CommandHandler{
    "block_ip":             handleBlockIP,
    "unblock_ip":           handleUnblockIP,
    "restart_nginx":        handleRestartService("nginx"),
    "restart_apache":       handleRestartService("apache2"),
    "restart_php_fpm":      handleRestartService("php8.2-fpm"),
    "restart_mysql":        handleRestartService("mysql"),
    "artisan_queue_restart": handleArtisan("queue:restart"),
    "artisan_cache_clear":  handleArtisan("optimize:clear"),
    "update_agent":         handleSelfUpdate,
    "sync_rules":           handleSyncRules,
}
```

Command yang tidak ada di allowlist → tolak, log warning, kirim error ke Dashboard.

### Block IP Implementation

```
Ubuntu/Debian  → iptables -I INPUT -s {ip} -j DROP
RHEL/CentOS    → firewall-cmd --add-rich-rule="rule family=ipv4 source address={ip} drop"
nftables       → nft add rule inet filter input ip saddr {ip} drop
```

Auto-detect mana yang tersedia di sistem.
