# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

Record your plan here before editing code.

- Presentation tier decision: Keep React Router pages focused on rendering each capability and put HTTP access in a shared API client. Represent loading, successful data, empty results, and failures explicitly so the UI is accessible and each tier can be tested independently.
- Logic tier decision: Keep Express route handlers thin and move validation and data aggregation into shared service functions. Translate invalid ObjectIds, missing references, and missing resources into deliberate 4xx responses rather than allowing Mongoose cast errors or 500 responses.
- Data tier decision: Define required Mongoose fields and references in `octofit-tracker/backend/src/models`, seed representative users, teams, activities, and workouts, and make seeding idempotent without deleting unrelated records.
- Activity tracking approach: Validate `userId`, `teamId`, `type`, and `minutes` before persistence; verify both referenced records exist; compute positive points and set `occurredAt` when an activity is created; return the submitted identifiers in API responses.
- Team management approach: Require `name` and `mascot`, default `members` to an empty array, and accept existing user ObjectIds as team members. Preserve submitted team fields in create and list responses.
- Leaderboard approach: Aggregate activity `points` by team, sort totals from highest to lowest, assign sequential 1-based ranks, and expose only `teamName`, `totalPoints`, and `rank`.
- Workout suggestions approach: Resolve the user by decoded email, determine the user's fitness goal and recent activity pattern, select matching workouts, and include a reason that explains the selected focus. Return 404 for an unknown email.

## Test plan

Record the commands you run and what each failure means.

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend`
  - Implement and verify Mongoose schemas and idempotent seed data. Failures here indicate missing required fields, incorrect references/defaults, or seed records that are duplicated or overwrite sentinel data.
- API command: `npm run test:api --prefix octofit-tracker/backend`
  - Implement activity/team routes first, then leaderboard aggregation and workout matching. Failures here indicate contract, validation, reference, aggregation, or HTTP-status issues.
- Frontend command: `npm test --prefix octofit-tracker/frontend`
  - Implement the shared API client and routes one capability at a time. Failures here indicate missing fetching/rendering, loading, empty, or accessible error behavior.
- Backend build command: `npm run build --prefix octofit-tracker/backend`
  - Run after the data and API contracts pass to catch TypeScript and compilation regressions.
- Frontend build command: `npm run build --prefix octofit-tracker/frontend`
  - Run after presentation tests pass to verify the production bundle and route configuration compile.

Implementation order:

1. Complete Mongoose validation and seed behavior; run the data-tier test until it passes.
2. Implement teams and activities, including 4xx validation, then run the API test.
3. Implement leaderboard and workout suggestions, then rerun the API test.
4. Add the shared API client and route rendering; run the frontend test.
5. Run both build commands and inspect the diff. Do not commit or push until all applicable checks pass.
