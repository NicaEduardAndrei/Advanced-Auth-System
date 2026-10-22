# Advanced Auth System

> Full-stack authentication system with email OTP, TOTP 2FA, and JWT session management — built with TypeScript end to end.

![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)

## Features

- Registration with email verification code (OTP)
- Login with 2FA support: **Email**, **TOTP** (Google Authenticator), or **both**
- JWT access/refresh tokens stored in `httpOnly` cookies
- Refresh token rotation with reuse detection
- Password reset with optional session invalidation (`destroySessions`)
- Rate limiting on sensitive endpoints
- TOTP secrets encrypted before storage
- Fully typed (TypeScript) frontend and backend

## Tech Stack

| Layer     | Technology                                         |
|-----------|----------------------------------------------------|
| Frontend  | React 19, Vite, React Router, Axios, qrcode.react  |
| Backend   | Express 5, TypeScript                              |
| Database  | PostgreSQL, Prisma 7 (`@prisma/adapter-pg`)        |
| Auth      | JWT, bcryptjs, otplib, crypto-js, Resend           |

## Project Structure

```
.
├── backend/           # Express API (TypeScript)
│   ├── prisma/        # schema + migrations
│   ├── routes/        # auth routes
│   ├── middleware/    # auth, rate limiting, error handling
│   ├── utils/         # token, otp, email, prisma, config
│   └── types/         # Express type augmentation
└── frontend/          # React app (TypeScript)
    └── src/           # pages, components, contexts, api
```

## Prerequisites

- Node.js 24+
- PostgreSQL running locally

## Installation

1. Clone the repository
2. Install backend dependencies:

   ```bash
   cd backend
   npm install
   ```

3. Create your environment file:

   ```bash
   cp .env.example .env
   ```

   Then fill in the values (see [Environment Variables](#environment-variables)).

4. Set up the database:

   ```bash
   npx prisma migrate dev
   ```

5. Install frontend dependencies:

   ```bash
   cd ../frontend
   npm install
   ```

## Running

```bash
# Backend (http://localhost:5000)
cd backend
npm run dev

# Frontend (http://localhost:5173)
cd frontend
npm run dev
```

## Environment Variables

| Variable             | Description                               |
|----------------------|-------------------------------------------|
| `DATABASE_URL`       | PostgreSQL connection string              |
| `RESEND_API_KEY`     | Resend API key for sending emails         |
| `JWT_ACCESS_SECRET`  | Secret for access tokens (15 min)         |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens (7 days)        |
| `JWT_PENDING_SECRET` | Secret for 2FA pending tokens (5 min)     |
| `TOTP_SECRET`        | Passphrase for encrypting TOTP secrets    |
| `DOMAIN`             | Frontend origin (for CORS)                |
| `PORT`               | Backend port (default `5000`)             |
| `NODE_ENV`           | `development` / `production`              |

## API Endpoints

| Method | Endpoint                                | Request Body | Response |
|--------|------------------------------------------|--------------|----------|
| POST   | `/api/auth/register/send-code`           | `{ email: string }` | `{ message: string }` |
| POST   | `/api/auth/register`                     | `{ email: string, password: string, code: string }` | `{ message: string, user: { id: string, email: string } }` |
| POST   | `/api/auth/login`                        | `{ email: string, password: string }` | `{ message: string, method?: "email" \| "totp" \| "both" }` |
| POST   | `/api/auth/2fa/verify`                   | `{ method: "email" \| "totp", code: string }` | `{ message: string }` |
| POST   | `/api/auth/2fa/send-login-email-code`    | — (uses `pendingToken` cookie) | `{ message: string }` |
| POST   | `/api/auth/refresh`                      | — (uses `refreshToken` cookie) | `{ message: string }` |
| POST   | `/api/auth/logout`                       | — (uses `refreshToken` cookie) | `{ message: string }` |
| GET    | `/api/auth/me`                           | — (uses `accessToken` cookie) | `{ user: { id: string, email: string } }` |
| POST   | `/api/auth/password-reset/send-code`     | `{ email: string, loggedIn: boolean }` | `{ message: string }` |
| POST   | `/api/auth/password-reset`               | `{ email: string, code: string, newPassword: string, destroySessions: boolean, loggedIn: boolean }` | `{ message: string }` |
| POST   | `/api/auth/2fa/enable`                   | `{ method: "email" \| "totp" }` | `{ message: string }` (email) or `{ URI: string }` (totp) |
| POST   | `/api/auth/2fa/confirm-2fa-totp-enable`  | `{ code: string }` | `{ message: string }` |
| POST   | `/api/auth/2fa/confirm-2fa-email-enable` | `{ code: string }` | `{ message: string }` |

> All error responses return `{ message: string }`. Endpoints marked with a cookie require the corresponding `httpOnly` cookie (set during login/2FA).

## How Auth Works

- **accessToken** — JWT, 15 min, `httpOnly` cookie
- **refreshToken** — JWT, 7 days, `httpOnly` cookie, rotated on each refresh
- **pendingToken** — JWT, 5 min, used during the 2FA flow

Passwords are hashed with bcrypt. TOTP secrets are encrypted with AES before storage.

---

> **Note:** This README was drafted with the help of an AI assistant and reviewed/edited by the author.
