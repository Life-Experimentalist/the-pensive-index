# Admin System Deployment Guide

## Overview

This guide covers the complete deployment process for The Pensieve Index admin system, including production setup, security configuration, monitoring, and maintenance procedures.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Configuration](#database-configuration)
4. [Security Configuration](#security-configuration)
5. [Application Deployment](#application-deployment)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Monitoring and Alerting](#monitoring-and-alerting)
8. [Backup and Recovery](#backup-and-recovery)
9. [Maintenance Procedures](#maintenance-procedures)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

**Minimum Requirements**:
- **CPU**: 2 cores, 2.4 GHz
- **RAM**: 4 GB
- **Storage**: 20 GB SSD
- **Network**: 1 Gbps connection
- **OS**: Ubuntu 20.04 LTS or newer

**Recommended for Production**:
- **CPU**: 4 cores, 3.0 GHz
- **RAM**: 8 GB
- **Storage**: 50 GB SSD with backup storage
- **Network**: 10 Gbps connection
- **OS**: Ubuntu 22.04 LTS

### Software Dependencies

```bash
# Node.js and npm
node --version  # v18.0.0 or higher
npm --version   # v9.0.0 or higher

# Database
sqlite3 --version  # 3.31.1 or higher

# Process Manager
pm2 --version  # 5.0.0 or higher

# Web Server
nginx -v  # 1.18.0 or higher

# SSL/TLS
certbot --version  # 1.21.0 or higher
```

### Network and DNS

- **Domain Name**: Configured with proper DNS records
- **SSL Certificate**: Valid certificate for HTTPS
- **Firewall**: Properly configured ports (80, 443, 22)
- **CDN**: Optional but recommended for static assets

## Environment Setup

### 1. Server Preparation

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git build-essential

# Install Node.js (using NodeSource repository)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 process manager
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx
```

### 2. User and Directory Setup

```bash
# Create application user
sudo useradd -m -s /bin/bash pensieve
sudo usermod -aG sudo pensieve

# Create application directory
sudo mkdir -p /var/www/pensieve-index
sudo chown pensieve:pensieve /var/www/pensieve-index

# Switch to application user
sudo su - pensieve
```

### 3. Environment Variables

Create production environment configuration:

```bash
# Create .env.production file
cd /var/www/pensieve-index
cat > .env.production << EOF
# Application
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_URL=https://admin.pensieve-index.com

# Database
DATABASE_URL="file:/var/www/pensieve-index/data/production.db"
DATABASE_BACKUP_PATH="/var/www/pensieve-index/backups"

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_your_key_here
CLERK_SECRET_KEY=sk_live_your_secret_here
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/admin
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/admin

# Admin Configuration
ADMIN_SECRET_KEY=your_secure_admin_secret_here
SUPER_ADMIN_EMAIL=super@pensieve-index.com
DEFAULT_ADMIN_PASSWORD=temp_secure_password_change_immediately

# Security
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=https://admin.pensieve-index.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Email Configuration
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@pensieve-index.com
SMTP_PASS=your_smtp_password
FROM_EMAIL=noreply@pensieve-index.com

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090
LOG_LEVEL=info

# Backup
BACKUP_SCHEDULE="0 2 * * *"  # Daily at 2 AM
BACKUP_RETENTION_DAYS=30
EOF

# Secure the environment file
chmod 600 .env.production
```

## Database Configuration

### 1. Database Setup

```bash
# Create data directory
mkdir -p /var/www/pensieve-index/data
mkdir -p /var/www/pensieve-index/backups

# Initialize database
cd /var/www/pensieve-index
npm run db:migrate:prod

# Verify database creation
ls -la data/
# Should show: production.db

# Test database connection
npm run db:health
```

### 2. Database Optimization

```sql
-- production-optimization.sql
-- Connect to database and run these optimizations

-- Enable WAL mode for better concurrent access
PRAGMA journal_mode=WAL;

-- Optimize cache size (adjust based on available RAM)
PRAGMA cache_size=10000;

-- Enable foreign key constraints
PRAGMA foreign_keys=ON;

-- Set synchronous mode for production balance
PRAGMA synchronous=NORMAL;

-- Optimize page size
PRAGMA page_size=4096;

-- Auto-vacuum for maintenance
PRAGMA auto_vacuum=INCREMENTAL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role, status);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
```

### 3. Initial Data Setup

```bash
# Create super admin user
npm run setup:super-admin

# Seed initial data (if needed)
npm run db:seed:prod

# Verify setup
npm run admin:verify-setup
```

## Security Configuration

### 1. Firewall Setup

```bash
# Configure UFW (Uncomplicated Firewall)
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (adjust port if using non-standard)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow application port (only from localhost)
sudo ufw allow from 127.0.0.1 to any port 3000

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status verbose
```

### 2. SSL Certificate

```bash
# Generate SSL certificate with Certbot
sudo certbot --nginx -d admin.pensieve-index.com

# Verify certificate
sudo certbot certificates

# Test auto-renewal
sudo certbot renew --dry-run
```

### 3. Security Headers

Configure Nginx with security headers:

```nginx
# /etc/nginx/sites-available/pensieve-admin
server {
    listen 80;
    server_name admin.pensieve-index.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name admin.pensieve-index.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/admin.pensieve-index.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/admin.pensieve-index.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://clerk.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.clerk.com;";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=admin_login:10m rate=5r/m;
    limit_req_zone $binary_remote_addr zone=admin_api:10m rate=30r/m;

    # Gzip Configuration
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Main application
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }

    # API Rate Limiting
    location /api/ {
        limit_req zone=admin_api burst=10 nodelay;
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Login Rate Limiting
    location /sign-in {
        limit_req zone=admin_login burst=3 nodelay;
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check endpoint (no rate limiting)
    location /api/health {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        access_log off;
    }

    # Static assets
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Favicon
    location /favicon.ico {
        proxy_pass http://127.0.0.1:3000;
        expires 1d;
        add_header Cache-Control "public";
    }
}
```

## Application Deployment

### 1. Code Deployment

```bash
# Clone repository
cd /var/www/pensieve-index
git clone https://github.com/your-org/the-pensive-index.git .

# Or update existing deployment
git pull origin main

# Install dependencies
npm ci --production

# Build application
NODE_ENV=production npm run build

# Verify build
ls -la .next/
# Should show built application
```

### 2. PM2 Configuration

Create PM2 ecosystem file:

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'pensieve-admin',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/pensieve-index',
    instances: 2, // Adjust based on CPU cores
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_file: '.env.production',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: '/var/log/pensieve/error.log',
    out_file: '/var/log/pensieve/out.log',
    log_file: '/var/log/pensieve/combined.log',
    time: true,
    autorestart: true,
    max_restarts: 5,
    min_uptime: '30s',
    max_memory_restart: '1G',
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
    shutdown_with_message: true
  }],

  deploy: {
    production: {
      user: 'pensieve',
      host: 'admin.pensieve-index.com',
      ref: 'origin/main',
      repo: 'https://github.com/your-org/the-pensive-index.git',
      path: '/var/www/pensieve-index',
      'pre-deploy-local': '',
      'post-deploy': 'npm ci --production && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
```

### 3. Service Management

```bash
# Create log directory
sudo mkdir -p /var/log/pensieve
sudo chown pensieve:pensieve /var/log/pensieve

# Start application with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
# Follow the instructions provided by the command

# Check application status
pm2 status
pm2 logs pensieve-admin
```

### 4. Nginx Configuration

```bash
# Enable site configuration
sudo ln -s /etc/nginx/sites-available/pensieve-admin /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Enable Nginx service
sudo systemctl enable nginx
```

## Post-Deployment Verification

### 1. Health Checks

```bash
# Test application health
curl -f http://localhost:3000/api/health

# Test SSL certificate
curl -f https://admin.pensieve-index.com/api/health

# Test authentication endpoints
curl -f https://admin.pensieve-index.com/api/admin/auth/verify

# Test database connectivity
curl -f https://admin.pensieve-index.com/api/admin/system/health
```

### 2. Functional Testing

Create a deployment verification script:

```bash
#!/bin/bash
# verify-deployment.sh

echo "🔍 Starting deployment verification..."

# Test 1: Basic connectivity
echo "Testing basic connectivity..."
if curl -f -s https://admin.pensieve-index.com/api/health > /dev/null; then
    echo "✅ Basic connectivity: PASS"
else
    echo "❌ Basic connectivity: FAIL"
    exit 1
fi

# Test 2: Database health
echo "Testing database connectivity..."
if curl -f -s https://admin.pensieve-index.com/api/admin/system/health | grep -q "healthy"; then
    echo "✅ Database health: PASS"
else
    echo "❌ Database health: FAIL"
    exit 1
fi

# Test 3: Authentication system
echo "Testing authentication system..."
if curl -f -s https://admin.pensieve-index.com/sign-in | grep -q "sign-in"; then
    echo "✅ Authentication system: PASS"
else
    echo "❌ Authentication system: FAIL"
    exit 1
fi

# Test 4: Admin panel access
echo "Testing admin panel..."
if curl -f -s https://admin.pensieve-index.com/admin | grep -q "admin\|unauthorized"; then
    echo "✅ Admin panel: PASS"
else
    echo "❌ Admin panel: FAIL"
    exit 1
fi

# Test 5: SSL certificate
echo "Testing SSL certificate..."
if openssl s_client -connect admin.pensieve-index.com:443 -servername admin.pensieve-index.com < /dev/null 2>/dev/null | openssl x509 -noout -dates; then
    echo "✅ SSL certificate: PASS"
else
    echo "❌ SSL certificate: FAIL"
    exit 1
fi

echo "🎉 All verification tests passed!"
```

### 3. Performance Testing

```bash
# Test response times
echo "Testing response times..."
curl -w "@curl-format.txt" -o /dev/null -s https://admin.pensieve-index.com/

# Create curl-format.txt
cat > curl-format.txt << EOF
     time_namelookup:  %{time_namelookup}\n
        time_connect:  %{time_connect}\n
     time_appconnect:  %{time_appconnect}\n
    time_pretransfer:  %{time_pretransfer}\n
       time_redirect:  %{time_redirect}\n
  time_starttransfer:  %{time_starttransfer}\n
                     ----------\n
          time_total:  %{time_total}\n
EOF

# Load testing (if available)
# ab -n 100 -c 10 https://admin.pensieve-index.com/api/health
```

## Monitoring and Alerting

### 1. Application Monitoring

Create monitoring script:

```bash
#!/bin/bash
# monitor-admin.sh

LOG_FILE="/var/log/pensieve/monitor.log"
ALERT_EMAIL="admin@pensieve-index.com"

check_service() {
    local service_name=$1
    local endpoint=$2

    if curl -f -s "$endpoint" > /dev/null; then
        echo "$(date): $service_name is healthy" >> $LOG_FILE
        return 0
    else
        echo "$(date): $service_name is DOWN" >> $LOG_FILE
        echo "ALERT: $service_name is down at $(date)" | mail -s "Service Alert: $service_name Down" $ALERT_EMAIL
        return 1
    fi
}

# Check main application
check_service "Main Application" "https://admin.pensieve-index.com/api/health"

# Check database
check_service "Database" "https://admin.pensieve-index.com/api/admin/system/health"

# Check PM2 processes
if pm2 list | grep -q "online"; then
    echo "$(date): PM2 processes are running" >> $LOG_FILE
else
    echo "$(date): PM2 processes are DOWN" >> $LOG_FILE
    echo "ALERT: PM2 processes are down at $(date)" | mail -s "Service Alert: PM2 Down" $ALERT_EMAIL
fi

# Check disk space
DISK_USAGE=$(df /var/www/pensieve-index | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "$(date): Disk usage is at $DISK_USAGE%" >> $LOG_FILE
    echo "ALERT: Disk usage is at $DISK_USAGE% at $(date)" | mail -s "Disk Space Alert" $ALERT_EMAIL
fi
```

### 2. Log Rotation

```bash
# Create logrotate configuration
sudo tee /etc/logrotate.d/pensieve-admin << EOF
/var/log/pensieve/*.log {
    daily
    missingok
    rotate 30
    compress
    notifempty
    create 644 pensieve pensieve
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
```

### 3. System Metrics

```bash
# Install system monitoring
sudo apt install -y htop iotop

# Create system status script
cat > /home/pensieve/system-status.sh << 'EOF'
#!/bin/bash
echo "=== System Status Report ==="
echo "Date: $(date)"
echo ""

echo "=== CPU Usage ==="
top -bn1 | grep "Cpu(s)" | awk '{print $2 + $4"%"}'

echo ""
echo "=== Memory Usage ==="
free -h

echo ""
echo "=== Disk Usage ==="
df -h /var/www/pensieve-index

echo ""
echo "=== PM2 Status ==="
pm2 status

echo ""
echo "=== Recent Errors ==="
tail -n 5 /var/log/pensieve/error.log

echo ""
echo "=== Network Connections ==="
netstat -tuln | grep :3000
EOF

chmod +x /home/pensieve/system-status.sh
```

## Backup and Recovery

### 1. Automated Backup

Create backup script:

```bash
#!/bin/bash
# backup-admin.sh

BACKUP_DIR="/var/www/pensieve-index/backups"
DB_PATH="/var/www/pensieve-index/data/production.db"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="admin_backup_$DATE"
RETENTION_DAYS=30

echo "Starting backup at $(date)"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Create database backup
echo "Backing up database..."
sqlite3 $DB_PATH ".backup $BACKUP_DIR/${BACKUP_NAME}.db"

# Create configuration backup
echo "Backing up configuration..."
tar -czf "$BACKUP_DIR/${BACKUP_NAME}_config.tar.gz" \
    .env.production \
    ecosystem.config.js \
    /etc/nginx/sites-available/pensieve-admin

# Create application backup (optional)
echo "Backing up application files..."
tar -czf "$BACKUP_DIR/${BACKUP_NAME}_app.tar.gz" \
    --exclude=node_modules \
    --exclude=.next \
    --exclude=data \
    --exclude=backups \
    .

# Clean old backups
echo "Cleaning old backups..."
find $BACKUP_DIR -name "admin_backup_*" -type f -mtime +$RETENTION_DAYS -delete

# Verify backup
if sqlite3 "$BACKUP_DIR/${BACKUP_NAME}.db" "SELECT COUNT(*) FROM users;" > /dev/null 2>&1; then
    echo "✅ Database backup verified successfully"
else
    echo "❌ Database backup verification failed"
    exit 1
fi

echo "Backup completed successfully at $(date)"

# Optional: Upload to remote storage
# aws s3 cp "$BACKUP_DIR/${BACKUP_NAME}.db" s3://your-backup-bucket/
# rsync -av "$BACKUP_DIR/${BACKUP_NAME}.db" user@backup-server:/backups/
```

### 2. Backup Scheduling

```bash
# Add to crontab
crontab -e

# Add this line for daily backup at 2 AM
0 2 * * * /var/www/pensieve-index/scripts/backup-admin.sh >> /var/log/pensieve/backup.log 2>&1

# Weekly full system backup at 3 AM on Sundays
0 3 * * 0 /var/www/pensieve-index/scripts/full-backup.sh >> /var/log/pensieve/backup.log 2>&1
```

### 3. Recovery Procedures

Create recovery script:

```bash
#!/bin/bash
# restore-admin.sh

BACKUP_DIR="/var/www/pensieve-index/backups"
DB_PATH="/var/www/pensieve-index/data/production.db"

if [ $# -eq 0 ]; then
    echo "Usage: $0 <backup_filename>"
    echo "Available backups:"
    ls -la $BACKUP_DIR/*.db | awk '{print $9}' | xargs -n 1 basename
    exit 1
fi

BACKUP_FILE="$BACKUP_DIR/$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file $BACKUP_FILE not found"
    exit 1
fi

echo "⚠️  WARNING: This will replace the current database!"
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Recovery cancelled"
    exit 1
fi

# Stop application
echo "Stopping application..."
pm2 stop pensieve-admin

# Backup current database
echo "Creating safety backup of current database..."
cp "$DB_PATH" "$DB_PATH.pre-restore.$(date +%Y%m%d_%H%M%S)"

# Restore database
echo "Restoring database from $BACKUP_FILE..."
cp "$BACKUP_FILE" "$DB_PATH"

# Verify restoration
echo "Verifying database..."
if sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM users;" > /dev/null 2>&1; then
    echo "✅ Database restoration verified"
else
    echo "❌ Database restoration failed"
    exit 1
fi

# Restart application
echo "Starting application..."
pm2 start pensieve-admin

echo "✅ Recovery completed successfully"
echo "Please verify the application is working correctly"
```

## Maintenance Procedures

### 1. Regular Maintenance Tasks

#### Daily Tasks (Automated)
```bash
#!/bin/bash
# daily-maintenance.sh

echo "=== Daily Maintenance - $(date) ==="

# Check service health
./monitor-admin.sh

# Rotate logs if needed
sudo logrotate -f /etc/logrotate.d/pensieve-admin

# Check disk space
df -h /var/www/pensieve-index

# Clean temporary files
find /tmp -name "pensieve-*" -mtime +1 -delete

# Check for security updates
apt list --upgradable | grep -i security

echo "Daily maintenance completed"
```

#### Weekly Tasks
```bash
#!/bin/bash
# weekly-maintenance.sh

echo "=== Weekly Maintenance - $(date) ==="

# Update system packages
sudo apt update
sudo apt list --upgradable

# Analyze database
sqlite3 /var/www/pensieve-index/data/production.db "ANALYZE;"

# Check PM2 process health
pm2 show pensieve-admin

# Review error logs
echo "Recent errors:"
tail -n 20 /var/log/pensieve/error.log

# Test backup restoration (on staging)
# ./test-backup-restore.sh

echo "Weekly maintenance completed"
```

#### Monthly Tasks
```bash
#!/bin/bash
# monthly-maintenance.sh

echo "=== Monthly Maintenance - $(date) ==="

# Full system backup
./full-backup.sh

# Database optimization
sqlite3 /var/www/pensieve-index/data/production.db "VACUUM; REINDEX;"

# SSL certificate renewal check
sudo certbot renew --dry-run

# Security audit
# npm audit
# Check for outdated dependencies

# Performance review
# Analyze response times and optimize

echo "Monthly maintenance completed"
```

### 2. Update Procedures

#### Application Updates
```bash
#!/bin/bash
# update-application.sh

echo "Starting application update..."

# Backup before update
./backup-admin.sh

# Pull latest code
git fetch origin
git checkout main
git pull origin main

# Update dependencies
npm ci --production

# Run database migrations
npm run db:migrate:prod

# Build application
NODE_ENV=production npm run build

# Restart with zero downtime
pm2 reload pensieve-admin

# Verify deployment
./verify-deployment.sh

echo "Application update completed"
```

#### System Updates
```bash
#!/bin/bash
# update-system.sh

echo "Starting system update..."

# Update package lists
sudo apt update

# Install security updates
sudo apt upgrade -y

# Update Node.js (if needed)
# sudo npm install -g n
# sudo n stable

# Update PM2
sudo npm update -g pm2

# Update Nginx (if needed)
# sudo apt install nginx

# Restart services if required
sudo systemctl daemon-reload
sudo systemctl restart nginx

echo "System update completed"
```

### 3. Security Maintenance

```bash
#!/bin/bash
# security-maintenance.sh

echo "=== Security Maintenance - $(date) ==="

# Check for failed login attempts
echo "Recent failed logins:"
grep "LOGIN_FAILED" /var/log/pensieve/combined.log | tail -n 10

# Check SSL certificate expiry
echo "SSL certificate status:"
openssl x509 -in /etc/letsencrypt/live/admin.pensieve-index.com/cert.pem -noout -dates

# Check for suspicious activities
echo "Checking for suspicious IPs:"
awk '/PERMISSION_DENIED/ {print $1}' /var/log/pensieve/combined.log | sort | uniq -c | sort -nr | head -5

# Update firewall rules if needed
sudo ufw status numbered

# Check for security updates
apt list --upgradable | grep -i security

echo "Security maintenance completed"
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Application Won't Start

**Symptoms:**
- PM2 shows app as "errored"
- Can't connect to application

**Diagnosis:**
```bash
# Check PM2 logs
pm2 logs pensieve-admin

# Check system resources
free -h
df -h

# Check port availability
netstat -tuln | grep :3000
```

**Solutions:**
```bash
# Restart application
pm2 restart pensieve-admin

# If port is in use
sudo fuser -k 3000/tcp
pm2 start pensieve-admin

# If out of memory
pm2 restart pensieve-admin --max-memory-restart 500M
```

#### 2. Database Connection Issues

**Symptoms:**
- Database timeout errors
- "Cannot open database" errors

**Diagnosis:**
```bash
# Check database file permissions
ls -la /var/www/pensieve-index/data/production.db

# Test database connection
sqlite3 /var/www/pensieve-index/data/production.db "SELECT 1;"

# Check disk space
df -h /var/www/pensieve-index
```

**Solutions:**
```bash
# Fix permissions
chown pensieve:pensieve /var/www/pensieve-index/data/production.db
chmod 644 /var/www/pensieve-index/data/production.db

# Repair database if corrupted
sqlite3 /var/www/pensieve-index/data/production.db ".recover" | sqlite3 repaired.db
```

#### 3. SSL Certificate Issues

**Symptoms:**
- Browser security warnings
- "Certificate expired" errors

**Diagnosis:**
```bash
# Check certificate status
sudo certbot certificates

# Test certificate
openssl s_client -connect admin.pensieve-index.com:443 -servername admin.pensieve-index.com
```

**Solutions:**
```bash
# Renew certificate
sudo certbot renew

# Force renewal if needed
sudo certbot renew --force-renewal

# Restart Nginx
sudo systemctl restart nginx
```

### Emergency Recovery

#### Complete System Recovery

```bash
#!/bin/bash
# emergency-recovery.sh

echo "🚨 Starting emergency recovery procedure..."

# Stop all services
pm2 stop all
sudo systemctl stop nginx

# Restore from latest backup
LATEST_BACKUP=$(ls -t /var/www/pensieve-index/backups/*.db | head -1)
echo "Restoring from: $LATEST_BACKUP"
cp "$LATEST_BACKUP" /var/www/pensieve-index/data/production.db

# Reset file permissions
chown -R pensieve:pensieve /var/www/pensieve-index
chmod 644 /var/www/pensieve-index/data/production.db

# Start services
sudo systemctl start nginx
pm2 start pensieve-admin

# Verify recovery
sleep 10
curl -f https://admin.pensieve-index.com/api/health

echo "✅ Emergency recovery completed"
```

#### Rollback Procedure

```bash
#!/bin/bash
# rollback.sh

if [ $# -eq 0 ]; then
    echo "Usage: $0 <commit_hash>"
    exit 1
fi

COMMIT_HASH=$1

echo "Rolling back to commit: $COMMIT_HASH"

# Backup current state
./backup-admin.sh

# Stop application
pm2 stop pensieve-admin

# Rollback code
git checkout $COMMIT_HASH

# Restore dependencies
npm ci --production

# Rebuild
NODE_ENV=production npm run build

# Start application
pm2 start pensieve-admin

# Verify
./verify-deployment.sh

echo "Rollback completed"
```

### Monitoring and Alerts

#### Health Check Script

```bash
#!/bin/bash
# health-check.sh

ENDPOINTS=(
    "https://admin.pensieve-index.com/api/health"
    "https://admin.pensieve-index.com/api/admin/system/health"
)

for endpoint in "${ENDPOINTS[@]}"; do
    if curl -f -s "$endpoint" > /dev/null; then
        echo "✅ $endpoint is healthy"
    else
        echo "❌ $endpoint is down"
        # Send alert
        echo "ALERT: $endpoint is down at $(date)" | mail -s "Health Check Alert" admin@pensieve-index.com
    fi
done
```

#### Performance Monitoring

```bash
#!/bin/bash
# performance-monitor.sh

# CPU usage
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2 + $4}' | cut -d'%' -f1)

# Memory usage
MEM_USAGE=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')

# Disk usage
DISK_USAGE=$(df /var/www/pensieve-index | awk 'NR==2 {print $5}' | sed 's/%//')

# Response time
RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' https://admin.pensieve-index.com/api/health)

echo "Performance Metrics - $(date)"
echo "CPU Usage: ${CPU_USAGE}%"
echo "Memory Usage: ${MEM_USAGE}%"
echo "Disk Usage: ${DISK_USAGE}%"
echo "Response Time: ${RESPONSE_TIME}s"

# Alert thresholds
if (( $(echo "$CPU_USAGE > 80" | bc -l) )); then
    echo "ALERT: High CPU usage: ${CPU_USAGE}%"
fi

if (( $(echo "$MEM_USAGE > 85" | bc -l) )); then
    echo "ALERT: High memory usage: ${MEM_USAGE}%"
fi

if [ "$DISK_USAGE" -gt 90 ]; then
    echo "ALERT: High disk usage: ${DISK_USAGE}%"
fi

if (( $(echo "$RESPONSE_TIME > 5" | bc -l) )); then
    echo "ALERT: Slow response time: ${RESPONSE_TIME}s"
fi
```

This deployment guide provides comprehensive coverage for deploying and maintaining The Pensieve Index admin system in a production environment. Regular review and updates of these procedures will ensure optimal system performance and security.