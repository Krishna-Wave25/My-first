# Krishna Agency — Sales Dashboard (Floot export)

A sales dashboard for Krishna's agency showing revenue, deals in progress and recent leads.
It was built and is hosted on [Floot](https://floot.com). This folder is a source snapshot of
that Floot project, kept separate from the SolarGrid MPPT static site in the rest of this repo.

> This is **not** a standalone npm project. Floot supplies the React/router/build runtime,
> routing by filename, and the `/_api/*` endpoint wiring. To run or edit the app, use the Floot
> project; use this folder as a readable copy / backup of the code.

## What's on the page

- **KPI strip**: revenue over the last 12 months (with change for the last full month),
  this month's revenue vs target, open pipeline value, and recent leads with how many are uncontacted.
- **Monthly revenue** area chart with a dashed target line.
- **Pipeline by stage**: value and count for Discovery → Proposal → Negotiation → Contract.
- **Deals in progress** table, filterable by stage.
- **Recent leads**: the 8 newest, with company, source, status, estimated value and age.
- Loading skeletons, an error state with retry, a refresh button, and a light/dark theme switch.

## Layout

| Path | Purpose |
|---|---|
| `pages/_index.tsx` (+ `.module.css`, `.pageLayout.tsx`) | The dashboard page at `/` |
| `endpoints/dashboard_GET.ts` | `GET /_api/dashboard`: last 12 months of revenue, open deals, 8 newest leads |
| `endpoints/dashboard_GET.schema.ts` | Shared types and the typed `getDashboard()` fetch wrapper |
| `helpers/useDashboard.tsx` | React Query hook for the endpoint |
| `helpers/db.tsx`, `helpers/schema.tsx` | Kysely connection (`FLOOT_DATABASE_URL`) and generated DB types |
| `helpers/themeMode.tsx` | Light/dark/auto theme state |
| `components/` | The Floot UI-kit components the page uses (Chart, Tabs, Badge, Button, Skeleton, ThemeModeSwitch, DropdownMenu, Tooltip, SonnerToaster) and the global providers |
| `base.css` | Design tokens for light and dark modes |
| `db/schema.sql`, `db/seed.sql` | Postgres schema and the sample seed data |
| `design-principles.md` | The "agency ledger" design direction |
| `dependencies.json` | npm packages the exported code imports (versions as resolved in Floot) |

Floot UI-kit components the page doesn't use, and their `.example.tsx` demo files, are not included.

## Data

Three tables: `monthly_revenue`, `deals` (stage enum: discovery, proposal, negotiation,
contract, won, lost) and `leads` (status and source enums). The seed data in `db/seed.sql` is
**made up**; replace it with the agency's real figures. The dashboard shows only open deals,
so won and lost deals are stored but don't appear.
