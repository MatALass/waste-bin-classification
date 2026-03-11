# BinWatch

<p align="center">
Smart Waste Bin Monitoring Platform
</p>

<p align="center">
A full-stack application to upload waste bin images, analyze their status, and store inspection data for monitoring and analytics.
</p>

<p align="center">

![Node](https://img.shields.io/badge/node.js-20+-green)
![Express](https://img.shields.io/badge/express-backend-lightgrey)
![Supabase](https://img.shields.io/badge/database-supabase-3ECF8E)
![Render](https://img.shields.io/badge/deployment-render-46E3B7)
![License](https://img.shields.io/badge/license-MIT-blue)
![Status](https://img.shields.io/badge/status-active-success)

</p>

---

# Overview

**BinWatch** is a full-stack web application designed to monitor waste container status using image uploads.

The platform allows users to:

- upload images of waste bins
- process inspections through an API
- store inspection data
- access historical observations
- build datasets for operational analytics

This project demonstrates practical engineering skills including:

- full-stack web development  
- API design  
- cloud deployment  
- database integration  
- real-world data pipelines  

---

# Demo

### Application Screenshot

Add a screenshot once available:

docs/screenshots/app.png

Example rendering:

![Application Screenshot](docs/screenshots/app.png)

---

# Architecture

The system follows a simple architecture:

Frontend  
↓  
Node.js API (Express)  
↓  
Supabase Database (PostgreSQL)

### Request Flow

1. User uploads a waste bin image  
2. The frontend sends the request to the API  
3. The Node.js backend processes the request  
4. Inspection data is stored in Supabase  
5. Results are returned to the frontend  

This architecture keeps responsibilities separated between interface, application logic, and storage.

---

# Tech Stack

## Frontend

- HTML  
- CSS  
- JavaScript  

## Backend

- Node.js  
- Express  

## Database

- Supabase  
- PostgreSQL  

## Deployment

- Render  

---

# Repository Structure

binwatch

docs  
 architecture.md  
 deployment.md  

src  
 api-node  
 frontend  

scripts  

data  

.env.example  
LICENSE  
README.md  

---

# API Endpoints

## Upload Inspection

POST /upload

Upload a waste bin image for inspection.

Example response:

{
  "status": "success",
  "prediction": "full",
  "timestamp": "2026-03-11T12:45:00Z"
}

---

## Retrieve Inspection History

GET /inspections

Example response:

[
  {
    "id": 1,
    "status": "full",
    "created_at": "2026-03-10T14:32:00Z"
  }
]

---

# Local Development

Clone the repository

git clone https://github.com/MatALass/binwatch.git  
cd binwatch  

Create environment variables

cp .env.example .env  

Install backend dependencies

cd src/api-node  
npm install  

Run backend

npm run dev  

Start the frontend depending on the setup.

---

# Environment Variables

Example `.env` configuration

NODE_ENV=development  
PORT=3000  

SUPABASE_URL=your_supabase_project_url  
SUPABASE_KEY=your_supabase_anon_key  

FRONTEND_URL=http://localhost:5173  

---

# Deployment

The backend service is deployed using **Render**.

Deployment steps:

1. Push the repository to GitHub  
2. Connect the repository to Render  
3. Configure environment variables  
4. Deploy the Node.js service  

See `docs/deployment.md` for more details.

---

# Future Improvements

Planned improvements include:

- analytics dashboard  
- authentication  
- monitoring and logging  
- automated testing  
- CI/CD pipeline  
- machine learning classification  

---

# Use Cases

Possible real-world applications:

- smart city waste monitoring  
- operational inspection tracking  
- dataset generation for computer vision  
- environmental analytics  

---

# License

This project is licensed under the **MIT License**.

See the LICENSE file for details.
