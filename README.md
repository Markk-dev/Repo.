# Repo — Workforce, Authentication & Scheduling Portal

A high-performance, real-time institutional workforce portal built for **St. Anne College Lucena (SACLI)**. The application provides unified collaboration channels, an interactive 24-hour synchronized calendar scheduling system, multi-device security management, and single-device session enforcement with Google recovery integration.

---

## 📋 Table of Contents
1. [Core Mission & System Goals](#-core-mission--system-goals)
2. [Architecture & Technology Stack](#-architecture--technology-stack)
3. [System Architecture & Data Flow](#-system-architecture--data-flow)
4. [Views & UI Modules](#-views--ui-modules)
5. [Authentication & Security Engine](#-authentication--security-engine)
6. [Database Schema & Migrations](#-database-schema--migrations)
7. [API Route Specifications](#-api-route-specifications)
8. [Folder & File Directory Structure](#-folder--file-directory-structure)
9. [Getting Started & Local Development](#-getting-started--local-development)

---

## 🎯 Core Mission & System Goals

The primary objectives of this portal are:
1. **Centralized Workforce Hub:** Provide faculty and administrative staff (e.g., SAHS department) a sleek, Discord/Slack-inspired collaborative workspace with structured channels, announcements, and pinned notices.
2. **Real-Time Calendar & Scheduling:** Enable live shared scheduling (`/events`) with 24-hour time blocks, pastel color categorization, recurring/all-day flags, and instant multi-client synchronization via Supabase Realtime.
3. **Single-Device Active Session Enforcement:** Ensure strict institutional security by allowing only one active device session per employee at any given time. If an employee logs in from a new device (e.g., mobile phone via a tunnel), any prior session (e.g., desktop browser) is immediately invalidated with an override alert.
4. **Identity Verification & Google Account Recovery:** Provide employees the ability to securely link external Google accounts for password recovery and identity verification.

---

## 🛠️ Architecture & Technology Stack

| Layer | Technologies & Libraries | Description |
| :--- | :--- | :--- |
| **Framework** | **Next.js 16.3.1 (App Router)** | Modern server/client hybrid rendering, API route handlers, and middleware. |
| **UI Library** | **React 19.2.8** | Modern React with hooks, concurrent features, and fast client-side state. |
| **Language** | **TypeScript 7.0.2** | Strict end-to-end type safety across components, context, and backend handlers. |
| **Styling System** | **Vanilla CSS (`globals.css`)** | Custom design system with dark glassmorphism, HSL color tokens, and responsive sidebars. |
| **Icons** | **Phosphor Icons (`@phosphor-icons/react`)** | Comprehensive icon system with customizable weights and sizes. |
| **Database & Realtime** | **Supabase (PostgreSQL 15+)** | Postgres database, Row Level Security (RLS), stored RPC functions, and WebSocket Realtime replication. |
| **Client Auth / SSR** | **`@supabase/ssr` & `@supabase/supabase-js`** | Secure cookie-based server/client Supabase integration. |
| **Security & Cryptography** | **`bcryptjs` / `pgcrypto`** | Password hashing and cryptographic verification. |

---

## 🏛️ System Architecture & Data Flow

```
                                  ┌─────────────────────────────┐
                                  │       Client Browser        │
                                  │  (Next.js App / React 19)   │
                                  └──────────────┬──────────────┘
                                                 │
                                 HTTP / Cookies  │  WebSocket (Realtime)
                                 (brewcode_sess) │
                                                 ▼
               ┌─────────────────────────────────┴─────────────────────────────────┐
               │                        Next.js Middleware                         │
               │               (/middleware.ts - fast cookie check)                │
               └─────────────────────────────────┬─────────────────────────────────┘
                                                 │
                                                 ▼
               ┌───────────────────────────────────────────────────────────────────┐
               │                        Next.js App Router                         │
               ├─────────────────────────────────┬─────────────────────────────────┤
               │          API Routes             │         Pages & Layouts         │
               │  • /api/auth/login              │  • / (Main Dashboard)           │
               │  • /api/auth/session            │  • /events (Full Calendar)      │
               │  • /api/auth/logout             │  • /login (Auth Portal)         │
               │  • /api/auth/devices            │  • AuthContext (Heartbeat)      │
               │  • /api/auth/recovery/google    │  • UserSettingsModal            │
               │  • /api/auth/change-password    │  • EventModal / CalendarView    │
               └────────────────┬────────────────┴────────────────┬────────────────┘
                                │                                 │
                   ActiveSessionStore (RAM)             Supabase Postgres Client
                                │                                 │
                                └────────────────┬────────────────┘
                                                 │
                                                 ▼
                              ┌─────────────────────────────────────┐
                              │          Supabase Backend           │
                              ├─────────────────────────────────────┤
                              │  • employees (credentials & info)   │
                              │  • user_sessions (tokens & expiry)  │
                              │  • linked_accounts (Google OAuth)   │
                              │  • calendar_events (Realtime Pub)   │
                              └─────────────────────────────────────┘
```

---

## 🖥️ Views & UI Modules

### 1. Login Page (`/login`)
* **File:** [`app/login/page.tsx`](file:///app/login/page.tsx)
* **Features:**
  * Interactive canvas skew grid pattern (`InteractiveGridPattern`).
  * Institutional branding (SACLI logo + Repo collaboration badge).
  * Employee ID & Password verification with toggleable password visibility.
  * Auto-redirect to intended path upon successful login.

### 2. Main Collaborative Dashboard (`/`)
* **File:** [`app/page.tsx`](file:///app/page.tsx)
* **Features:**
  * **Department Rail:** Switch between departments (e.g., SAHS - School of Allied Health Sciences).
  * **Channel Navigation:** Browse announcement boards, group discussions, and event lists.
  * **Interactive Chat / Notice Board:** Pinned announcements, file attachment dropzones, and message composition.
  * **User Profile Menu:** Quick access to online status, Settings modal, and Logout.

### 3. Realtime Calendar & Scheduling (`/events`)
* **Files:** [`app/events/page.tsx`](file:///app/events/page.tsx), [`components/events/CalendarView.tsx`](file:///components/events/CalendarView.tsx), [`components/events/EventModal.tsx`](file:///components/events/EventModal.tsx)
* **Features:**
  * **24-Hour Timeline Grid:** Day and week views with past-time dimming.
  * **Color Palettes:** Pastel color schemes (Purple, Blue, Green, Amber, Coral) with dynamic badge styles.
  * **Live Synchronization:** Listens to Supabase `postgres_changes` on `calendar_events` table for instantaneous team-wide updates.
  * **Event Modal:** Add/edit event title, date, start/end time popovers, guest lists, and rich descriptions.

### 4. User Settings & Security Center
* **File:** [`components/settings/UserSettingsModal.tsx`](file:///components/settings/UserSettingsModal.tsx)
* **Tabs:**
  * **Account Info:** View Employee ID, Full Name, Department, Position, and Google recovery link status.
  * **Password & Security:** Change password with current password verification.
  * **Active Devices Manager:** View all devices logged into the account (OS, Browser, Device Type, IP, Last Active) and revoke unauthorized sessions remotely.

---

## 🔒 Authentication & Security Engine

### Single-Device Active Session Policy
The system guarantees that **an employee cannot be logged in from multiple devices simultaneously**:
1. **Session Generation:** Upon login (`/api/auth/login`), a unique cryptographic session token is issued, stored in a secure cookie (`brewcode_session`), and registered in the in-memory [`ActiveSessionStore`](file:///utils/session-store.ts) and Supabase `user_sessions` table.
2. **Override Detection:** When a second device logs in with the same Employee ID, the previous session token is superseded.
3. **Graceful Revocation:** When the first device performs its next request or 15-second heartbeat to `/api/auth/session`:
   * The server returns `401 Unauthorized` with `{ sessionOverridden: true }`.
   * The server immediately deletes the cookie with `maxAge: 0`.
   * The frontend clears state (`employee: null`), stops all polling, and presents a **"Session Invalidated"** alert modal prompting the user to log in again.

### Centralized Cookie Configuration
All authentication endpoints share identical attributes via [`utils/session-config.ts`](file:///utils/session-config.ts):
```ts
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 7 * 24 * 60 * 60, // 7 days
};
```

---

## 🗄️ Database Schema & Migrations

The database is managed in [`supabase/migrations/`](file:///supabase/migrations/):

### 1. `employees` ([`001_create_employees.sql`](file:///supabase/migrations/001_create_employees.sql))
* `id` (UUID, Primary Key)
* `employee_id` (TEXT, Unique) — e.g., `"26-008-0005"`
* `name` (TEXT)
* `position` (TEXT)
* `program` (TEXT) — e.g., `"SAHS"`
* `password_hash` (TEXT)
* `created_at`, `updated_at` (TIMESTAMPTZ)

### 2. `user_sessions` & Devices ([`002_auth_session_schema.sql`](file:///supabase/migrations/002_auth_session_schema.sql))
* `id` (UUID, Primary Key)
* `employee_id` (UUID References `employees(id)`)
* `session_key` (TEXT, Unique)
* `is_valid` (BOOLEAN)
* `ip_address`, `user_agent`, `device_type` (TEXT)
* `expires_at`, `created_at`, `last_active_at` (TIMESTAMPTZ)
* Stored procedures: `validate_session()`, `revoke_session()`, `create_user_session()`.

### 3. `linked_accounts` ([`003_linked_accounts_recovery.sql`](file:///supabase/migrations/003_linked_accounts_recovery.sql))
* `id` (UUID, Primary Key)
* `employee_id` (UUID References `employees(id)`)
* `provider` (TEXT) — e.g., `'google'`
* `email` (TEXT)
* `is_verified` (BOOLEAN)
* `linked_at` (TIMESTAMPTZ)

### 4. `calendar_events` ([`004_calendar_events_realtime.sql`](file:///supabase/migrations/004_calendar_events_realtime.sql))
* `id` (UUID, Primary Key)
* `user_id` (UUID References `employees(id)`)
* `title` (TEXT)
* `date` (TEXT) — Format: `YYYY-MM-DD`
* `start_time`, `end_time` (TEXT) — Format: `HH:MM`
* `all_day` (BOOLEAN)
* `guests`, `description` (TEXT)
* `created_at`, `updated_at` (TIMESTAMPTZ)
* Included in `supabase_realtime` publication for instant client broadcast.

---

## 🌐 API Route Specifications

| Endpoint | Method | Purpose | Auth Required |
| :--- | :--- | :--- | :--- |
| `/api/auth/login` | `POST` | Validates credentials, creates session, sets `brewcode_session` cookie. | No |
| `/api/auth/session` | `GET` | Validates active session token, performs session rotation, checks overrides. | Cookie |
| `/api/auth/logout` | `POST` | Revokes DB session, clears memory registry, sets cookie `maxAge: 0`. | Cookie |
| `/api/auth/devices` | `GET` / `DELETE` | Retrieves active device audit logs or revokes a specific device session. | Cookie |
| `/api/auth/change-password` | `POST` | Verifies old password and updates password hash. | Cookie |
| `/api/auth/recovery/google` | `GET` / `POST` / `DELETE` | Manages external Google account link for identity verification. | Cookie |

---

## 📂 Folder & File Directory Structure

```
├── app/
│   ├── api/auth/
│   │   ├── callback/route.ts          # OAuth callback endpoint
│   │   ├── change-password/route.ts   # Password modification & hash update
│   │   ├── devices/route.ts           # Active device list & remote session revocation
│   │   ├── login/route.ts             # Auth login handler
│   │   ├── logout/route.ts            # Auth logout handler (cookie purge)
│   │   ├── recovery/google/route.ts   # Google account linking & verification
│   │   └── session/route.ts           # Session validator & override checker
│   ├── events/
│   │   └── page.tsx                   # Dedicated 24h Calendar & Schedule view
│   ├── login/
│   │   └── page.tsx                   # Login portal with dynamic background
│   ├── globals.css                    # Design system tokens & global component styles
│   ├── layout.tsx                     # Root HTML layout with AuthProvider & metadata icons
│   └── page.tsx                       # Main collaborative workspace dashboard
│
├── components/
│   ├── events/
│   │   ├── CalendarView.tsx           # Full-featured calendar timeline view
│   │   └── EventModal.tsx             # Create/Edit event dialog with pastel pickers
│   ├── settings/
│   │   └── UserSettingsModal.tsx      # Multi-tab account, security & device modal
│   └── ui/
│       ├── DatePickerCalendar.tsx     # Reusable date picker dropdown
│       ├── PopoverMenu.tsx            # Floating action popover
│       ├── TimePickerPopover.tsx      # Hour/minute picker dropdown
│       ├── Tooltip.tsx                # Hover tooltips
│       └── interactive-grid-pattern.tsx # Interactive background canvas
│
├── context/
│   └── AuthContext.tsx                # React Auth context, heartbeat & session lifecycle
│
├── constants/
│   └── employees.ts                   # Seed/fallback employee credentials
│
├── supabase/
│   └── migrations/                    # SQL schema definitions and migrations
│
├── utils/
│   ├── session-config.ts              # Cookie names, TTL, and security options
│   ├── session-store.ts               # In-memory single active session registry
│   └── supabase/                      # Supabase Admin, Server, Client, Middleware instances
│
└── middleware.ts                      # Edge middleware route guard
```

---

## 🚀 Getting Started & Local Development

### 1. Environment Configuration
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Default Seed Credentials (Local Mode)
* **Employee ID:** `26-008-0005`
* **Password:** `26-008-0005`
* **Role:** Administrative Assistant (SAHS)
