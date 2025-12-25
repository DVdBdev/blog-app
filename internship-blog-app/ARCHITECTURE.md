# Architecture Overview

## Component responsibilities

- `app/`
  - Routing and layout composition only
  - No data fetching logic

- `components/`
  - Reusable UI primitives
  - No business logic
  - No direct data access

- `features/*`
  - Domain logic (journeys, posts, comments)
  - Feature-specific components
  - Services handle data access

- `services/`
  - External systems (Supabase, APIs)

## State management

- Server state lives in Supabase
- Pages receive data via services
- UI state is local (`useState`)
- No global state unless absolutely required

## Performance principles

- Do not over-fetch
- Render lists with summaries only
- Rich text only rendered on detail pages
