This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Profiles

When a user registers, a profile is automatically created in the `public.profiles` table. This is handled by the `registerUser` server action in `src/features/auth/auth.actions.ts`.

The `profiles` table contains the following columns:
- `id` (uuid, primary key, references `auth.users(id)` on delete cascade)
- `email` (text, unique, not null)
- `username` (text, unique, not null)
- `display_name` (text, nullable)
- `avatar_url` (text, nullable)
- `bio` (text, nullable)
- `created_at` (timestamp with time zone, default now())
- `updated_at` (timestamp with time zone, default now())

The `updated_at` column is automatically updated by a Postgres trigger whenever a row is modified.

## Testing

Install dependencies first:

```bash
npm install
```

Run unit/integration tests:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Run end-to-end tests:

```bash
npm run test:e2e
```

Current automated test files:

- `src/features/admin/admin.server.test.ts` (admin moderation queue loading/filter behavior)
- `src/features/admin/admin.actions.test.ts` (admin role/status action rules)
- `src/features/auth/auth.actions.test.ts` (registration action behavior)
- `src/features/auth/lib/validation.test.ts` (auth input validation)
- `src/features/journeys/journeys.actions.test.ts` (journey create/update/delete actions)
- `src/features/moderation/moderation.lib.test.ts` (moderation keyword scan + rich-text extraction)
- `src/features/moderation/moderation.server.test.ts` (moderation log write behavior for user/service clients)
- `src/features/moderation/huggingface-moderation.test.ts` (Hugging Face moderation API integration behavior)
- `src/features/moderation/huggingface-image-moderation.test.ts` (Hugging Face image moderation API integration behavior)
- `src/features/posts/posts.actions.test.ts` (post create/update/delete actions)
- `src/features/profiles/profile.actions.test.ts` (profile update action)
- `e2e/home.spec.ts` (home page smoke test)
- `e2e/routes.spec.ts` (about/login/register/search route smoke tests)
- `e2e/authenticated.spec.ts` (authenticated flows: protected pages, auth-page redirect, journey+post CRUD, admin moderation tab access, admin ban enforcement)

For a detailed guide (expected results, red flags, and admin dashboard test runner), see [TESTING_README.md](./TESTING_README.md).

For moderation architecture, rules, logging flow, and text vs image handling limits, see [MODERATION_README.md](./MODERATION_README.md).

For provider-specific AI integration details (text + image models, env vars, and flow), see [AI_MODERATION_README.md](./AI_MODERATION_README.md).
