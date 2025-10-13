# Attendance Software — Server

Developer notes, quick start, and debugging tips for the server portion of the Attendance Software project.

## Quick Start (development)

- Install dependencies:

  npm install

- Run the dev server (auto-restart with nodemon if configured):

  npm run dev

- Default server URL: `http://localhost:8000` (see `PORT` env var)

## Important Files

- `src/app.js` — Express app entry, route mounting and middleware.
- `src/config/routes/students.js` — Student CRUD, claim and invite flows (primary working area).
- `src/config/routes/auth.js` — Authentication endpoints (login, refresh, claim flows).
- `src/config/models/students.js` — Mongoose Student model and indexes.
- `src/config/models/user.js` — Mongoose User model, password hashing, token helpers.
- `src/config/routes/class.js` — Class endpoints and CSV student bulk upload.
- `src/config/middleware/userAuth.js` — JWT-based auth and `requireRole` helper.
- `src/config/middleware/claimRateLimit.js` — simple in-memory rate limiter (dev only).
- `scripts/hash-existing-claimcodes.js` — migration helper to hash old plaintext claim codes.

## Environment Variables

- `PORT` — server port (default 8000)
- `MONGO_URL` — MongoDB connection string
- `JWT_SECRET` — secret used to sign access & invite tokens (must be stable)
- `JWT_EXPIRES_IN` — access token TTL (optional; default `15m`)
- `CLAIM_SECRET` — secret used to HMAC one-time claim codes (must be stable)

Keep `JWT_SECRET` and `CLAIM_SECRET` consistent across server instances. Changing them will invalidate existing tokens and claim codes.

## Claim & Invite Flow (overview)

- Teacher creates a student:
  - If `createUser=true` and `email` provided: a `User` is created (dev-only returns a `tempPassword` and an `inviteToken`). The `inviteToken` payload includes `sub` (user id) and `studentId` (the student record id).
  - If `createUser=false`: a one-time `claimCode` is generated (HMAC stored as `claimCodeHash`); teacher sees the plaintext code once (dev-only).

- Student claims with `POST /students/claim` using the one-time `claimCode`, `email`, and chosen `password`.

- Invite acceptance: student receives `inviteToken` (dev returned) and calls `POST /students/invite-accept` with `token` and `password`. Server verifies token, sets password, marks emailVerified and links the student record.

Notes:
- HMAC of claim codes is done with `CLAIM_SECRET`; do not change it mid-flight.
- In production, do NOT return `tempPassword`, `claimCode`, or `inviteToken` in API responses — send via email/SMS.

## Debugging Tips

- If request body appears empty (`{}`) on the server, check:
  - `Content-Type` header: must be `application/json` for JSON bodies (Postman: Body → raw → JSON).
  - Server middleware: `app.use(express.json())` is enabled in `src/app.js`. If you expect `application/x-www-form-urlencoded`, enable `express.urlencoded()`.

- Common issues and how to check:
  - `invalid_or_expired_claim` — ensure `CLAIM_SECRET` is the same used to generate the claim.
  - `invite-accept` returns `invalid_token` — confirm `JWT_SECRET` is the same as when token was created and token hasn't expired.
  - Student not linked after invite: check token payload (it should contain `studentId`) and that the student's `email` matches the user email (fallback linking uses email match).

- Useful mongo queries (use `mongosh`):
  - Show a student: `db.students.find({_id: ObjectId('<ID>')}).pretty()`
  - Check for claim hash: `db.students.find({ claimCodeHash: { $exists: true } }).limit(5).pretty()`

## Tests / Manual API Checks

- Create a student (teacher): `POST /students` with `createUser` set or not.
- Claim a student: `POST /students/claim` with `{ claimCode, email, password }`.
- Accept an invite: `POST /students/invite-accept` with `{ token, password }`.

### Avatar upload

- Endpoint: `PUT /users/me/avatar` (authenticated)
- Body: multipart/form-data with a `avatar` file field (image). Max size 5MB.
- Response: `{ ok: true, profilePicture: '<relative-path>', url: 'http://host/uploads/avatars/<file>' }`

PowerShell example (form-data):

```powershell
$filePath = 'C:\path\to\avatar.jpg'
$headers = @{ Authorization = 'Bearer <TOKEN>' }
Invoke-RestMethod -Uri 'http://localhost:8000/users/me/avatar' -Method Put -Headers $headers -InFile $filePath -ContentType 'multipart/form-data; boundary=----WebKitFormBoundary' 
```


Use the following pattern when testing with `curl` or PowerShell to ensure headers and JSON body are sent correctly:

PowerShell example:

```powershell
$body = @{ name = "Alice"; rollNo = "A101"; classId = "<CLASS_ID>" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8000/students" -Method Post -Headers @{ Authorization = "Bearer <TOKEN>"; "Content-Type" = "application/json" } -Body $body
```

## Production Notes

- Replace the in-memory rate limiter with a persistent/cluster-safe limiter (Redis + express-rate-limit-redis).
- Integrate an email provider (SendGrid/Postmark/SES) to deliver invites/claim codes rather than returning them in API responses.
- Remove dev-only debug and returned secrets before deploying.

## Where to change behavior

- To stop returning `claimCode`/`inviteToken` in responses: edit `src/config/routes/students.js` and remove dev returns; instead call your mailer.
- To change HMAC algorithm or secret: update `CLAIM_SECRET` but be aware of invalidating existing codes.

If you want, I can:
- Add automated tests for the create→invite→invite-accept flow.
- Wire a SendGrid/email adapter and remove dev-only secret returns.
- Add a `POST /students/:id/generate-invite` dev route to manually create invite tokens for testing.

---
Last updated: 2025-09-21
