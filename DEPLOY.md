# Manris v2 Deployment Guide

Complete guide for deploying Manris v2 to Digital Ocean using Docker, nginx, and automated SSL certificates.

---

## Architecture Overview

```
Internet
   |
   v
[nginx:443] ─── SSL/TLS termination
   |
   ├─> [backend:8080] ────> [postgres:5432]
   |
   └─> [frontend:3000]
   
[certbot] ─── Automatic SSL renewal (every 60 days)
```

**Services:**
- **nginx**: Reverse proxy with SSL termination (ports 80, 443)
- **backend**: Go/Fiber API server (internal port 8080)
- **frontend**: Next.js web app (internal port 3000)
- **postgres**: PostgreSQL 16 database (internal port 5432)
- **certbot**: Let's Encrypt SSL certificate manager

---

## Prerequisites

### Digital Ocean Droplet
- **OS**: Ubuntu 22.04 LTS or newer
- **RAM**: 2GB minimum (4GB recommended for production)
- **Storage**: 40GB+ SSD
- **Networking**: Public IPv4 address

### DNS Configuration
Add A records pointing to your Droplet's IP:

| Record Type | Hostname              | Value           | TTL  |
|-------------|-----------------------|-----------------|------|
| A           | api-manris.marvcore.com | YOUR_DROPLET_IP | 3600 |
| A           | manris.marvcore.com     | YOUR_DROPLET_IP | 3600 |

**Verify DNS propagation:**
```bash
dig api-manris.marvcore.com +short
dig manris.marvcore.com +short
```

### Docker Hub Account
Create a Docker Hub account at https://hub.docker.com

