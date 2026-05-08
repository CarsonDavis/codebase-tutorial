---
id: backend-api/auth-and-sessions
title: Auth, accounts, and sessions
summary: How users sign in, how the first-user-becomes-admin flow works, how long-term tokens are issued for programmatic access, and how Express sessions are persisted in Postgres via `connect-pg-simple`.
related:
  - backend-api/server-bootstrap
  - backend-api/feature-modules
  - configure-spa
key_idea: Two parallel auth paths — Postgres-backed Express sessions for humans and Bearer long-term tokens for scripts — share a 3-character permission ENUM where the first user against an empty database becomes super-admin.
watch_out:
  - The first POST /api/users/first_signup against an empty database silently creates a 111 super-admin — leaving an unguarded fresh deployment exposed gives a stranger the keys.
seams_touched:
  - browser-backend
  - backend-postgres
prerequisites:
  - backend-api/server-bootstrap
---

Three feature modules cooperate to handle identity: `API/Backend/Users` (the `users`
table and the sign-up/login routes), `API/Backend/Accounts` (admin-only CRUD over the
user list), and `API/Backend/LongTermToken` (machine credentials). They share session
state set up in [server bootstrap](./server-bootstrap.md) and are guarded by the
`ensureAdmin` / `ensureUser` middleware defined in `scripts/server.js`.

## Users, passwords, permissions

The `User` Sequelize model in `API/Backend/Users/models/user.js` stores `username`,
`email`, a bcrypt hash of `password`, and a 3-character `permission` ENUM. The model
hashes on `beforeCreate` and `beforeUpdate` hooks, so route code never touches plain
passwords. The legal permission strings are `"000"` through `"111"`; in practice only
three are used: `"111"` (super-admin), `"110"` (admin), and `"001"` (regular user).
Each character is a coarse capability bit — `ensureAdmin` checks the high bits, and
`/logged_in` simply checks that the last bit is `1`.

## Sign-up: first user becomes admin

`POST /api/users/first_signup` is the bootstrap path. It only succeeds when
`User.count() === 0`, and when it does, it creates the user with `permission: "111"`.
This matches what the README tells operators: the very first account created against an
empty database is the super-admin, and after that the form is hidden. All subsequent
sign-ups go through `POST /api/users/signup`, which creates `permission: "001"` users
and refuses unless either the caller is already a super-admin or
`AUTH_LOCAL_ALLOW_SIGNUP=true` is set in the environment.

## Login and session shape

`POST /api/users/login` looks up the user, runs `bcrypt.compare`, and on success calls
`req.session.regenerate(...)` (rotating the session id to prevent fixation) before
writing four fields onto `req.session`:

```js
req.session.user = user.username;
req.session.uid = user.id;
req.session.token = crypto.randomBytes(128).toString("hex");
req.session.permission = user.permission;
```

The fresh `token` is also persisted to `users.token` so the client can present it later
for "remember me"-style re-login via the `MMGISUser` cookie (see the `useToken` branch
in `routes/users.js`). `POST /api/users/logout` nulls the DB token and regenerates the
session.

## Where session state lives

Sessions are Express's `express-session` backed by `connect-pg-simple`, configured in
`scripts/server.js` around line 130:

```js
app.use(session({
  secret: process.env.SECRET || "Shhhh, it is a secret!",
  name: "MMGISSession",
  resave: false,
  saveUninitialized: false,
  cookie: cookieOptions,           // 24h maxAge; SameSite=None+Secure if THIRD_PARTY_COOKIES
  store: new (require("connect-pg-simple")(session))({ pool }),
}));
```

The `pool` is a `pg.Pool` pointed at the same Postgres instance the app uses for
everything else, so server restarts don't log users out and a horizontally scaled
deployment shares state for free.

## Long-term tokens

Sessions are for humans. Long-term tokens are for scripts and automation. The
`LongTermToken` module (`API/Backend/LongTermToken/`) lets an admin generate a random
hex token with a `period` (a millisecond TTL or `"never"`) and a `created_by_user_id`
foreign key. Clients send them as `Authorization: Bearer <token>`, and
`validateLongTermToken` in `scripts/server.js` joins `long_term_tokens` against `users`
to recover the creator's `permission` and `missions_managing`, attaching them to `req`
as `req.tokenUserPermission` etc. The token CRUD routes are themselves admin-only — note
the `ensureAdmin(false, true)` in `LongTermToken/setup.js`, where the second arg tells
the guard to refuse token-authenticated callers (you can't bootstrap new tokens with an
existing token).

## How routes declare auth requirements

There is no decorator system — each feature module's `setup.js` composes its own
middleware chain when mounting its router, picking from helpers exposed on the
`s` (setup context). Two patterns dominate:

- Admin-only modules wedge `s.ensureAdmin()` in front of the router (Accounts does
  this; so does most of [Configure](./feature-modules.md)).
- Public-ish modules just chain `s.checkHeadersCodeInjection` and `s.setContentType`
  and rely on `ensureUser()` further upstream.

The admin SPA at `/configure` ([Configure](../configure-spa/index.md)) is the primary
consumer of the admin-only routes — it's the UI that drives `/api/accounts/*` and
`/api/longtermtoken/*` against this same auth surface.
