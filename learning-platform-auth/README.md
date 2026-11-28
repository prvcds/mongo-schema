# Learning platform authentication and authorization

This runnable Express example demonstrates account registration/login, hashed
passwords, short-lived JWT access tokens, and authorization for quiz attempts,
course progress, and course feedback. Its users, courses, and records live in
memory and reset when the process restarts; replace `MemoryStore` with a
transactional database before production use.

## Assumptions and policy

- Self-service registration always creates a `student`. A caller cannot choose
  their own role. Instructors are provisioned by trusted server-side setup.
- Passwords are hashed with bcryptjs (cost 12), require at least 12 characters,
  and are limited to bcrypt's 72-byte input limit.
- Login returns an HS256 bearer token that expires after 15 minutes. Its only
  identity claim is `sub`; each request reloads the active user and role from
  the store so role changes do not remain in a still-valid token.
- Students can submit attempts, read their own progress, and leave feedback
  only for courses in which they are enrolled. Instructors can read progress
  only for courses assigned to them.
- Quiz answers are attributed from the authenticated user, never from a
  caller-supplied `userId`. A production service must grade answers on the
  server and enforce attempt limits transactionally.
- No production signing key, account password, or `.env` file is committed.

## Run locally

From PowerShell in this folder:

```powershell
npm install
$env:JWT_SECRET = (node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64'))")
$env:DEMO_STUDENT_PASSWORD = Read-Host "Choose a demo student password (12+ characters)"
$env:DEMO_INSTRUCTOR_PASSWORD = Read-Host "Choose a demo instructor password (12+ characters)"
npm start
```

The demo accounts are `student@example.test` and `instructor@example.test`.
Passwords are hashed during startup. The seeded student is enrolled in
`course-learning-basics` and the instructor is assigned to that course. The
JWT secret and demo passwords stay in the current shell environment.

## Example flow

1. `POST /api/auth/login` with the student email and chosen password to get
   `accessToken`.
2. Send `Authorization: Bearer <accessToken>` to
   `GET /api/courses/course-learning-basics/progress`.
3. Submit an attempt to
   `POST /api/courses/course-learning-basics/quizzes/quiz-learning-basics/attempts`
   with `{"answers":{"q1":"B"}}`.
4. Submit feedback to `POST /api/courses/course-learning-basics/feedback` with
   `{"message":"The lesson was clear","rating":5}`.

Every write obtains the user ID from the token. The instructor token can read
course progress, but cannot create student quiz attempts or access courses the
instructor is not assigned to.

## Authorization flow

```text
Email/password ──bcrypt compare──> user record
       │                               │
       └── valid ──> 15-minute JWT (sub only)
                               │
Bearer token ──verify signature/exp/iss/aud──> reload active user
                               │
                    check role + course membership
                               │
               own progress / quiz attempt / feedback
```

## Failure case and threat note

An enrolled student presenting a valid token for a different course receives
`403 Course access denied`; a token that is missing, malformed, invalid, or
expired receives `401`. Invalid login uses one generic response for unknown
emails and wrong passwords.

Bearer tokens are replayable if stolen until expiry. Production deployment
needs TLS, a high-entropy secret from a secret manager, login rate limiting,
token revocation/refresh design, strict CORS, and careful client storage. Keep
tokens out of URLs, logs, analytics, and browser local storage; consider
in-memory access tokens or secure HttpOnly cookies with CSRF defenses. This
demo logs request IDs and error names only, not credentials or token values.

## Test evidence

Verified locally:

- `npm test` — all 7 tests passed. They exercise bcrypt registration, generic
  failed login, authenticated progress, server-derived quiz-attempt ownership,
  missing and expired tokens, role checks, and cross-course access denial.
- `npm audit` — passed with 0 vulnerabilities.
- Startup smoke test — demo student/instructor login, progress reads, quiz
  submission, and feedback submission all returned expected results.

Tests use random process-local signing keys and passwords with disposable
in-memory records.
