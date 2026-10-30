---
paths:
  - "src/**/*.rls.test.ts"
  - "vitest.rls.config.mts"
  - "supabase/**"
  - "scripts/check-test-residue.mjs"
---

# Integration tests and leaked test users

Moved out of `CLAUDE.md` on 2026-10-30 (tekguyz/tekguyz-crm#73), unchanged in substance. The short form stays in `CLAUDE.md` § Gates.

- **Two commands, never the aggregate:** `npm run test:unit`, then `npm run test:integration`. `npm test` fails on purpose.
- **Integration tests run serially.** Hosted Supabase rate-limits sign-up and sign-in. In parallel, suites die in `beforeAll` with `Request rate limit reached`, which reads like a failure and is not one. Before calling an integration red a real red, re-run it serially and say which it was.
- **A run that dies in setup leaks its users.** `afterAll` does not run when `beforeAll` throws. After any red integration run, say whether a sweep is needed.
- Test users use the reserved `tekguyz-crm.test` domain. **Integration test emails start with `it-`.** Demo users (`guest-`, `team-`, `demo-`) and dev-login users (`dev-`) share the domain, so never sweep the whole domain. Select first, read the list, then delete:

  ```sql
  select email from auth.users where email like 'it-%@tekguyz-crm.test';
  delete from auth.users where email like 'it-%@tekguyz-crm.test';
  ```
- Here the demo suites make `demo-it-…` users, which the `it-` sweep misses. `npm run check:residue` lists live test rows (select only). Read it before any delete. The human applies all DDL; a delete is the founder's call.
- **A reaper or sweep that deletes across the project lives in ONE test file.** Files run in parallel; two files sweeping delete each other's fixtures.
