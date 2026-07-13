# Security Specifications: e-Kariah Al-Ikhwan

This document details the security design, cryptographic parameters, cookie flags, Turnstile verification, and data policies for e-Kariah Al-Ikhwan.

---

## 1. Authentication & Session Management

### Member Sessions
- **Token Generation:** 32 bytes of cryptographically secure random values (`crypto.getRandomValues`).
- **Storage:** Only the SHA-256 hash of the session token is stored in the `member_sessions` D1 database table.
- **Session Transport:** The raw token is sent in the cookie header:
  `__Host-alikhwan_session=<raw_token>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=2592000` (30 days).
- **Domain Attribute:** Omitted.
- **Rotation:** Token rotated immediately after login or password changes. Expired tokens are purged.

### Admin Sessions (Browser Profile Device Enrollment)
- **Concept:** Represents a browser profile, not an individual.
- **Keyword verification:** Single constant-time keyword comparison verified server-side against `ADMIN_MAGIC_KEYWORD`.
- **Token generation:** 32 random bytes, stored as a SHA-256 hash.
- **Cookie name:** `__Host-alikhwan_admin` (180 days, HttpOnly, Secure, SameSite=Strict, Path=/).
- **Shared Device Precaution:** Clean session termination and a clear warning banner.

---

## 2. Password Hashing Specification

We use Node's native `crypto` module via asynchronous `scrypt` hashing (which is supported in Cloudflare Worker runtime via `nodejs_compat`).

- **Minimum Length:** 10 characters.
- **Maximum Length:** 128 characters.
- **Hashing Work Factors:**
  - `N` (cost parameter): 16384 (16k)
  - `r` (block size): 8
  - `p` (parallelization): 1
  - Key length: 64 bytes
- **Database Hash Encoding:**
  Stored as a single combined string:
  `scrypt$N=16384,r=8,p=1$salt_hex$hash_hex`

---

## 3. Rate Limiting & Turnstile Validation

### Cloudflare Turnstile
- Required on: Login, Registration, Account Claims, Membership Checks, and Admin Enrollment.
- Verified server-side by making a POST request to `https://challenges.cloudflare.com/turnstile/v0/siteverify` using the `TURNSTILE_SECRET_KEY` secret.

### API Rate Limiting
- Handled at Hono middleware level or via Cloudflare Worker Rate Limiting bindings.
- Under rate limits, return HTTP `429 Too Many Requests` with a JSON error payload and a `Retry-After` header.

---

## 4. Same-Origin & CSRF Protections
- **CSRF:** Hono middleware blocks requests if the `Origin` header is missing or does not match the Worker domain for state-changing methods (POST, PATCH, DELETE, PUT).
- **Security Headers:**
  - `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'; object-src 'none';`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: geolocation=(), camera=(), microphone=()`
  - `Cache-Control: no-store` on all authenticated `/api/me/*` and `/api/admin/*` paths.

---

## 5. Data Retention & Deletion Policy

### Retention Schedule
- **Active Members:** Retained indefinitely while they are part of the kariah.
- **Pending/Rejected Registrations:** Retained for 90 days if rejected, then hard-deleted.
- **Revoked/Expired Sessions:** Purged automatically by a background/cron task or hourly cleanups.
- **Audit Logs:** Retained for 1 year, then deleted.
- **Deactivated Members:** Kept in `inactive` state. If a member requests full deletion (Hak Dilupakan), the record is hard-deleted from all tables, and their username is released.

### Privacy Safeguards (PII Protection)
- Audit logs never store full IC numbers, phone numbers, addresses, or session tokens.
- IC displays are masked as `******-**-NNNN`. Unmasking requires a explicit user click on the UI.
- No PII is cached locally in service workers, localStorage, or sessionStorage.
