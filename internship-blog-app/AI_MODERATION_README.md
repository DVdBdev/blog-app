# AI Moderation Integration README

## Overview

This project uses Hugging Face models to scrub both text and images for moderation signals.

Moderation is logging-only in this phase:

- content is saved
- flagged entries are written to `public.moderation_log`
- admins review flags in `/admin?tab=moderation`

## Text Moderation

Provider:

- Hugging Face Inference API
- default model: `unitary/toxic-bert`

Code:

- `src/features/moderation/huggingface-moderation.ts`
- `src/features/moderation/moderation.server.ts`

Flow:

1. Content text is normalized/extracted.
2. App calls HF text model.
3. If labels like toxic/hate/violence pass threshold, log entry is created.
4. If HF is unavailable or no key is set, fallback local keyword rules still run.

Config:

- `HUGGINGFACE_API_KEY`
- `HUGGINGFACE_MODERATION_MODEL`
- `HUGGINGFACE_MODERATION_THRESHOLD`
- `MODERATION_EXTRA_KEYWORDS` (local fallback extension list)

## Image Moderation

Provider:

- Hugging Face Inference API
- default model: `Falconsai/nsfw_image_detection`

Code:

- `src/features/moderation/huggingface-image-moderation.ts`
- `src/features/moderation/moderation.server.ts`
- `src/features/posts/posts.actions.ts`

Flow:

1. Post rich-text JSON is parsed for image nodes (`attrs.src`).
2. Image URL is fetched server-side.
3. Image bytes are sent to HF image model.
4. If NSFW-like labels exceed threshold, a moderation log entry is created with `content_type = post_image`.

Current image coverage:

- post rich-text embedded images

Not covered yet:

- avatar/profile images
- journey cover images (if added in future)

Config:

- `HUGGINGFACE_IMAGE_MODERATION_MODEL`
- `HUGGINGFACE_IMAGE_MODERATION_THRESHOLD`

## Database Changes

- `supabase_migrations/013_add_moderation_log_and_queue.sql`: base moderation table
- `supabase_migrations/014_add_post_image_moderation_type.sql`: adds enum value `post_image`

## Test Coverage

- `src/features/moderation/huggingface-moderation.test.ts`
- `src/features/moderation/huggingface-image-moderation.test.ts`
- `src/features/moderation/moderation.lib.test.ts`
- `src/features/moderation/moderation.server.test.ts`
- `src/features/posts/posts.actions.test.ts` (embedded image moderation logging path)

## Running Checks

Unit tests:

```bash
npm run test -- src/features/moderation/huggingface-moderation.test.ts src/features/moderation/huggingface-image-moderation.test.ts src/features/moderation/moderation.server.test.ts src/features/moderation/moderation.lib.test.ts src/features/posts/posts.actions.test.ts
```

Manual check:

1. Add HF key in `.env`
2. Restart server
3. Create a post containing:
   - toxic text (for text model)
   - an image URL likely to trigger NSFW detection (for image model)
4. Verify entry appears in moderation queue
5. Mark reviewed/dismissed and verify status change in moderation queue
