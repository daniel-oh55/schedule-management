# Shipping Schedule Management

Internal MVP for managing shipping schedules across three schedule layers:

- Proforma Schedule: service-level base rotation and operational timing.
- Long Term Schedule: vessel and voyage plan generated from Proforma.
- Coastal Schedule: editable voyage schedule for actual operations.

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS
- date-fns
- xlsx
- @dnd-kit ready for Coastal row drag and drop
- localStorage repository layer for MVP persistence

## Current MVP Scope

- Grid-centered UI for Proforma, Long Term, Coastal, and Master Data.
- Proforma version management by service.
- Distance matrix Excel parser.
- Local JSON import/export.
- Proforma to Long Term flow.
- Long Term to Coastal editable copy foundation.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Data Direction

The current repository layer uses localStorage. The next backend step should replace the repository implementation with a server/API backed by PostgreSQL, preferably Neon for Vercel deployment.
