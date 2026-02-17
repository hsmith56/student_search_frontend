# AGENTS.md

## Project Overview
- Project: `Student_Search/Frontend` (Next.js 15 + React 19 + TypeScript + Tailwind CSS v4).
- Purpose: internal student placement tooling with authenticated search, news feed alerts, feedback board, RPM operations, and full student profile views.
- App style: primarily client-rendered feature pages with shared auth and notification providers.

## Architecture And Structure
- `app/`: App Router route entry points and global layout.
  - `app/layout.tsx`: global providers (`AuthProvider`, `NotificationsProvider`) and global CSS.
  - `app/page.tsx`: authenticated shell that switches between search/news/feedback in an embedded view mode.
  - `app/login/page.tsx`, `app/newsFeed/page.tsx`, `app/feedback/page.tsx`, `app/rpm/page.tsx`, `app/StudentProfile/page.tsx`: route-level pages.
- `features/`: domain feature modules (primary location for page behavior and business logic).
  - `features/student-search/`: largest feature (controller hook, filters, dialogs, results UI, constants/types).
  - `features/news-feed/`, `features/feedback/`, `features/rpm/`: route-level feature pages.
- `components/`: reusable UI and layout primitives.
  - `components/ui/`: shadcn-style primitives.
  - `components/layout/`: shared `Header` and `Footer`.
- `contexts/`: cross-cutting app state.
  - `contexts/auth-context.tsx`: cookie-based auth/session lifecycle.
  - `contexts/notifications-context.tsx`: WebSocket alerts and unread counts.
- `lib/`: shared utilities (`client-cache.ts`, `utils.ts`).
- `public/`: static assets.
- Root branding asset: `color_palette.png`.

## Design And Branding Requirements
- Treat `color_palette.png` as the source of truth for brand colors.
- For any new UI or visual refactor:
  - Pick colors from `color_palette.png` and keep the same visual family.
  - Prefer defining/reusing CSS variables before introducing raw one-off colors.
  - Do not introduce unrelated accent colors unless explicitly requested.
  - Keep contrast accessible for text, controls, and focus states.
- Existing pages have distinct visual themes; preserve their layout language while aligning color choices to `color_palette.png`.

## Build And Test Commands
- Install deps: `npm install`
- Dev server: `npm run dev`
- Production build: `npm run build`
- Run production server: `npm run start`
- Lint: `npm run lint`
- Type-check (recommended): `npx tsc --noEmit`

## Code Style Guidelines
- Language/tooling:
  - TypeScript with `strict` mode enabled.
  - Use `@/*` path alias imports.
  - Keep files `.ts/.tsx`; avoid adding plain JS unless required.
- App structure:
  - Keep route files in `app/` thin; place feature logic inside `features/*`.
  - Reuse existing components in `components/ui` and `components/layout` before adding new primitives.
  - Prefer extending feature hooks/controllers (especially in `features/student-search/hooks`) over duplicating fetch/state logic.
- Data and API conventions:
  - Use relative API base (`/api`), not hardcoded external hosts.
  - Include `credentials: "include"` on authenticated requests.
  - Reuse `lib/client-cache.ts` for short-lived client caching and invalidate cache after mutations.
- Styling:
  - Tailwind-first approach with occasional scoped style blocks for page-specific composition.
  - Keep typography/spacing consistent with surrounding feature styles.

## Testing Instructions
- Current state: no committed automated unit/integration test suite in this frontend.
- Minimum verification before submitting changes:
  - `npm run lint`
  - `npm run build`
  - Manual smoke checks for impacted routes/components.
- Manual smoke checklist:
  - Auth flow: login, logout, and redirect behavior.
  - Student Search: query/filter/sort/pagination/favorites.
  - Dialogs: student details, filters, feedback dialog behavior.
  - News Feed: load, refresh, event list rendering, open student detail.
  - Feedback page: load list, refresh, delete behavior.
  - RPM and StudentProfile route render without runtime errors.

## Security Considerations
- Auth/session:
  - Authentication relies on HTTP cookies; do not move auth tokens into `localStorage`/`sessionStorage`.
  - Keep `credentials: "include"` on protected API calls and auth checks.
- Network:
  - Prefer same-origin `/api/*` and `/notifications/ws/*` via proxy/reverse proxy.
  - Optional public env var in use: `NEXT_PUBLIC_NOTIFICATIONS_WS_URL`.
- Frontend safety:
  - Avoid rendering untrusted HTML (`dangerouslySetInnerHTML`) unless sanitized first.
  - Keep external links opened in new tabs protected with `rel="noreferrer"` (or `noopener noreferrer`).
  - Do not log sensitive user or backend payload data in production paths.

## Agent Workflow Tips
- First trace by route: `app/<route>/page.tsx` -> corresponding `features/*` page -> feature hooks/components.
- For student search behavior changes, start in `features/student-search/hooks/use-student-search-controller.ts`.
- For shared top-nav behavior, update `components/layout/Header.tsx` and validate both embedded (`app/page.tsx`) and direct route usage.
- If mutating server data (favorites, feedback, update DB), ensure related client cache keys are invalidated.
- Keep changes focused; avoid broad refactors unless requested.
