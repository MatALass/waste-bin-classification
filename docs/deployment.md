# Deployment

## Overview

BinWatch uses a simple cloud deployment architecture.

Backend: Render  
Database: Supabase

This setup allows deployment without managing infrastructure manually.

---

# Backend Deployment

Steps:

1. push repository to GitHub
2. create a new Web Service on Render
3. connect GitHub repository
4. configure build command


npm install


5. configure start command


node src/api-node/server.js


6. configure environment variables
7. deploy

---

# Environment Variables

Required variables:


SUPABASE_URL
SUPABASE_KEY
PORT
NODE_ENV


These are configured inside the Render dashboard.

---

# Database

Supabase provides:

- hosted PostgreSQL
- database dashboard
- API access
- authentication capabilities

Inspection data is stored inside Supabase tables.

---

# Production Improvements

Possible improvements:

- CI/CD pipeline
- monitoring
- logging
- authentication
- rate limiting