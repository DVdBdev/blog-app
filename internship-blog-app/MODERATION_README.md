# Moderation README

## Overview

This project uses an MVP moderation system with both blocking and logging.

- Unsafe content can be blocked before save.
- Flagged content is logged into `public.moderation_log`.
- Admins review logs in the Admin Dashboard (`/admin?tab=moderation`).

## What Is Moderated

The system evaluates these content types:

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
- Journey create/update title and description:
  - `src/features/journeys/journeys.actions.ts`
- Post create/update title/content and embedded images:
  - `src/features/posts/posts.actions.ts`

Core moderation logic:

- `src/features/moderation/moderation.lib.ts`
  - keyword scan rules
  - preview generation
  - rich-text content extraction
- `src/features/moderation/huggingface-moderation.ts`
  - Hugging Face text label scoring + logging threshold scan
- `src/features/moderation/huggingface-image-moderation.ts`
  - Hugging Face image label scoring + logging threshold scan
- `src/features/moderation/moderation.policy.ts`
  - block policy thresholds and block-decision details
- `src/features/moderation/moderation.server.ts`
  - enforcement hooks and moderation log insertion

Database schema:

- `supabase_migrations/013_add_moderation_log_and_queue.sql`
- `supabase_migrations/014_add_post_image_moderation_type.sql`

## How Text Is Evaluated

Text evaluation for blocking:

1. Hugging Face detailed moderation labels (if API key is configured)
2. Label threshold policy in `moderation.policy.ts`
3. Local keyword fallback if Hugging Face is unavailable

If blocked:

- content is not saved
- a moderation log record is created
- caller receives moderation block details (reason, confidence, threshold, labels)

Text logging path:

- separate scanner path can still log flagged items to moderation queue

Config:

- `HUGGINGFACE_API_KEY`
- `HUGGINGFACE_MODERATION_MODEL`
- `HUGGINGFACE_MODERATION_THRESHOLD`
- `HUGGINGFACE_MODERATION_BLOCK_THRESHOLD`
- `HUGGINGFACE_MODERATION_BLOCK_THRESHOLD_SEVERE`
- `HUGGINGFACE_MODERATION_TIMEOUT_MS`
- `MODERATION_EXTRA_KEYWORDS`
- `MODERATION_DEBUG_LOGS`

## How Images Are Moderated

Current status: enabled for post embedded images.

- Post rich-text image nodes are parsed for `src` URLs.
- The server fetches image bytes and calls the Hugging Face image model.
- Blocking uses `HUGGINGFACE_IMAGE_BLOCK_THRESHOLD`.
- Logging scanner uses `HUGGINGFACE_IMAGE_MODERATION_THRESHOLD`.
- Profile/avatar and journey cover image moderation are not yet included.

## Admin Queue

In `/admin?tab=moderation`, admins can:

- filter queue by status (`pending`, `reviewed`, `dismissed`, `action_taken`)
- search by username, content type, reason, or content preview
- open related content
- mark entries as reviewed or dismissed
- take enforcement actions (ban user, delete flagged content, delete all user content)
- delete moderation log rows

## Permissions

RLS policies on `moderation_log` enforce:

- only admins can view queue entries
- only admins can update moderation status
- insert is allowed for own user id (and admin/service flows)

## Tests Covering Moderation

- `src/features/moderation/moderation.lib.test.ts`
- `src/features/moderation/moderation.server.test.ts`
- `src/features/moderation/huggingface-image-moderation.test.ts`
- `src/features/moderation/huggingface-moderation.test.ts`
- `src/features/admin/admin.server.test.ts`
- `src/features/admin/admin.actions.test.ts`
- `src/features/auth/auth.actions.test.ts`
- `src/features/profiles/profile.actions.test.ts`
- `src/features/journeys/journeys.actions.test.ts`
- `src/features/posts/posts.actions.test.ts`
- `e2e/authenticated.spec.ts`

## Known Limitations

- If `HUGGINGFACE_API_KEY` is not set, AI moderation is unavailable; text fallback rules still apply.
- Image moderation currently covers post embedded images only.
- No deduplication/rate-limiting of repeated log entries.
- No strike/temporary-ban automation.
