# Architecture

## Overview

BinWatch is built as a simple cloud application composed of three main components:

- frontend interface
- Node.js backend API
- Supabase database

This separation keeps the system maintainable and scalable.

---

# Components

## Frontend

Responsibilities:

- image upload
- displaying inspection results
- displaying inspection history
- communicating with backend API

---

## Backend API

Node.js with Express.

Responsibilities:

- receiving image uploads
- validating requests
- storing inspection data
- communicating with Supabase
- returning responses to frontend

---

## Database

Supabase provides:

- managed PostgreSQL
- hosted infrastructure
- API layer
- dashboard for data management

Inspection results are stored in database tables.

---

# Request Flow

1. user uploads image
2. frontend sends request to API
3. API validates request
4. API stores inspection in database
5. response returned to frontend

---

# Design Principles

The architecture prioritizes:

- simplicity
- clear separation of concerns
- easy cloud deployment
- data accessibility for analytics