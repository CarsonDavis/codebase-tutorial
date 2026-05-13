---
id: backend-api/auth-and-sessions
title: Logins, sessions, and tokens
summary: Two parallel auth paths — cookie-backed sessions for humans, long-lived bearer tokens for scripts.
related:
  - backend-api/server-bootstrap
  - backend-api/feature-modules
  - configure-spa
key_idea: The first person to register against a fresh database becomes the super-admin. After that, sign-ups are gated unless explicitly enabled. Both humans and scripts authenticate against the same user table, just over different channels.
watch_out:
  - A freshly deployed MMGIS sitting on the open internet with no first user yet is exposed — the first POST to the signup endpoint silently creates a super-admin. Lock down the network before exposing it.
seams_touched:
  - browser-backend
  - backend-postgres
prerequisites:
  - backend-api/server-bootstrap
---

Three of the feature modules from the previous page cooperate to handle identity: one owns the user table and login flows, one wraps it for admin-only user management, and one issues bearer tokens for scripts.

## Users and permission levels

The user table stores username, email, a hashed password, and a 3-character permission code. The hashing happens automatically — the route code never sees raw passwords. The permission code looks like binary flags. In practice only three values are used:

- **Super-admin**: full powers, including managing other admins.
- **Admin**: most powers, but can't escalate.
- **Regular user**: can use the app, can't change global configuration.

These permission levels are checked by the login guards on every gated route.

## First user becomes super-admin

There's a special signup endpoint that **only works when the user table is empty.** The very first person to post to it gets the super-admin permission. After that, the front-end form for first-user signup is hidden, and the endpoint refuses.

Everyone after that signs up through the normal signup endpoint, which:

- Creates regular-user accounts.
- Refuses unless either the caller is already a super-admin or a "let anyone sign up" environment flag is on.

This is how a fresh MMGIS deployment is meant to be bootstrapped: install it, hit the first-user URL once, that person is now in charge.

## How login works

When someone submits the login form, the server:

1. Looks up the user by username.
2. Verifies the password.
3. Rotates the session ID (a security best practice — prevents an attacker who somehow knew the old session ID from hijacking the new logged-in session).
4. Writes some basic identity info onto the session.
5. Also writes a fresh random "remember me" token into the user row, so a separate cookie can transparently re-log them in later if the session expires.

Logout reverses these steps.

## Where session state lives

Sessions live in Postgres, in a table set up by the database init script. The cookie that the browser stores only holds a session ID — the actual data sits on the server side.

This means:

- Restarting the server doesn't log everyone out.
- Multiple server instances behind a load balancer share session state automatically.

## Long-term tokens (for scripts)

Sessions are good for humans clicking around. Scripts and automation use a different path: long-term tokens. An admin generates a random hex token with a configurable expiration. Scripts send it on requests as an `Authorization: Bearer ...` header. The server validates it by looking it up in a separate tokens table.

A nuance worth knowing: **the token-management endpoints themselves refuse token authentication.** You can't bootstrap new tokens with an existing token — you need a real human-session admin login to create the first one. This means a stolen token can't be used to mint more tokens.

## How a feature module declares its auth requirements

There's no decorator system or annotation language. Each feature module's startup hook chains together whichever login guards it wants in front of its routes, picking from the shared toolkit. Common patterns:

- **Fully admin-only**: wedge the admin-guard in front of the whole router.
- **Mostly public, with admin writes**: rely on the broader server-wide auth guard for read access and let individual write routes apply the admin-guard themselves.

The admin app at `/configure` is the primary consumer of the admin-only routes — it's basically a UI on top of the admin APIs.

## What this means for a static refactor

All of this is gone in a static deployment. No login form, no sessions table, no tokens table, no admin permission checks — because there's nothing to administer. The auth state is implicitly "anonymous, read-only forever."

A few consequences:

- Any frontend code that conditionally shows or hides UI based on the logged-in user goes into a default state — typically "show the read-only view."
- Anything that requires admin (like editing the layers) is removed from the frontend bundle entirely, since there's no way to use it.
- The frontend stops sending the session cookie because there's nothing to send it to.
