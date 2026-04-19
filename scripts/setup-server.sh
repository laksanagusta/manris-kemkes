#!/bin/bash
set -e

# ===========================================
# Manris v2 - Digital Ocean Droplet Setup Script
# ===========================================
# Run this ONCE on a fresh Ubuntu 22.04+ Droplet
# Usage: ssh root@your-droplet-ip 'bash -s' < scripts/setup-server.sh

echo "=== Manris v2 Server Setup ==="
echo ""

# 1. Update system
echo "[1/7] Updating system packages..."
apt-get update && apt-get upgrade -y

# 2. Install Docker
echo "[2/7] Installing Docker Engine..."
curl -fsSL https://get.docker.com | sh

# 3. Verify Docker Compose plugin
echo "[3/7] Verifying Docker Compose..."
docker compose version

# 4. Create app directory
echo "[4/7] Creating application directory..."
mkdir -p /opt/manris
cd /opt/manris

# 5. Create required directories
echo "[5/7] Creating required directories..."
mkdir -p nginx/conf.d certbot/www certbot/conf

# 6. Set up firewall
echo "[6/7] Configuring UFW firewall..."
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw --force enable

# 7. Optional: Create deploy user
echo "[7/7] Setup user configuration..."
echo "Note: Running as root is acceptable for this deployment."
echo "If you prefer a deploy user, create it manually after this script."

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Copy required files to /opt/manris/:"
echo "   - docker-compose.yml"
echo "   - .env.production (from .env.example template)"
echo "   - nginx/ directory (with nginx.conf and conf.d/)"
echo ""
echo "2. Initial HTTP setup (before SSL):"
echo "   cp nginx/conf.d/default.conf.initial nginx/conf.d/default.conf"
echo ""
echo "3. Start services:"
echo "   docker compose up -d"
echo ""
echo "4. Obtain SSL certificates:"
echo "   docker compose run --rm certbot certonly --webroot \\"
echo "     -w /var/www/certbot \\"
echo "     -d api-manris.marvcore.com \\"
echo "     -d manris.marvcore.com \\"
echo "     --email your@email.com \\"
echo "     --agree-tos"
echo ""
echo "5. Switch to SSL nginx config:"
echo "   cp nginx/conf.d/default.conf.ssl nginx/conf.d/default.conf"
echo ""
echo "6. Reload nginx:"
echo "   docker compose exec nginx nginx -s reload"
echo ""
echo "7. Add cert renewal cron job:"
echo "   (crontab -l 2>/dev/null; echo '0 0 */60 * * cd /opt/manris && docker compose run --rm certbot renew && docker compose exec nginx nginx -s reload') | crontab -"
echo ""
echo "See DEPLOY.md for complete deployment guide."
