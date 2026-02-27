# Testing README

This project has three ways to run tests:

1. Terminal unit/integration tests (`vitest`)
2. Terminal end-to-end tests (`playwright`)
3. Admin dashboard test runner (new `Tests` tab)

## Prerequisites

- Node.js installed
- Dependencies installed: `npm install`
- For e2e tests, Playwright browsers installed once: `npx playwright install`

For authenticated e2e phase-2 tests, set these environment variables:

```bash
E2E_USER_EMAIL=""
E2E_USER_PASSWORD=""
E2E_ADMIN_EMAIL=""
E2E_ADMIN_PASSWORD=""
```

If these are missing, authenticated e2e specs are skipped automatically.
If they are present, authenticated tests auto-create required users before the run and delete them in teardown.

## Commands

Run unit/integration tests:

```bash
npm run test
```

Run in watch mode:

```bash
npm run test:watch
```

Run coverage report:

```bash
npm run test:coverage
```

Run e2e tests:

```bash
npm run test:e2e
```

Open Playwright UI mode:

```bash
npm run test:e2e:ui
```

## Test Inventory

Unit/integration (`vitest`):
- `src/features/admin/admin.actions.test.ts`
  - Validates admin status updates: invalid status rejection, self-ban rejection, admin-ban rejection, successful non-admin status update.
- `src/features/auth/auth.actions.test.ts`
  - Validates register action: missing fields, username taken, auth failure, duplicate email case, profile creation failure, success case.
- `src/features/auth/lib/validation.test.ts`
  - Validates email/password/username/confirm-password input rules and error messages.
- `src/features/journeys/journeys.actions.test.ts`
  - Validates journey actions: auth checks, create success path, update ownership enforcement path, delete not-authorized path.
- `src/features/posts/posts.actions.test.ts`
  - Validates post actions: title validation, create success path, update path, delete not-authorized path.
- `src/features/profiles/profile.actions.test.ts`
  - Validates profile action: unauthenticated rejection and successful update with revalidation.

End-to-end (`playwright`):
- `e2e/home.spec.ts`
  - Verifies homepage renders key journeys section.
- `e2e/routes.spec.ts`
  - Verifies public route pages render: `/about`, `/login`, `/register`, `/search`.
- `e2e/authenticated.spec.ts`
  - Verifies authenticated flows using env credentials:
  - User can sign in and access `/journeys` and `/me`.
  - Admin can sign in and access `/admin?tab=tests`.
  - Test users are auto-created before tests and deleted in teardown.

## Admin Dashboard Test Runner

Path: `/admin?tab=tests`

Buttons:
- `Run unit/integration tests` -> runs `npm run test`
- `Run e2e tests` -> runs `npm run test:e2e`

Notes:
- Admin-only (requires active admin account)
- Production safety: test runner is disabled in production unless `ENABLE_ADMIN_TEST_RUNNER=true`
- Output is shown in the dashboard panel

## What You Want To See (Healthy Results)

For unit/integration tests:
- `Test Files ... passed`
- `Tests ... passed`
- Exit status success (command finishes without `Failed`)

For e2e tests:
- `ok ...` lines for test specs
- Final summary: all tests passed

For security/setup:
- `npm audit` returns `found 0 vulnerabilities`

## What You Do NOT Want To See

- `Failed` test files or failing assertions
- `Error:`, `Unhandled`, `Timeout` in test output
- Playwright messages like `locator... not found`, `expect(received)...`
- `Not authorized` from admin runner when logged in as admin (indicates session/profile issue)
- `Test runner is disabled in production` when you expected it enabled
- `npm audit` reporting high/critical vulnerabilities

## Troubleshooting

- If `vitest is not recognized`: run `npm install`
- If Playwright browser is missing: run `npx playwright install`
- If admin runner fails on production intentionally: set `ENABLE_ADMIN_TEST_RUNNER=true` only in trusted environment
- If e2e is flaky: rerun once, then inspect output in the admin panel or terminal logs
