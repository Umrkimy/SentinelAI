# SentinelAI frontend

An industrial maintenance workspace built with Next.js, React, and Lucide icons.

## Run locally

Start the existing backend and database, then from `frontend/`:

```sh
npm install
npm run dev
```

Set `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000` in `.env.local` before starting. Open http://localhost:3000. The backend currently permits browser requests from localhost ports 3000 and 3001.

## Workflow

- Register equipment through the header dialog.
- Search, filter, sort, and select an asset in the registry.
- Enter five measured sensor readings and run an assessment.
- Inspect the selected asset's latest probability, threshold, and saved history; export its history as CSV.

Overview combines the registry and assessment workspace. The Equipment and Assessments navigation items provide focused views. All displayed records come from the API. Active registration does not indicate low failure risk, and assessment counts apply to the selected asset only.

## Verification

```sh
npm run lint
npm run build
```

Check desktop and mobile layouts, empty registries, disconnected API recovery, asset switching, required sensor fields, duplicate asset tags, and CSV exports. Mutating browser checks should intercept POST responses to avoid creating synthetic operational records.

## Design

Graphite navigation, neutral work surfaces, restrained green accents, and risk-specific status colors. References: IBM Carbon's data-table patterns and MaintainX's maintenance reporting organization. Native HTML tables and a modal dialog provide the current interactions without a large component framework.
