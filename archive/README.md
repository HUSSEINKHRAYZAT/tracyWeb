# Archive Folder

This folder contains files and directories that are not required for the web application runtime.

## Contents:

- **docs/** - Documentation files and guides
- **frontend/** - Unused frontend framework code (app uses vanilla JS in public/)
- **shared/** - Shared utilities (not currently used)
- **images/** - Image assets (not in use, public/images is used instead)
- **infrastructure/** - Docker, Kubernetes, Terraform configs (for future deployment)
- **DATABASE-ACCESS.md** - Database access documentation
- **SECURITY-MODEL.md** - Security documentation
- **docker-compose.prod.yml** - Production Docker Compose config
- **netlify.toml** - Netlify deployment config
- **nginx.conf** - Nginx configuration
- **render.yaml** - Render deployment config

## Active Web Application Files:

The running website uses only:
- `backend/` - Node.js API server
- `public/` - Frontend HTML/CSS/JS files
- `database/` - Database schema and migrations
- `scripts/` - Server start/stop scripts
