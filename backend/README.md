# Vytalis Media CRM - Backend API

Internal CRM backend services for Vytalis Media built with Node.js, Express, MongoDB, and Redis.

## Tech Stack
- Node.js & Express.js (ES Modules)
- MongoDB & Mongoose
- Redis (ioredis & rate-limiter-flexible)
- JWT & HttpOnly Cookies
- Zod Request Validation
- Helmet & CORS Security

## Setup & Running

1. Copy `.env.example` to `.env` and fill in secrets:
   ```bash
   cp .env.example .env
   ```
2. Start MongoDB and Redis instances.
3. Run development server:
   ```bash
   npm run dev
   ```

## Auth Endpoints
- `POST /api/auth/admin/signup`: Create initial admin accounts (Max 5, Access Key required).
- `POST /api/auth/signup`: Open team signup (Defaults to `pending` status).
- `POST /api/auth/signin`: Single signin endpoint for active admin and team members.
- `POST /api/auth/signout`: Clears authentication session cookie.
- `GET /api/auth/me`: Retrieve currently authenticated user profile.