**Generate access token:**
1. Login to Docker Hub
2. Account Settings → Security → New Access Token
3. Token name: `manris-github-actions`
4. Permissions: Read & Write
5. Save the token (you'll need it for GitHub Secrets)

### GitHub Repository Secrets
Add these secrets in your repo: **Settings → Secrets and variables → Actions → New repository secret**

| Secret Name       | Description                          | Example Value                     |
|-------------------|--------------------------------------|-----------------------------------|
| DOCKER_USERNAME   | Docker Hub username                  | `laksanadika`                     |
| DOCKER_PASSWORD   | Docker Hub access token (not password!) | `dckr_pat_abc123...`           |
| SSH_HOST          | Droplet IP address                   | `157.245.123.45`                  |
| SSH_USER          | SSH user (typically `root`)          | `root`                            |
| SSH_KEY           | Private SSH key (see below)          | `-----BEGIN OPENSSH PRIVATE KEY---` |

**Generate SSH key for GitHub Actions:**
```bash
ssh-keygen -t ed25519 -C "github-actions-manris" -f ~/.ssh/manris_deploy
cat ~/.ssh/manris_deploy      # This is SSH_KEY secret (private key)
cat ~/.ssh/manris_deploy.pub  # Add this to Droplet's authorized_keys
```

**Add public key to Droplet:**
```bash
ssh root@YOUR_DROPLET_IP
mkdir -p ~/.ssh
echo "YOUR_PUBLIC_KEY" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

---

## First-Time Deployment

### Step 1: Provision the Droplet
Run the automated setup script from your local machine:

```bash
ssh root@YOUR_DROPLET_IP 'bash -s' < scripts/setup-server.sh
```

This installs Docker, creates directories, and configures the firewall.

### Step 2: Prepare Configuration Files

**On your local machine:**

1. **Copy environment template:**
   ```bash
   cp .env.example .env.production
   ```

2. **Edit `.env.production` with production values:**
   ```bash
   # Generate strong password
   POSTGRES_PASSWORD=$(openssl rand -base64 32)
   
   # Generate JWT secret
   JWT_SECRET=$(openssl rand -base64 32)
   
   # Set OpenAI API key
   OPENAI_API_KEY=sk-your-real-openai-key-here
   
   # Verify CORS_ORIGINS matches your domain
   CORS_ORIGINS=https://manris.marvcore.com
   ```

3. **Upload files to Droplet:**
   ```bash
   scp docker-compose.yml root@YOUR_DROPLET_IP:/opt/manris/
   scp .env.production root@YOUR_DROPLET_IP:/opt/manris/
   scp -r nginx/ root@YOUR_DROPLET_IP:/opt/manris/
   ```

### Step 3: Initial HTTP Setup (Pre-SSL)

SSH into the Droplet:
```bash
ssh root@YOUR_DROPLET_IP
cd /opt/manris
```

Use HTTP-only nginx config for initial setup:
```bash
cp nginx/conf.d/default.conf.initial nginx/conf.d/default.conf
```

Pull images and start services:
```bash
docker compose pull
docker compose up -d
```

Verify services are running:
```bash
docker compose ps
docker compose logs backend
```

### Step 4: Obtain SSL Certificates

Request Let's Encrypt certificates:
```bash
docker compose run --rm certbot certonly --webroot \
  -w /var/www/certbot \
  -d api-manris.marvcore.com \
  -d manris.marvcore.com \
  --email your@email.com \
  --agree-tos
```

**Troubleshooting:**
- If this fails, verify DNS is propagated: `dig api-manris.marvcore.com +short`
- Check nginx logs: `docker compose logs nginx`
- Verify HTTP is accessible: `curl -I http://api-manris.marvcore.com`

### Step 5: Enable SSL Configuration

Restore SSL-enabled nginx config from git:
```bash
git checkout nginx/conf.d/default.conf
docker compose exec nginx nginx -s reload
```

Verify HTTPS works:
```bash
curl -I https://api-manris.marvcore.com/api/health
curl -I https://manris.marvcore.com
```

### Step 6: Set Up Automatic Renewal

Add cron job for cert renewal (runs every 60 days):
```bash
(crontab -l 2>/dev/null; echo "0 0 */60 * * cd /opt/manris && docker compose run --rm certbot renew && docker compose exec nginx nginx -s reload") | crontab -
```

Verify cron job:
```bash
crontab -l
```

---

## Subsequent Deployments (Automated)

After the first deployment, every push to the `main` branch triggers automatic deployment via GitHub Actions.

**Workflow:**
1. Developer pushes code to `main` branch
2. GitHub Actions builds Docker images (tagged with `:latest` and `:$GITHUB_SHA`)
3. Images are pushed to Docker Hub
4. GitHub Actions SSHs into Droplet and runs:
   ```bash
   cd /opt/manris
   docker compose pull backend frontend
   docker compose up -d --no-deps backend frontend
   docker image prune -f
   ```

**Monitor deployment:**
- GitHub Actions: Repository → Actions tab
- Droplet logs: `ssh root@YOUR_DROPLET_IP 'cd /opt/manris && docker compose logs -f'`

---

## Rollback Procedure

If a deployment breaks production, rollback to a previous version:

### Option 1: Rollback to Specific Commit
```bash
ssh root@YOUR_DROPLET_IP
cd /opt/manris

# Find the commit SHA from GitHub Actions history
docker compose stop backend frontend
docker compose pull laksanadika/manris-backend:abc123  # Replace with git SHA
docker compose pull laksanadika/manris-frontend:abc123

# Update docker-compose.yml to use :abc123 tags temporarily
docker compose up -d backend frontend
```

### Option 2: Rollback to Previous `:latest`
```bash
ssh root@YOUR_DROPLET_IP
cd /opt/manris

# Docker Hub keeps previous :latest as a separate layer
docker compose pull backend frontend
docker compose up -d backend frontend
```

**Verify rollback:**
```bash
docker compose ps
curl https://api-manris.marvcore.com/api/health
```

---

## Database Management

### Backup Database
```bash
ssh root@YOUR_DROPLET_IP
cd /opt/manris

# Create timestamped backup
docker compose exec postgres pg_dump -U manris manris > backup_$(date +%Y%m%d_%H%M%S).sql

# Download to local machine
scp root@YOUR_DROPLET_IP:/opt/manris/backup_*.sql ./backups/
```

**Automated daily backups (cron):**
```bash
# Add to crontab
0 2 * * * cd /opt/manris && docker compose exec -T postgres pg_dump -U manris manris > backup_$(date +\%Y\%m\%d).sql && find . -name "backup_*.sql" -mtime +7 -delete
```

### Restore Database
```bash
ssh root@YOUR_DROPLET_IP
cd /opt/manris

# Stop backend to prevent writes
docker compose stop backend

# Restore from backup
cat backup_20260419_020000.sql | docker compose exec -T postgres psql -U manris manris

# Restart backend
docker compose start backend
```

### Run Migrations Manually
If migrations fail during deployment:
```bash
docker compose exec backend /app/server migrate up
docker compose logs backend
```

---

## Monitoring & Logs

### View Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f nginx

# Last 100 lines
docker compose logs --tail=100 backend
```

### Check Service Status
```bash
docker compose ps
docker compose top
```

### Resource Usage
```bash
# Container stats
docker stats

# Disk usage
docker system df
df -h
```

### Health Checks
```bash
# Backend API
curl https://api-manris.marvcore.com/api/health

# Frontend
curl -I https://manris.marvcore.com

# Database connection
docker compose exec postgres psql -U manris -d manris -c "SELECT version();"
```

---

## Troubleshooting

### Issue: Port 80/443 already in use
```bash
# Find process using port
sudo lsof -i :80
sudo lsof -i :443

# Kill conflicting process
sudo systemctl stop apache2  # If Apache is running
```

### Issue: Database migration fails
```bash
# Check postgres logs
docker compose logs postgres

# Manually connect to database
docker compose exec postgres psql -U manris -d manris

# Force migration version (if dirty state)
docker compose exec backend /app/server migrate force <version>
```

### Issue: SSL certificate renewal fails
```bash
# Check certbot logs
docker compose logs certbot

# Manually renew
docker compose run --rm certbot renew --dry-run  # Test first
docker compose run --rm certbot renew
docker compose exec nginx nginx -s reload
```

### Issue: Out of disk space
```bash
# Check disk usage
df -h
docker system df

# Clean up unused images/containers
docker system prune -a
docker volume prune

# Remove old backups
find /opt/manris -name "backup_*.sql" -mtime +30 -delete
```

### Issue: Backend can't connect to database
```bash
# Verify DATABASE_URL in .env.production
cat /opt/manris/.env.production | grep DATABASE_URL

# Check if postgres is healthy
docker compose ps postgres

# Check network connectivity
docker compose exec backend ping postgres
```

### Issue: 502 Bad Gateway
```bash
# Check backend is running
docker compose ps backend

# Check backend logs
docker compose logs backend

# Verify nginx upstream config
docker compose exec nginx cat /etc/nginx/conf.d/default.conf
```

---

## Security Checklist

- [ ] `.env.production` has strong passwords (32+ char random strings)
- [ ] `.env.production` is never committed to git (verify `.gitignore`)
- [ ] UFW firewall is enabled (ports 22, 80, 443 only)
- [ ] SSH key authentication is enabled (password auth disabled)
- [ ] SSL certificates are auto-renewing (cron job active)
- [ ] Database is not exposed to public internet (internal network only)
- [ ] Docker images are pulled from trusted registry (Docker Hub)
- [ ] GitHub Secrets are properly configured (no hardcoded credentials in workflow)

---

## Maintenance Tasks

### Weekly
- [ ] Check disk space: `df -h`
- [ ] Review logs for errors: `docker compose logs --tail=200`
- [ ] Verify backups exist: `ls -lh /opt/manris/backup_*.sql`

### Monthly
- [ ] Update system packages: `apt-get update && apt-get upgrade -y`
- [ ] Clean Docker resources: `docker system prune`
- [ ] Test database restore from backup
- [ ] Review GitHub Actions usage/costs

### Quarterly
- [ ] Update Docker images to latest versions
- [ ] Review and rotate secrets (JWT_SECRET, database passwords)
- [ ] Audit access logs
- [ ] Load testing and performance review

---

## Support & Resources

- **Backend Logs**: `/opt/manris/backend/logs`
- **Frontend Logs**: `docker compose logs frontend`
- **nginx Logs**: `docker compose logs nginx`
- **Database Logs**: `docker compose logs postgres`
- **GitHub Actions**: Repository → Actions tab
- **Docker Hub**: https://hub.docker.com/u/laksanadika

**Emergency Contacts:**
- DevOps Lead: [Your Contact]
- Database Admin: [Your Contact]

---

## Appendix: Manual Deployment (Without GitHub Actions)

If GitHub Actions is unavailable:

```bash
# On local machine - build images
docker build -t laksanadika/manris-backend:manual ./backend
docker build -t laksanadika/manris-frontend:manual ./frontend

# Push to Docker Hub
docker push laksanadika/manris-backend:manual
docker push laksanadika/manris-frontend:manual

# On Droplet - deploy
ssh root@YOUR_DROPLET_IP
cd /opt/manris
docker compose pull
# Edit docker-compose.yml to use :manual tags
docker compose up -d backend frontend
```

---

**Last Updated**: April 2026  
**Version**: 1.0  
**Maintained by**: Manris v2 Team
