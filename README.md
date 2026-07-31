# Dilip Da — Food Ordering Platform

![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss)
![License](https://img.shields.io/badge/License-Private-red)

A food-ordering platform for the CIT Kokrajhar campus ("Dilip Da" homestyle kitchen) with **Hostel Delivery** and **Take Away**, role-based dashboards, Razorpay/COD payments, and **Telegram order management** for the restaurant owner.

## Live

| What | Where |
|---|---|
| Production site | `https://dilip-da-ecom-mu.vercel.app` |
| GitHub repo | `https://github.com/itzsubham2006/Dilip-Da-Ecom` |
| Vercel project | `dilip-da-ecom` (team `itzsubham2006s-projects`) |

## Features

- **Ordering** — Browse menu, search, favorites (persisted wishlist), persisted cart with fly-to-cart animation, delivery fee + tax calculation
- **Order types** — 🚚 **Hostel Delivery** (address + Cash on Delivery allowed) or 🥡 **Take Away** (pickup at restaurant, prepaid only)
- **Checkout** — Razorpay (cards/UPI/NetBanking + PhonePe & Google Pay quick buttons) or Cash on Delivery
- **OTP signup** — 3-step signup with email OTP (SHA-256 hashed, 10 min expiry, rate limited); login restricted to CIT (`@cit.ac.in`) accounts
- **Order tracking** — Live status timeline, 2-minute cancellation window after placing, tracking code (`DD-XXXXXXX`), order detail auto-refreshes every 15s
- **Telegram management** — New orders sent to the owner's Telegram chat with inline buttons (Accept / Preparing / Reject / Ready / Out for Delivery / Delivered / Complete); the message updates in place with the next set of buttons
- **Auto-refresh** — Order lists and dashboards silently refresh every 30s (15s on order detail) without reloading the page
- **Role dashboards** — Student (orders), Merchant (analytics, products, categories, inventory, orders, settings), Admin (users, students, merchants, orders, payments, audit logs, settings)
- **Admin overview** — 19-query dashboard stats (users, merchants, orders, revenue today/weekly/monthly, recent activity)

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, React 19, Server Actions) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| Database / Auth | Supabase (PostgreSQL + RLS + Auth) |
| Client state | Zustand 5 (cart, favorites, auth) |
| Validation | Zod 4 |
| Payments | Razorpay (checkout.js + REST order creation) |
| Notifications | Telegram Bot API (inline-button webhook) + Nodemailer SMTP email |
| Tests | Vitest (unit), Playwright (E2E) |
| CI/CD | GitHub Actions + Vercel (Git integration) |

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Create environment
cp .env.example .env.local
# Fill in Supabase URL + keys (and optionally Razorpay, Telegram, SMTP)

# 3. Set up the database
# Open the Supabase SQL Editor and run every SQL script listed in SETUP.md (in order)

# 4. Start developing
npm run dev
```

> **First time here?** Follow **SETUP.md** — it contains every link, SQL script, and command (webhook registration, seed admin, env checklist) you need to run once.

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server (port 3000) |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint over `.ts/.tsx` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run format` | Prettier write |
| `npm test` | Vitest unit tests (214 tests) |
| `npm run test:e2e` | Playwright end-to-end tests |
| `npm run seed:admin` | `node scripts/seed-admin.mjs <email>` — promote a user to admin |

## Environment Variables

All variables are documented in `.env.example`. Required ones:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Optional: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `SMTP_*`, `NOTIFICATION_EMAIL`, `UPSTASH_REDIS_*`, `LOG_LEVEL`, `LOG_FORMAT`.

## Documentation

| Doc | Contents |
|---|---|
<!-- | [SETUP.md](./SETUP.md) | **Runbook** — links, all SQL scripts in order, Telegram webhook commands, seed scripts, Vercel env checklist | -->
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Code flow: checkout, Telegram webhook, auth, polling, data layer |
| [API.md](./API.md) | API routes + server action inventory + external API calls |
| [DATABASE.md](./DATABASE.md) | Tables, RLS policies, RPCs, migrations |
| [FOLDER_STRUCTURE.md](./FOLDER_STRUCTURE.md) | Project tree with per-file purpose |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Vercel deploy flow + env caveats |
| [SECURITY.md](./SECURITY.md) | CSRF, rate limiting, RLS, Telegram auth, secrets handling |

## License

Private — all rights reserved.
