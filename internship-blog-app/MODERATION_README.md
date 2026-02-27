# Moderation README

## Overview

This project uses an MVP moderation logging system.

- Content is **not blocked** in this phase.
- Potentially inappropriate content is **logged** into `public.moderation_log`.
- Admins review logs in the Admin Dashboard (`/admin?tab=moderation`).

## What Is Moderated

The system scans and logs these text fields:

- `username`
- `profile_bio`
- `journey_title`
- `journey_description`
- `post_title`
- `post_content` (rich-text body converted to plain text)
- `post_image` (embedded post image URLs)

## Where Moderation Happens

Write-path hooks:

- Registration username:
  - `src/features/auth/auth.actions.ts`
- Profile bio updates:
  - `src/features/profiles/profile.actions.ts`
- Journey create/update title/description:
  - `src/features/journeys/journeys.actions.ts`
- Post create/update title/content:
  - `src/features/posts/posts.actions.ts`

Core moderation logic:

- `src/features/moderation/moderation.lib.ts`
  - keyword scan rules
  - preview generation
  - rich-text content extraction
- `src/features/moderation/moderation.server.ts`
  - runs online moderation + fallback scanner, then inserts moderation log records
- `src/features/moderation/huggingface-moderation.ts`
  - Hugging Face Inference API moderation integration
- `src/features/moderation/huggingface-image-moderation.ts`
  - Hugging Face image moderation integration (NSFW-style labels)

Database schema:

- `supabase_migrations/013_add_moderation_log_and_queue.sql`

## How Text Is Evaluated

Text is evaluated in this order:

1. Hugging Face moderation model (if `HUGGINGFACE_API_KEY` is configured)
2. Local keyword scanner fallback in `moderation.lib.ts`

Current keyword categories include terms such as:

- spam/scam/fraud
- hate/racist/racism/racial slur
- violence/abuse

You can add extra project-specific keywords (comma-separated) using:

- `MODERATION_EXTRA_KEYWORDS`
- `HUGGINGFACE_API_KEY` enables online moderation
- `HUGGINGFACE_MODERATION_MODEL` sets model name (default `unitary/toxic-bert`)
- `HUGGINGFACE_MODERATION_THRESHOLD` sets minimum label score (default `0.7`)

If a match is found:

- content is still saved (MVP behavior)
- a moderation record is created with:
  - `user_id`
  - `content_type`
  - `related_entity_id`
  - `flag_reason`
  - `content_preview`
  - `status = 'pending'`

## How Images Are Moderated

Current status: **enabled for post embedded images**.

- Post rich-text image nodes are parsed for image `src` URLs.
- The server fetches image bytes and calls the Hugging Face image model.
- If labels such as `nsfw`, `nudity`, or `explicit` exceed threshold, a moderation log entry is created.
- Current scope is post embedded images; profile/avatar image moderation is not yet included.

## Admin Queue

In `/admin?tab=moderation`, admins can:

- filter queue by status (`pending`, `reviewed`, `dismissed`)
- filter queue by status (`pending`, `reviewed`, `dismissed`, `action_taken`)
- search by username, content type, reason, or content preview
- open related content
- mark entries as `reviewed`
- dismiss entries as `dismissed`
- ban flagged user
- delete flagged content
- delete all content for flagged user
- delete moderation log row

No destructive moderation actions are performed by this queue in this phase.

## Permissions

RLS policies on `moderation_log` enforce:

- only admins can view queue entries
- only admins can update moderation status
- insert is allowed for own user id (and admin)

## Tests Covering Moderation

- `src/features/moderation/moderation.lib.test.ts`
  - keyword detection
  - hate speech detection for racist wording
  - custom keyword detection via env
  - non-flagged clean text
  - rich-text extraction
- `src/features/moderation/moderation.server.test.ts`
  - no insert for clean text
  - insert for flagged text
  - service-role logging path
  - Hugging Face moderation result path
- `src/features/moderation/huggingface-image-moderation.test.ts`
  - image model API key missing path
  - flagged image response handling
  - safe image response handling
- `src/features/moderation/huggingface-moderation.test.ts`
  - API key missing path
  - flagged response handling
  - clean response handling
- `src/features/admin/admin.server.test.ts`
  - moderation queue loading/mapping
  - moderation queue search behavior
- `src/features/admin/admin.actions.test.ts`
  - moderation status action validation and review update
  - moderation enforcement actions (ban user, delete flagged content, delete all user content, delete moderation log)
- `e2e/authenticated.spec.ts`
  - admin moderation tab access

## Known Limitations (Current PR)

- If `HUGGINGFACE_API_KEY` is not set, moderation is keyword-based only.
- Image moderation currently covers post embedded images only.
- No deduplication/rate-limiting of repeated log entries.
- No confidence scoring.
- No temporary bans or strike system.
