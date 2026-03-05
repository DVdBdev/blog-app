# AI Moderation Integration README

## Overview

This project uses Hugging Face models to moderate both text and images.

Moderation is enforced in two phases:

- block path: unsafe content can be blocked before save
- logging path: flagged content is written to `public.moderation_log`
- admin review: admins review queue entries in `/admin?tab=moderation`

## Text Moderation

Provider:

- Hugging Face Inference API
- default model: `unitary/toxic-bert`

Code:

- `src/features/moderation/huggingface-moderation.ts`
- `src/features/moderation/moderation.policy.ts`
- `src/features/moderation/moderation.server.ts`

Flow:

1. Content text is normalized/extracted.
2. App calls HF text model for label scores.
3. Block policy checks label scores against block thresholds.
4. If unsafe labels pass block threshold, content is blocked and a moderation log entry is created.
5. If HF is unavailable, local keyword fallback can still block for text.
6. Logging path still runs and records flagged text entries.

Config:

- `HUGGINGFACE_API_KEY`
- `HUGGINGFACE_MODERATION_MODEL`
- `HUGGINGFACE_MODERATION_THRESHOLD` (logging scanner threshold)
- `HUGGINGFACE_MODERATION_BLOCK_THRESHOLD` (general text block threshold)
- `HUGGINGFACE_MODERATION_BLOCK_THRESHOLD_SEVERE` (severe-label text block threshold)
- `HUGGINGFACE_MODERATION_TIMEOUT_MS`
- `MODERATION_EXTRA_KEYWORDS` (local fallback extension list)
- `MODERATION_DEBUG_LOGS`

## Image Moderation

Provider:

- Hugging Face Inference API
- default model: `Falconsai/nsfw_image_detection`

Code:

- `src/features/moderation/huggingface-image-moderation.ts`
- `src/features/moderation/moderation.policy.ts`
- `src/features/moderation/moderation.server.ts`
- `src/features/posts/posts.actions.ts`

Flow:

1. Post rich-text JSON is parsed for image nodes (`attrs.src`).
2. Image URL is fetched server-side.
3. Image bytes are sent to HF image model.
4. Block policy checks unsafe image labels against image block threshold.
5. If threshold is exceeded, content is blocked and a moderation log entry is created (`content_type = post_image`).
6. Logging path can also write flagged image entries.

Current image coverage:

- post rich-text embedded images (create/update)

Not covered yet:

- avatar/profile images
- journey cover images

Config:

- `HUGGINGFACE_IMAGE_MODERATION_MODEL`
- `HUGGINGFACE_IMAGE_MODERATION_THRESHOLD` (logging scanner threshold)
- `HUGGINGFACE_IMAGE_BLOCK_THRESHOLD` (image block threshold)
- `HUGGINGFACE_IMAGE_MODERATION_TIMEOUT_MS`

## Database Changes

- `supabase_migrations/013_add_moderation_log_and_queue.sql`: base moderation table
- `supabase_migrations/014_add_post_image_moderation_type.sql`: adds enum value `post_image`

## Test Coverage

- `src/features/moderation/huggingface-moderation.test.ts`
- `src/features/moderation/huggingface-image-moderation.test.ts`
- `src/features/moderation/moderation.lib.test.ts`
- `src/features/moderation/moderation.server.test.ts`
- `src/features/posts/posts.actions.test.ts` (text + embedded image moderation paths)
- `src/features/journeys/journeys.actions.test.ts`
- `src/features/profiles/profile.actions.test.ts`
- `src/features/auth/auth.actions.test.ts`

## Running Checks

Unit tests:

```bash
npm run test -- src/features/moderation/huggingface-moderation.test.ts src/features/moderation/huggingface-image-moderation.test.ts src/features/moderation/moderation.server.test.ts src/features/moderation/moderation.lib.test.ts src/features/posts/posts.actions.test.ts src/features/journeys/journeys.actions.test.ts src/features/profiles/profile.actions.test.ts src/features/auth/auth.actions.test.ts
```

Manual check:

1. Add HF key in `.env`.
2. Restart server.
3. Try creating content with unsafe text and/or an unsafe embedded image URL.
4. Verify blocked content returns moderation details and is not saved.
5. Verify moderation entries appear in `/admin?tab=moderation` and can be reviewed/enforced.
