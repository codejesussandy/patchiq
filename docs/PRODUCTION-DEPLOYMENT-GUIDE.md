# Production Deployment Guide

**Version:** 1.0.0
**Last Updated:** 2026-02-14

This guide provides step-by-step instructions for deploying PatchIQ to a production environment.

---

## Pre-Deployment Checklist

### Infrastructure Requirements

- [ ] PostgreSQL 14+ server provisioned (4 vCPUs, 8 GB RAM, SSD storage)
- [ ] Redis server provisioned (2 vCPUs, 4 GB RAM)
- [ ] MinIO server or S3 bucket configured (100 GB+ storage)
- [ ] Backend server provisioned (4 vCPUs, 8 GB RAM)
- [ ] Load balancer configured (if using multiple backend instances)
- [ ] DNS records configured (e.g., patchiq.example.com)
- [ ] TLS certificate obtained (Let's Encrypt or commercial CA)
- [ ] Firewall rules configured (ports 443, 5432, 6379, 9000)
- [ ] Backup solution configured (database, MinIO, config files)
- [ ] Monitoring solution configured (Prometheus + Grafana recommended)

### Security Requirements

- [ ] Code signing certificates obtained (Windows Authenticode, Apple Developer ID)
- [ ] Secrets management solution in place (AWS Secrets Manager, HashiCorp Vault, etc.)
- [ ] TLS certificates installed and configured
- [ ] Firewall rules reviewed and approved
- [ ] Security audit completed and all critical/high issues resolved
- [ ] Penetration testing completed (optional but recommended)
- [ ] Incident response plan documented
- [ ] Security contacts designated

### Compliance Requirements (if applicable)

- [ ] GDPR compliance reviewed (if handling EU data)
- [ ] SOC 2 requirements reviewed (if applicable)
- [ ] HIPAA compliance reviewed (if handling healthcare data)
- [ ] Data retention policies defined and implemented
- [ ] Privacy policy published

---

## Step 1: Database Setup

### 1.1 Provision PostgreSQL Server

**Cloud Options:**
- **AWS:** RDS for PostgreSQL
- **Azure:** Azure Database for PostgreSQL
- **GCP:** Cloud SQL for PostgreSQL
- **Self-hosted:** Docker, VM, or bare metal

**Configuration:**
```sql
-- Create database and user
CREATE DATABASE patchiq;
CREATE USER patchiq_app WITH ENCRYPTED PASSWORD 'STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE patchiq TO patchiq_app;

-- Tune for production
ALTER SYSTEM SET shared_buffers = '2GB';
ALTER SYSTEM SET effective_cache_size = '6GB';
ALTER SYSTEM SET work_mem = '64MB';
ALTER SYSTEM SET max_connections = 200;
SELECT pg_reload_conf();
```

### 1.2 Run Migrations

```bash
cd backend
export DATABASE_URL="postgresql://patchiq_app:PASSWORD@postgres-server:5432/patchiq"
npm run prisma:migrate:deploy
```

### 1.3 Seed Initial Data (Optional)

```bash
npm run prisma:seed
# Creates admin user: admin@patchiq.io / admin123 (CHANGE PASSWORD IMMEDIATELY)
```

---

## Step 2: Redis Setup

### 2.1 Provision Redis Server

**Cloud Options:**
- **AWS:** ElastiCache for Redis
- **Azure:** Azure Cache for Redis
- **GCP:** Cloud Memorystore
- **Self-hosted:** Docker or VM

**Configuration:**
```conf
# redis.conf (if self-hosted)
maxmemory 2gb
maxmemory-policy allkeys-lru
bind 0.0.0.0
requirepass STRONG_REDIS_PASSWORD
```

### 2.2 Test Connection

```bash
redis-cli -h redis-server -a STRONG_REDIS_PASSWORD ping
# Expected: PONG
```

---

## Step 3: MinIO / S3 Setup

### 3.1 Provision Object Storage

**Option A: MinIO (Self-Hosted)**
```bash
docker run -d \
  --name minio \
  -p 9000:9000 \
  -p 9001:9001 \
  -e MINIO_ROOT_USER=minio-admin \
  -e MINIO_ROOT_PASSWORD=STRONG_MINIO_PASSWORD \
  -v /data/minio:/data \
  minio/minio server /data --console-address ":9001"
```

**Option B: AWS S3**
- Create S3 bucket: `patchiq-packages-prod`
- Configure bucket policy for backend access
- Enable versioning (recommended)

### 3.2 Create Buckets

```bash
# Using MinIO client (mc)
mc alias set minio http://minio-server:9000 minio-admin STRONG_MINIO_PASSWORD
mc mb minio/packages
mc mb minio/agent-binaries
mc mb minio/backups
```

---

## Step 4: Backend Deployment

### 4.1 Build Backend

```bash
cd backend
npm ci --production
npm run build
```

### 4.2 Configure Environment

**Create `.env` file:**
```bash
# Database
DATABASE_URL=postgresql://patchiq_app:PASSWORD@postgres-server:5432/patchiq

# Redis
REDIS_URL=redis://:REDIS_PASSWORD@redis-server:6379

# MinIO / S3
MINIO_ENDPOINT=minio-server:9000
MINIO_ACCESS_KEY=minio-admin
MINIO_SECRET_KEY=STRONG_MINIO_PASSWORD
MINIO_BUCKET=packages
MINIO_USE_SSL=true

# JWT
JWT_SECRET=GENERATE_RANDOM_256_BIT_SECRET
JWT_EXPIRATION=24h

# API
PORT=3000
NODE_ENV=production
API_URL=https://api.patchiq.example.com

# Email (for notifications)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@patchiq.example.com
SMTP_PASSWORD=SMTP_PASSWORD

# Monitoring
PROMETHEUS_ENABLED=true
LOG_LEVEL=info
```

**Security Note:** Store secrets in environment variables or secrets manager, NOT in `.env` file committed to Git.

### 4.3 Start Backend

**Option A: Systemd Service (Linux)**
```ini
# /etc/systemd/system/patchiq-backend.service
[Unit]
Description=PatchIQ Backend API
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=patchiq
WorkingDirectory=/opt/patchiq/backend
EnvironmentFile=/opt/patchiq/backend/.env
ExecStart=/usr/bin/node dist/server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable patchiq-backend
sudo systemctl start patchiq-backend
sudo systemctl status patchiq-backend
```

**Option B: Docker**
```bash
docker run -d \
  --name patchiq-backend \
  --restart always \
  --env-file .env \
  -p 3000:3000 \
  patchiq/backend:1.0.0
```

**Option C: PM2 (Node.js)**
```bash
npm install -g pm2
pm2 start dist/server.js --name patchiq-backend
pm2 save
pm2 startup
```

### 4.4 Verify Backend

```bash
curl -k https://api.patchiq.example.com/api/health
# Expected: {"success":true,"data":{"status":"healthy"}}
```

---

## Step 5: Frontend Deployment

### 5.1 Build Frontend

```bash
cd frontend
npm ci
npm run build
# Output: dist/
```

### 5.2 Deploy to Web Server

**Option A: Nginx**
```nginx
# /etc/nginx/sites-available/patchiq
server {
    listen 80;
    server_name patchiq.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name patchiq.example.com;

    ssl_certificate /etc/letsencrypt/live/patchiq.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/patchiq.example.com/privkey.pem;

    # Frontend (SPA)
    root /var/www/patchiq/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://backend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # MinIO proxy (optional)
    location /s3/ {
        proxy_pass http://minio:9000/;
    }
}
```

```bash
sudo cp dist/* /var/www/patchiq/dist/
sudo nginx -t
sudo systemctl reload nginx
```

**Option B: Cloud Storage (S3, Azure Blob, GCS)**
- Upload `dist/` contents to bucket
- Configure bucket for static website hosting
- Configure CloudFront/CDN (optional)

### 5.3 Verify Frontend

```bash
curl https://patchiq.example.com
# Expected: HTML page
```

---

## Step 6: Agent Deployment

### 6.1 Build Signed Agent Binaries

**See:** `CODE-SIGNING.md` for detailed instructions

**Windows:**
```bash
cd agent
GOOS=windows GOARCH=amd64 go build -o patchiq-agent.exe ./cmd/agent
signtool sign /f cert.pfx /p PASSWORD /tr http://timestamp.digicert.com /td sha256 patchiq-agent.exe
```

**macOS:**
```bash
GOOS=darwin GOARCH=arm64 go build -o patchiq-agent ./cmd/agent
codesign --sign "Developer ID Application: Company Name" patchiq-agent
xcrun notarytool submit patchiq-agent.zip --key AuthKey.p8 --key-id KEYID --issuer ISSUER --wait
```

**Linux:**
```bash
GOOS=linux GOARCH=amd64 go build -o patchiq-agent ./cmd/agent
# Create DEB/RPM packages (see packaging scripts)
```

### 6.2 Create Installers

**Windows (MSI):**
- Use WiX Toolset
- Include agent binary, default config, service installer
- See `docs/windows-packaging/` for scripts

**macOS (PKG):**
- Use `pkgbuild` and `productbuild`
- See `MACOS-PKG.md` for detailed instructions

**Linux (DEB/RPM):**
- Use `dpkg-deb` or `rpmbuild`
- See Debian/RHEL packaging guides

### 6.3 Upload to Package Repository

```bash
# Upload to MinIO
mc cp patchiq-agent-1.0.0-windows-amd64.msi minio/agent-binaries/
mc cp patchiq-agent-1.0.0-macos-arm64.pkg minio/agent-binaries/
mc cp patchiq-agent-1.0.0-linux-amd64.deb minio/agent-binaries/
mc cp patchiq-agent-1.0.0-linux-amd64.rpm minio/agent-binaries/
```

### 6.4 Deploy Agents

**Deployment Methods:**
- **Manual:** Install on each machine individually
- **GPO (Windows):** Deploy MSI via Group Policy
- **MDM (macOS):** Deploy PKG via Jamf, Intune, etc.
- **Configuration Management:** Ansible, Puppet, Chef, SaltStack
- **Scripts:** Custom deployment scripts

**Example: Ansible**
```yaml
# playbook.yml
- hosts: all
  tasks:
    - name: Download PatchIQ agent
      get_url:
        url: https://releases.patchiq.io/agent/patchiq-agent-1.0.0-{{ ansible_system | lower }}-{{ ansible_architecture }}.{{ 'deb' if ansible_os_family == 'Debian' else 'rpm' }}
        dest: /tmp/patchiq-agent.{{ 'deb' if ansible_os_family == 'Debian' else 'rpm' }}

    - name: Install agent (Debian)
      apt:
        deb: /tmp/patchiq-agent.deb
      when: ansible_os_family == 'Debian'

    - name: Install agent (RedHat)
      yum:
        name: /tmp/patchiq-agent.rpm
      when: ansible_os_family == 'RedHat'

    - name: Configure agent
      template:
        src: agent.yaml.j2
        dest: /etc/patchiq/agent.yaml
        mode: '0600'

    - name: Start agent service
      systemd:
        name: patchiq-agent
        state: started
        enabled: yes
```

---

## Step 7: Monitoring & Alerting

### 7.1 Prometheus Setup

**prometheus.yml:**
```yaml
scrape_configs:
  - job_name: 'patchiq-backend'
    static_configs:
      - targets: ['backend:3000']

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
```

### 7.2 Grafana Dashboards

Import pre-built dashboards:
- PatchIQ Backend Performance
- PostgreSQL Performance
- Redis Performance
- Agent Health Overview

### 7.3 Alerting Rules

**Example: Agent Offline Alert**
```yaml
groups:
  - name: patchiq_alerts
    rules:
      - alert: AgentOffline
        expr: patchiq_agent_status{status="offline"} > 0
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Agent {{ $labels.agent_id }} is offline"
```

---

## Step 8: Backup & Disaster Recovery

### 8.1 Database Backups

**Automated Daily Backups:**
```bash
# Cron job
0 2 * * * pg_dump -h postgres-server -U patchiq_app patchiq | gzip > /backups/patchiq-$(date +\%Y\%m\%d).sql.gz
```

**Retention:** Keep 30 days of daily backups

### 8.2 MinIO Backups

**Option A: MinIO Versioning (enabled by default)**

**Option B: Replication to secondary MinIO or S3**
```bash
mc mirror --watch minio/packages s3-backup/packages
```

### 8.3 Configuration Backups

**Backup:**
- Backend `.env` file
- Database connection strings
- TLS certificates
- Code signing certificates

**Storage:** Encrypted vault (Vault, AWS Secrets Manager)

### 8.4 Disaster Recovery Plan

1. Restore database from latest backup
2. Restore MinIO data from backup/replication
3. Redeploy backend from Git repository
4. Reconfigure environment variables
5. Restart services
6. Verify agents reconnect

**RTO (Recovery Time Objective):** < 4 hours
**RPO (Recovery Point Objective):** < 24 hours

---

## Step 9: Post-Deployment Verification

### 9.1 Health Checks

```bash
# Backend health
curl https://api.patchiq.example.com/api/health

# Database connectivity
psql -h postgres-server -U patchiq_app -d patchiq -c "SELECT 1;"

# Redis connectivity
redis-cli -h redis-server -a PASSWORD ping

# MinIO connectivity
mc ls minio/packages
```

### 9.2 Agent Registration Test

1. Install agent on test machine
2. Verify agent appears in dashboard
3. Verify heartbeat updates every 60 seconds
4. Trigger inventory collection
5. Verify inventory data appears

### 9.3 Deployment Test

1. Create test deployment (e.g., install curl on Linux agent)
2. Monitor deployment progress
3. Verify deployment succeeds
4. Check agent logs for errors

### 9.4 Performance Baseline

- Record baseline metrics (CPU, memory, response times)
- Use as comparison for future monitoring

---

## Step 10: Production Cutover

### 10.1 DNS Update

- Update DNS to point to production backend
- Wait for DNS propagation (TTL dependent)

### 10.2 Agent Rollout

**Phased Approach (Recommended):**
1. **Pilot:** Deploy to 5-10 test agents
2. **Canary:** Deploy to 10% of production agents
3. **Full Rollout:** Deploy to remaining 90%

**Monitor:** After each phase, monitor for 24-48 hours before proceeding

### 10.3 Communication

- Notify users of deployment
- Provide support contact information
- Document known issues and workarounds

---

## Troubleshooting

See `TROUBLESHOOTING-INSTALL.md` for common issues and solutions.

**Common Production Issues:**

1. **Agents not registering:** Check firewall, TLS certificates, backend URL
2. **High database load:** Check slow queries, add indexes, increase resources
3. **High backend CPU:** Check for inefficient code, consider horizontal scaling
4. **Deployment failures:** Check package availability, agent permissions, logs

---

## Maintenance

### Regular Tasks

**Daily:**
- Monitor dashboards for anomalies
- Review error logs

**Weekly:**
- Review agent health (offline agents)
- Review deployment success rate
- Check disk space usage (database, MinIO)

**Monthly:**
- Update dependencies (security patches)
- Review performance trends
- Optimize slow database queries

**Quarterly:**
- Review and update security policies
- Conduct security audit
- Review disaster recovery plan
- Update code signing certificates (if expiring)

---

## Rollback Procedure

If critical issues discovered post-deployment:

1. **Stop agent deployments**
2. **Identify issue** (logs, metrics)
3. **If backend issue:**
   - Revert to previous backend version
   - Rollback database migrations (if needed)
4. **If agent issue:**
   - Pause agent rollout
   - Deploy hotfix or roll back to previous version
5. **Communicate issue** to stakeholders
6. **Root cause analysis** and fix

---

## Support & Escalation

**Tier 1 (Users):** support@patchiq.io
**Tier 2 (Operations):** ops@patchiq.io
**Tier 3 (Engineering):** engineering@patchiq.io
**Emergency:** +1-555-PATCHIQ (24/7 on-call)

---

**Document Status:** Production Ready
**Last Updated:** 2026-02-14
**Version:** 1.0.0
