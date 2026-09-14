# Nawasara Agent — Security Model

Agent ini adalah software security — maka agent itu sendiri harus aman.
Kompromisasi agent = penyerang punya mata di dalam VM dan bisa eksekusi perintah.

---

## Threat Model

### Apa yang Dilindungi
1. **Komunikasi Agent ↔ Dashboard** — tidak boleh disadap atau dipalsukan
2. **API Key** — tidak boleh bocor atau digunakan agent palsu
3. **Executor** — tidak boleh dieksploitasi untuk jalankan command arbitrary
4. **Binary Agent** — tidak boleh diganti dengan versi berbahaya
5. **Buffer SQLite** — berisi incident data, tidak boleh dibaca pihak lain

### Attack Scenarios

| Skenario | Mitigasi |
|---|---|
| MITM antara agent dan Dashboard | HTTPS wajib, TLS 1.2+ |
| API key bocor / dicuri | Key rotation dari Dashboard, rate limiting per key |
| Dashboard dicompromise, kirim command jahat | Allowlist hardcoded di binary |
| Binary agent diganti attacker | GPG signature verification saat update |
| Agent push incident palsu (spoofing) | 1 API key = 1 agent, key tidak bisa pindah VM |
| Buffer SQLite dibaca | File permission 600, owner root |
| Agent exploit baru | Update mekanisme, min version enforcement |

---

## Komunikasi Aman

### HTTPS Only
- Agent HANYA mau komunikasi via HTTPS
- HTTP ditolak — config `dashboard_url` harus `https://`
- Verifikasi TLS certificate (tidak ada `InsecureSkipVerify`)

### Certificate Pinning (Opsional, Phase 2+)
```yaml
# config.yaml
reporter:
  tls_cert_fingerprint: "sha256:abc123..."  # jika di-set, pin ke cert ini
```

### API Key Security
- Format: `nwa_` prefix + 32 karakter random (256-bit entropy)
- Disimpan di config file dengan permission `600` (hanya root yang baca)
- Tidak pernah di-log, tidak pernah masuk error message
- Di Dashboard: disimpan sebagai bcrypt hash, tidak bisa dilihat ulang
- Rotate: admin generate key baru dari Dashboard, agent poll config dan update

---

## Executor Safety

Ini komponen paling sensitif. Berlapis-lapis:

### Layer 1 — Allowlist Hardcoded
```go
// TIDAK bisa di-override dari Dashboard atau config
var allowedActions = map[string]bool{
    "block_ip":              true,
    "unblock_ip":            true,
    "restart_nginx":         true,
    // ... daftar terbatas
}

func (e *Executor) Execute(cmd Command) Result {
    if !allowedActions[cmd.Action] {
        log.Warn("rejected command not in allowlist", "action", cmd.Action)
        return Result{Success: false, Error: "action not permitted"}
    }
    // ...
}
```

### Layer 2 — Parameter Sanitization
Tidak ada shell interpolation. Setiap command dijalankan dengan `exec.Command` Go,
bukan `sh -c`:

```go
// AMAN — tidak ada shell injection
exec.Command("iptables", "-I", "INPUT", "-s", ip, "-j", "DROP")

// TIDAK PERNAH dilakukan:
exec.Command("sh", "-c", "iptables -I INPUT -s " + ip + " -j DROP")
```

### Layer 3 — Input Validation
```go
func validateIP(ip string) error {
    if net.ParseIP(ip) == nil {
        return fmt.Errorf("invalid IP: %s", ip)
    }
    // Blokir private ranges — jangan sampai blokir IP internal sendiri
    if isPrivateIP(ip) {
        return fmt.Errorf("cannot block private IP: %s", ip)
    }
    return nil
}
```

### Layer 4 — Command Expiry
Setiap command dari Dashboard punya `expires_at`. Agent tolak command yang sudah expired:
```go
if time.Now().After(cmd.ExpiresAt) {
    return Result{Success: false, Error: "command expired"}
}
```

### Layer 5 — Audit Log
Setiap eksekusi command dicatat ke file log lokal dan dikembalikan ke Dashboard:
```
2026-06-30T10:05:23Z [EXECUTOR] action=block_ip ip=185.x.x.x requested_by=admin@ponorogo.go.id result=success
```

---

## Binary Integrity

### Update Verification
Sebelum apply update, agent verifikasi:

```
1. SHA256 checksum cocok dengan yang dideklarasikan Dashboard
2. GPG signature valid (signed dengan private key Nawasara)
3. Binary bisa di-execute (tidak corrupt)
4. Versi baru > versi lama (tidak bisa downgrade paksa)
```

### File Permissions
```
/usr/local/bin/nawasara-agent    → 755 root:root
/etc/nawasara-agent/             → 700 root:root
/etc/nawasara-agent/config.yaml  → 600 root:root (berisi API key)
/var/lib/nawasara-agent/         → 700 root:root
/var/lib/nawasara-agent/buffer.db → 600 root:root
```

---

## Dashboard-Side Security

### API Key Registration
- Key hanya bisa digenerate oleh admin yang punya permission `secscan.agent.create`
- Satu key = satu agent = satu hostname
- Jika key digunakan dari IP yang berubah drastis → alert anomali (Phase 2+)

### Approval Workflow (Phase 2+)
Sebelum command dikirim ke agent:
```
Admin klik "Block IP"
    ↓
Masuk antrian "pending_approval"
    ↓
Admin lain (atau admin yang sama setelah sudo re-auth) approve
    ↓
Baru dikirim ke agent
```

Untuk aksi destruktif (restart service, update agent): wajib sudo re-auth
via Keycloak step-up (nawasara/auth-primitives).

### Rate Limiting API
```
POST /api/agent/incidents → max 60 req/menit per api_key
POST /api/agent/heartbeat → max 2 req/menit per api_key
GET /api/agent/commands   → max 4 req/menit per api_key
```

---

## Privacy & Data Retention

### Apa yang Disimpan di Dashboard
- Incident data (type, severity, source_ip, evidence, timestamp)
- Heartbeat data (metrics, plugin status)
- Agent metadata (hostname, OS, version)

### Apa yang TIDAK Disimpan
- Raw log (agent tidak kirim raw log)
- Konten request body (hanya URL/path/query string)
- Data aplikasi (tidak akses database aplikasi)
- Credential apapun yang ada di server

### Retention Policy
- Incident data: 90 hari (default), configurable per OPD
- Heartbeat/metrics: 30 hari
- Audit log eksekusi: 1 tahun (untuk compliance)
