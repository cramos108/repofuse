# RepoFuse

Local-first compliance log for independent buy-here-pay-here lots. Lot managers and collections directors use it to record default notices, cure windows, breach-of-peace guardrails, field spots, personal-property inventories, and the post-repo worksheet.

Borrower files stay in the browser. Supabase, when you enable Pro, is limited to sign-in, the dealership name, the state code, and a license tier.

RepoFuse is an operational worksheet. It is not a law firm and it does not generate statutory notice forms. Confirm every day count with counsel before you rely on a countdown.

## Scripts

```bash
npm.cmd install
npm.cmd run dev
npm.cmd test
npm.cmd run build
```

`npm run dev` serves the app locally. The production build is a static Vite bundle that Vercel can host as a PWA.

## Privacy boundary

| Data | Where it lives |
| --- | --- |
| Theme | `localStorage` key `repofuse-theme` |
| Dealership, state, armed day counts, license cache | IndexedDB database `repofuse`, store `workspace` |
| Accounts, notices, contacts, guardrails, spots, inventory, expenses, audit | IndexedDB |
| Photos | IndexedDB blobs, compressed in the browser |
| Pro identity | Supabase Auth |
| License tier | Supabase table `licenses` (read by the signed-in user) |
| Dealership name and state code | Supabase table `workspace_settings` |

There is no table, and no client call, for borrowers, vehicles, notices, checklists, spots, or photos. `src/domain/boundary.test.ts` locks that down.

Pro is not a cloud backup. Export a PDF packet or a JSON restore file before clearing site data.

## State worksheets

`src/domain/profiles.ts` arms a starting countdown for all 50 states and the District of Columbia. Profiles are worksheets revised `2026-09-29`:

- States widely described as having a pre-repo cure get a suggested day count. Where public summaries disagree, the longer count is armed so the lot does not move early.
- Other states do not flag a statutory pre-repo cure. A contractual grace period can still be armed.
- Consumer transactions do not use the UCC § 9-612(b) 10-day safe harbor. The disposition wait starts at 15 days (20 for a California notice mailed outside the state).
- The first date a window shows clear is the day after N full calendar days. A notice dated January 1 with 15 days is clear on January 17.
- A counsel waiver can turn a statutory cure off. The reason is stored and printed on the packet.
- Ready for recovery also requires each pre-recovery guardrail to be acknowledged. Breach-of-peace items require the operator to type CONFIRM.

## Supabase

Copy `.env.example` to `.env.local` and set:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Run `supabase/schema.sql` in the Supabase SQL editor. Users can read their own license and write their own workspace settings. They cannot write the license row. Set `licenses.tier` to `pro` from the SQL editor or a server-side checkout when a subscription is paid. This build does not collect a card.

## Deploy

Vercel detects Vite. `vercel.json` rewrites unknown paths to `index.html` so client routes work. The service worker precaches the app shell only. It does not cache the lot file and it does not sync IndexedDB.

Set the same `VITE_SUPABASE_*` variables in the Vercel project if you want Pro sign-in. Leave them empty to ship Free only.
