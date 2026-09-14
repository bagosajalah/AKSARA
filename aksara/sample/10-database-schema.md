# Nawasara Agent — Database Schema (Dashboard Side)

## Entity Relationship Diagram

```mermaid
erDiagram
    nawasara_agents {
        bigint id PK
        string agent_id UK "agt_xxx"
        string name
        string hostname
        string os
        string arch
        string agent_version
        string web_server
        string ip_local
        bigint opd_id FK
        string api_key_hash "bcrypt"
        string status "online|offline|never_connected"
        decimal health_score
        json plugins_active
        timestamp last_seen_at
        timestamp registered_at
        timestamps
    }

    nawasara_security_incidents {
        bigint id PK
        string incident_id UK "inc_xxx"
        bigint agent_id FK
        string type
        string severity "info|medium|high|critical"
        string source_ip
        int score
        boolean correlated
        string correlated_group_id
        json evidence
        json metadata
        timestamp detected_at
        boolean notified
        timestamp notified_at
        timestamps
    }

    nawasara_agent_commands {
        bigint id PK
        string command_id UK "cmd_xxx"
        bigint agent_id FK
        string action
        json params
        string status "pending|approved|sent|executed|failed|expired"
        bigint requested_by FK
        bigint approved_by FK
        timestamp approved_at
        timestamp sent_at
        timestamp executed_at
        json result
        timestamp expires_at
        timestamps
    }

    nawasara_agent_heartbeats {
        bigint id PK
        bigint agent_id FK
        string agent_version
        decimal health_score
        int pending_incidents
        json plugins_active
        json metrics
        int uptime_seconds
        timestamps
    }

    nawasara_security_rules {
        bigint id PK
        string rule_id UK
        string name
        string category
        text conditions "JSON/YAML"
        string severity
        int score
        int threshold
        boolean enabled
        bigint opd_id FK "null = global"
        string version
        timestamps
    }

    nawasara_blocked_ips {
        bigint id PK
        bigint agent_id FK
        string ip
        string reason
        bigint command_id FK
        timestamp blocked_at
        timestamp expires_at "null = permanent"
        boolean active
        timestamps
    }

    nawasara_agents ||--o{ nawasara_security_incidents : "has"
    nawasara_agents ||--o{ nawasara_agent_commands : "receives"
    nawasara_agents ||--o{ nawasara_agent_heartbeats : "sends"
    nawasara_agents ||--o{ nawasara_blocked_ips : "enforces"
```

---

## Migration Detail

### nawasara_agents

```php
Schema::create('nawasara_agents', function (Blueprint $table) {
    $table->id();
    $table->string('agent_id', 32)->unique();          // agt_xxx
    $table->string('name');                             // display name
    $table->string('hostname');
    $table->string('os', 64)->nullable();
    $table->string('arch', 16)->nullable();
    $table->string('agent_version', 32)->nullable();
    $table->string('web_server', 16)->nullable();       // nginx|apache|both
    $table->string('ip_local', 45)->nullable();         // IPv4/IPv6
    $table->unsignedBigInteger('opd_id')->nullable();
    $table->string('api_key_hash');                     // bcrypt hash
    $table->string('status', 20)->default('never_connected');
    $table->decimal('health_score', 5, 2)->default(100);
    $table->json('plugins_active')->nullable();
    $table->timestamp('last_seen_at')->nullable();
    $table->timestamp('registered_at')->nullable();
    $table->timestamps();
    $table->softDeletes();

    $table->index('status');
    $table->index('opd_id');
    $table->index('last_seen_at');
});
```

### nawasara_security_incidents

```php
Schema::create('nawasara_security_incidents', function (Blueprint $table) {
    $table->id();
    $table->string('incident_id', 32)->unique();
    $table->foreignId('agent_id')->constrained('nawasara_agents')->cascadeOnDelete();
    $table->string('type', 64);                         // vulnerability_scan, sql_injection, dll
    $table->string('severity', 16);                     // info|medium|high|critical
    $table->string('source_ip', 45);
    $table->unsignedSmallInteger('score')->default(0);
    $table->boolean('correlated')->default(false);
    $table->string('correlated_group_id', 32)->nullable();
    $table->json('evidence');                            // array of {timestamp, raw, matched_rule}
    $table->json('metadata')->nullable();                // extra context
    $table->timestamp('detected_at');
    $table->boolean('notified')->default(false);
    $table->timestamp('notified_at')->nullable();
    $table->timestamps();

    $table->index(['agent_id', 'detected_at']);
    $table->index(['source_ip', 'detected_at']);
    $table->index(['severity', 'detected_at']);
    $table->index('type');
});
```

### nawasara_agent_commands

