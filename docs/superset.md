# Apache Superset Integration

Pryntis supports embedded Apache Superset dashboards for advanced analytics beyond the built-in Panel KPIs.

## Overview

- **Panel KPIs**: Executive-level metrics, health scores, insights (built-in)
- **Superset**: Custom SQL queries, advanced charts, pivot tables, scheduled reports

## Setup

### 1. Add Superset to Docker Compose

Create or extend `docker-compose.superset.yml`:

```yaml
version: '3.8'
services:
  superset:
    image: apache/superset:latest
    ports:
      - "8088:8088"
    environment:
      - SUPERSET_SECRET_KEY=your-superset-secret
    depends_on:
      - postgres
    volumes:
      - superset-data:/app/superset_home

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  superset-data:
```

### 2. Initialize Superset

```bash
docker exec -it superset superset db upgrade
docker exec -it superset superset init
docker exec -it superset superset fab create-admin \
  --username admin \
  --firstname Admin \
  --lastname User \
  --email admin@pryntis.io \
  --password admin123
```

### 3. Connect to Pryntis Database

In Superset UI (http://localhost:8088):
1. Go to Data > Databases > + Database
2. SQLAlchemy URI: `postgresql://pryntis_user:pryntis_pass@postgres:5432/pryntis_db`
3. Test connection and save

### 4. Import Default Dashboard

Import the Pryntis dashboard template:
```bash
docker exec -it superset superset import-dashboards -p /path/to/superset-dashboard.json
```

### 5. Configure Pryntis

Add to your `.env`:
```env
SUPERSET_URL=http://localhost:8088
SUPERSET_GUEST_TOKEN_SECRET=your-guest-token-secret
SUPERSET_DASHBOARD_ID=1
```

### 6. Access

Navigate to Admin > Deep Analytics in the Pryntis sidebar. The page will embed the Superset dashboard in an iframe.

## Security

- The Superset embed uses iframe sandboxing (`allow-scripts allow-same-origin`)
- For production, implement Superset guest tokens for secure embedding
- Access is restricted to admin and manager roles via RBAC

## Without Superset

If Superset is not configured, the Deep Analytics page shows:
- Setup instructions
- Feature overview
- Links to built-in Analytics, Business Ops, and Dashboard pages
