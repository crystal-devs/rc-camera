# Media Pipeline Architecture — Images & Video

**Prepared:** 2026-07-03 · System design reference for the upload → process → deliver pipeline across `rc-frontend` + `rc-api`. Written after adding video playback, video compression, and CloudFront CDN delivery — captures how the system actually works today, not an aspirational design.

---

## 1. High-level flow

```
Client (browser)
   │  1. request presigned URL
   ▼
rc-api  ──POST /media/upload-url──▶  S3 presigned PUT URL + Media doc (processing.status: pending)
   │
   │  2. client PUTs file bytes directly to S3 (never touches rc-api's own bandwidth)
   ▼
S3 (events/{eventId}/original/{uploadId}.{ext})
   │
   │  3. client calls upload-complete
   ▼
rc-api  ──POST /media/upload-complete──▶  Media doc: processing.status → 'processing'
   │
   ├── type === 'image'  → external AWS Lambda (S3 event-triggered, not in this repo)
   │                        generates small/medium/large WebP variants,
   │                        calls back POST /media/update-photo (Bearer BACKEND_API_TOKEN)
   │
   └── type === 'video'  → local BullMQ job (video-processing.worker.ts, in-process)
                            extracts poster frame + one compressed 720p transcode via ffmpeg,
                            writes variants directly to the Media doc (no webhook needed —
                            it's already inside rc-api)
   │
   ▼
Media doc: processing.status → 'completed', variants populated
   │
   ▼
Client fetches gallery → rc-api signs CloudFront URLs per variant → CDN → browser
```

**The two media types are processed by two structurally different mechanisms.** This isn't an accident to "fix" — it reflects when each was built and what infra it needed (see §3).

---

## 2. Data model

Single `Media` collection (Mongoose, `rc-api/src/models/media.model.ts`) for both images and videos — one schema, discriminated by `type`.

```
Media {
  upload_id: string              // unique per upload, used to correlate presign → complete → webhook
  type: 'image' | 'video'
  event_id, album_id: ObjectId

  original: {
    public_id: string            // S3 key — the raw uploaded bytes, NEVER modified/deleted
    width, height, duration, format, size_mb
  }

  variants: {
    images:     { small, medium, large: { public_id } }        // images only
    videos:     { p360, p720, p1080: { public_id } }            // videos only — currently only p720 is ever populated (see §4)
    thumbnails: { poster, preview: { public_id } }               // videos only — poster is a real extracted frame
  }

  processing: { status: pending|processing|completed|failed, stage, progress, error }
  approval:   { status: pending|approved|rejected|hidden|auto_approved }
}
```

**Design principle carried through the whole pipeline: the `original` field is sacred.** Every variant is additive; nothing ever overwrites or deletes the raw upload. This is what lets "download original" always mean the literal bytes the user uploaded, and it's also why a completely different processing pipeline (image Lambda vs. video ffmpeg worker) can coexist safely — they only ever write to `variants.*`, never to `original`.

---

## 3. Image pipeline: external Lambda (not in this repo)

- `rc-api` never runs `sharp` for resizing. The `sharp` import that does exist (`media.controller.ts`) only reads `.metadata()` on a legacy multer path — it does not generate variants.
- `rc-api/src/services/upload/shared/queue-processing.service.ts` — `queueImageProcessing()` is a no-op with the comment *"Lambda architecture in use — no local queue needed"*. This is a direct admission in the code.
- The actual resize/WebP-encode happens in an AWS Lambda function triggered by the S3 PUT event. **Its source code is not in either repo** — it's an already-deployed, out-of-workspace function. We only see its output (`x-amz-meta-processed-by: lambda-image-processor` on the resulting S3 objects) and its inbound callback.
- The callback contract: `POST /media/update-photo`, authenticated via `Authorization: Bearer <BACKEND_API_TOKEN>` (`validateLambdaToken.middleware.ts`), handled by `update-media.controller.ts`. Payload shape: `{ uploadId, original: {width, height, aspectRatio}, variants: {small, medium, large}, processedAt }`.
- **Implication for anyone extending this:** if you ever need to change how images are resized (new format, different size tiers, AVIF, etc.), that change happens in the Lambda, which lives outside this workspace. Coordinate with whoever owns that deployment — don't try to replicate it locally by intuition from the webhook shape alone.

---

## 4. Video pipeline: local BullMQ worker (built 2026-07-03)

No video processing existed anywhere before this — no Lambda, no worker, no queue. `variants.thumbnails.poster` and `variants.videos.*` were read-only fields with nothing ever writing to them. This section is what was actually built to close that gap.

**Why a local worker instead of matching the image Lambda pattern:** deploying a new Lambda (with an ffmpeg layer, longer timeout/memory config) requires AWS console access this environment doesn't have, and would be a separate infra decision. The codebase already has a working precedent for heavy async work running in-process — the Rekognition face-indexing worker (BullMQ + AWS SDK call). Video processing follows that same shape, just with ffmpeg instead of an AWS API call.