```php
Schema::create('nawasara_agent_commands', function (Blueprint $table) {
    $table->id();
    $table->string('command_id', 32)->unique();
    $table->foreignId('agent_id')->constrained('nawasara_agents')->cascadeOnDelete();
    $table->string('action', 64);
    $table->json('params')->nullable();
    $table->string('status', 20)->default('pending');
    $table->foreignId('requested_by')->constrained('users');
    $table->foreignId('approved_by')->nullable()->constrained('users');
    $table->timestamp('approved_at')->nullable();
    $table->timestamp('sent_at')->nullable();
    $table->timestamp('executed_at')->nullable();
    $table->json('result')->nullable();
    $table->timestamp('expires_at');
    $table->timestamps();

    $table->index(['agent_id', 'status']);
    $table->index('status');
});
```

### nawasara_agent_heartbeats

```php
// Hanya simpan N heartbeat terakhir per agent (prune otomatis)
Schema::create('nawasara_agent_heartbeats', function (Blueprint $table) {
    $table->id();
    $table->foreignId('agent_id')->constrained('nawasara_agents')->cascadeOnDelete();
    $table->string('agent_version', 32)->nullable();
    $table->decimal('health_score', 5, 2)->default(100);
    $table->unsignedSmallInteger('pending_incidents')->default(0);
    $table->json('plugins_active')->nullable();
    $table->json('metrics')->nullable();                  // cpu, mem, disk, network
    $table->unsignedInteger('uptime_seconds')->default(0);
    $table->timestamps();

    $table->index(['agent_id', 'created_at']);
});
// Prune: hapus heartbeat > 30 hari via scheduled job
```

### nawasara_security_rules

```php
Schema::create('nawasara_security_rules', function (Blueprint $table) {
    $table->id();
    $table->string('rule_id', 64)->unique();
    $table->string('name');
    $table->string('category', 64);
    $table->text('conditions');                           // YAML/JSON rule definition
    $table->string('severity', 16);
    $table->unsignedSmallInteger('score')->default(10);
    $table->unsignedSmallInteger('threshold')->default(20);
    $table->boolean('enabled')->default(true);
    $table->unsignedBigInteger('opd_id')->nullable();    // null = global rule
    $table->string('version', 32)->nullable();
    $table->timestamps();

    $table->index(['enabled', 'opd_id']);
});
```

### nawasara_blocked_ips

```php
Schema::create('nawasara_blocked_ips', function (Blueprint $table) {
    $table->id();
    $table->foreignId('agent_id')->constrained('nawasara_agents')->cascadeOnDelete();
    $table->string('ip', 45);
    $table->text('reason')->nullable();
    $table->foreignId('command_id')->nullable()->constrained('nawasara_agent_commands');
    $table->timestamp('blocked_at');
    $table->timestamp('expires_at')->nullable();
    $table->boolean('active')->default(true);
    $table->timestamps();

    $table->index(['agent_id', 'active']);
    $table->index(['ip', 'active']);
});
```

---

## Indexes untuk Query Umum

```sql
-- "Tampilkan semua incident critical dalam 24 jam terakhir lintas VM"
SELECT * FROM nawasara_security_incidents
WHERE severity = 'critical' AND detected_at > NOW() - INTERVAL 24 HOUR
ORDER BY detected_at DESC;
-- Index: (severity, detected_at)

-- "Tampilkan semua incident dari IP X di semua VM"
SELECT i.*, a.name as agent_name
FROM nawasara_security_incidents i
JOIN nawasara_agents a ON i.agent_id = a.id
WHERE i.source_ip = '185.220.101.45'
ORDER BY i.detected_at DESC;
-- Index: (source_ip, detected_at)

-- "Agent mana yang offline?"
SELECT * FROM nawasara_agents
WHERE status = 'online' AND last_seen_at < NOW() - INTERVAL 3 MINUTE;
-- Index: (status, last_seen_at)

-- "Incident per VM dalam 7 hari terakhir untuk health summary"
SELECT agent_id, severity, COUNT(*) as total
FROM nawasara_security_incidents
WHERE detected_at > NOW() - INTERVAL 7 DAY
GROUP BY agent_id, severity;
-- Index: (agent_id, detected_at)
```

---

## Data Retention Jobs

```php
// Scheduled di nawasara-secscan ServiceProvider

// Hapus incidents > 90 hari
$schedule->call(fn () =>
    SecurityIncident::where('detected_at', '<', now()->subDays(90))->delete()
)->daily()->name('secscan:prune-incidents');

// Hapus heartbeats > 30 hari
$schedule->call(fn () =>
    AgentHeartbeat::where('created_at', '<', now()->subDays(30))->delete()
)->daily()->name('secscan:prune-heartbeats');

// Tandai agent offline jika tidak ada heartbeat 3 menit
$schedule->call(fn () =>
    Agent::where('status', 'online')
        ->where('last_seen_at', '<', now()->subMinutes(3))
        ->update(['status' => 'offline'])
)->everyMinute()->name('secscan:check-agent-status');
```