### Components

| File | Role |
|---|---|
| `rc-api/src/services/video/video-processing.service.ts` | Pure processing logic: download original from S3 → ffprobe for duration/dimensions → extract poster frame → transcode to ≤720p H.264/AAC → upload both outputs back to S3. Self-contained; cleans up its own temp files even on failure. |
| `rc-api/src/queues/video-processing.queue.ts` | BullMQ queue (`video-processing`), 2 retry attempts, exponential backoff. |
| `rc-api/src/workers/video-processing.worker.ts` | Worker with `concurrency: 1` (ffmpeg is CPU-bound — running multiple transcodes in parallel on one instance would starve everything else). Updates the Media doc directly (no webhook — it's already in-process) and broadcasts an SSE event on completion. |
| `rc-api/src/controllers/upload-complete.controller.ts` | Enqueues a `process-video` job whenever `savedMedia.type === 'video'`, right alongside the existing Rekognition enqueue for images. |

### What gets produced

- **Poster** (`variants.thumbnails.poster`): single JPEG frame, extracted at `min(1s, 10% of duration)` — avoids landing on a black opening frame for short clips. 640px wide.
- **Compressed playback variant** (`variants.videos.p720`): H.264/AAC MP4, CRF 23, `veryfast` preset, `+faststart` (moov atom at the front so playback can start before the full file downloads). **Never upscales** — a source already ≤720p tall is re-encoded at its native resolution, not stretched up. On the MDN test clip (1.1MB, 540p original), this alone produced a ~3.3x size reduction purely from consistent codec/bitrate control, before any resolution downscale even applied.
- Only **one** compressed tier is produced today (p720), not the full `p360/p720/p1080` ladder the schema has room for. This was a deliberate scope decision — see §6.

### How playback picks up the compressed variant

`rc-api/src/utils/file.util.ts` — `getResponsiveImageUrlsWithCache()`'s video branch:
- `thumbnail` / `display` → the poster (falls back to the raw original if poster isn't ready yet — see the processing-window caveat in §6).
- `full` → **prefers `variants.videos.p720`**, falls back to `p1080` → `p360` → the raw original, in that order. This is the field the frontend `<video src>` actually uses, so once processing completes, playback automatically switches to the compressed file with zero frontend changes.
- `original` → always the true raw upload, untouched. Used for "download original."

---

## 5. CDN delivery (CloudFront)

Both pipelines converge on the same delivery layer — this is what makes it safe for two different processing mechanisms to write into the same `variants.*` structure.

- **Distribution:** `rc-media` (default `*.cloudfront.net` domain — no custom domain needed for this to work), origin = the private S3 media bucket via **Origin Access Control (OAC)**. The bucket is not publicly readable; only CloudFront can reach it.
- **Access control:** "Restrict viewer access" with a **trusted key group** (RSA key pair; public key uploaded to CloudFront, private key in `rc-api` env only). Every media URL served to a client is a CloudFront-signed URL — no signature, no access (verified: unsigned requests return `403`).
- **Signing:** `rc-api/src/utils/cloudfront-url.util.ts` — `getCachedSignedUrl(s3Key, expiresIn)` uses `@aws-sdk/cloudfront-signer` to generate real CloudFront signatures (this replaced an earlier, non-functional implementation that signed an S3 `GetObject` request and just swapped the hostname — that approach doesn't satisfy CloudFront's viewer-access restriction at all).
- **Expiry:** defaults to `CLOUDFRONT_URL_EXPIRATION` (24h), not 1h — a deliberately longer default than the old S3-presigned-URL approach, since the whole point of the CDN is for the same signed URL to be reusable/cacheable across a session instead of regenerating (and busting the browser cache) every hour.
- **Caching:** variant objects are uploaded with `Cache-Control: public, max-age=31536000, immutable` — they're immutable by naming convention (a new upload gets a new `uploadId`, never overwrites an existing key), so this is safe.
- Env config: `USE_CLOUDFRONT`, `CLOUDFRONT_DOMAIN`, `CLOUDFRONT_KEY_PAIR_ID`, `CLOUDFRONT_PRIVATE_KEY`, `CLOUDFRONT_URL_EXPIRATION` (`rc-api/src/configs/cloudfront.config.ts`).

---

## 6. Known gaps / deliberate scope cuts

These are documented on purpose so nobody re-discovers them from scratch:

- **Single 720p tier, not a bitrate ladder.** True adaptive bitrate streaming (HLS/DASH — the "Netflix-style" reference point from competitor research) needs a multi-rendition transcode + `.m3u8` manifests + an `hls.js` player on the frontend. That's a materially larger project (new storage layout, new player dependency, per-minute transcode cost at scale) deliberately deferred in favor of shipping one compressed tier first.
- **Processing-window gap.** Between upload and the worker finishing (typically seconds, but scales with video length/resolution), a video has no poster yet. `getResponsiveImageUrlsWithCache` falls back to the raw original URL for the thumbnail/display fields in that window, which a browser can't render as an `<img>` — the frontend's `GalleryImage.tsx` catches this via its `onError` handler and shows a neutral placeholder icon instead of a broken image. This matches how images already behave in the same window (no confirmed real-time variant-swap notification to guests today — see next point), so it's not a regression, just an existing rough edge inherited by video.
- **No verified real-time "processing complete" push to guests.** `update-media.controller.ts` (the image Lambda's webhook handler) calls `mediaNotificationService.broadcastProcessingComplete(...)`, but that method is a documented no-op — the comment says *"Processing progress is now handled via SSE"*, but nothing was found wiring general processing-completion through the SSE service for guests either (the existing SSE route is admin-facing upload-progress). The video worker broadcasts via `sseService.broadcast(eventId, 'media-processing-complete', ...)` to at least match current reality, but a guest's gallery may not update live without a manual refetch until this is addressed properly.
- **Two unrelated upload code paths exist, with different video support — worth knowing before touching either:**
  - **Admin/co-host dashboard** (`PhotoUploadDialog.tsx` → `useUploadMultipleMedia` → `getBulkUploadUrls()` → `POST /media/upload-url` → `generateBatchUploadUrlsController`): the presigned-URL flow, direct-to-S3. Until 2026-07-03 this endpoint hard-rejected any `fileType` that wasn't `image/*` (HTTP 400) and hardcoded `type: 'image'` on the created `Media` doc regardless of the real file — meaning admin video upload was completely broken even though the file picker (`accept="image/*,video/*"`) and client-side validation both allowed selecting a video. Fixed in `rc-api/src/controllers/upload-url.controller.ts` (`generateBatchUploadUrlsController`): now accepts `video/*`, and derives `type`/`original.width`/`original.height`/`original.duration` from the real MIME type instead of assuming image.
  - **Guest upload** (`GuestUploadDialog.tsx`/`UploadDialog.tsx` → `uploadGuestPhotos()` → `POST /media/guest/:share_token/upload`): a separate, legacy **multer multipart** flow (bytes go through the Express server, not a direct-to-S3 presign). Its `fileFilter` already accepts `/^(image|video)\//` and `guestUploadMediaController` already derives `type` correctly from the real mimetype — this path already worked for video before any of today's changes. **Caveat:** multer is configured with a 10MB-per-file limit on this route (`media.router.ts`), which is small for real event video clips — worth revisiting if guest video uploads start failing silently over that size.
  - No dedicated "video upload" endpoint exists in `src/lib/api-routes.ts` — both flows are shared image/video endpoints, now that the admin path's image-only restriction is fixed.
- **ThumbHash / real per-variant dimensions** — the image side still guesses srcset widths (`rc-frontend/src/utils/imageSrcset.ts`) rather than reading real per-variant dimensions from the API; out of scope here, tracked in `docs/IMAGE_LOADING_OPTIMIZATION.md`.

---

## 7. Frontend consumption (unchanged by media type)

The frontend gallery layer (`rc-frontend/src/components/media-gallery/`) doesn't know or care which backend pipeline produced a variant — it only ever reads the `responsive_urls` contract (`thumbnail/display/full/original`) that both pipelines converge on:

- **`GalleryImage.tsx`** — the one image/video-thumbnail rendering primitive for grids. Renders a play-badge overlay when `type === 'video'`; the tile itself is always an `<img>` (the poster), never a `<video>` — videos only become `<video>` elements in the fullscreen viewer.
- **`FullscreenPhotoViewer.tsx`** — renders a real `<video controls>` element (poster = `responsive_urls.thumbnail`, src = `responsive_urls.full`) when `selectedPhoto.type === 'video'`, otherwise the existing progressive `<img>`.
- **Type must survive every mapping step.** This was the actual root cause of video playback not working end-to-end even after the viewer supported it: `guest/[token]/page.tsx` was hardcoding `type: 'image' as const` when constructing the objects passed into the viewer — silently overwriting the real type from the API on every single item. Any future refactor of these mapping functions must preserve `type`, or video support silently regresses again with no compile error (TypeScript won't catch a literal `'image'` being a valid assignment).

---

## 8. Future: AI image/video editing

Noted because it changes how "done" the video pipeline needs to be before that work starts: an AI editing/enhancement feature (Higgsfield-style) will want to operate on a **normalized** input — consistent codec, consistent resolution ceiling, no arbitrary phone-camera HEVC/4K variance. The 720p H.264 transcode this pipeline now produces is a reasonable normalized input for that future work, not just a bandwidth optimization for guests today. Worth keeping in mind when deciding whether to extend §4 into a full transcode ladder later — the normalized single tier may end up serving double duty as "the AI pipeline's input" too.
