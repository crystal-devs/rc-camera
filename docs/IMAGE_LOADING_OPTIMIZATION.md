# Image Loading Optimization Plan (Pinterest / Google Photos style)

Audit of the guest gallery (`src/components/photo/PinterestPhotoGrid.tsx` + `PinterestPhotoCard.tsx`)
and the admin gallery (`src/components/photo/PhotoGallery.tsx` → `RowsPhotoGallery.tsx` →
`src/components/album/ProgressiveImage.tsx`), plus the rc-api media pipeline
(`src/utils/file.util.ts`, `src/utils/cloudfront-url.util.ts`).

## How the reference apps do it

- **Pinterest**: masonry layout computed from known image dimensions (never measured from the
  loaded image), a **dominant-color solid background** as placeholder (zero extra bytes —
  it's a hex code in the API payload), lazy loading outside viewport, exact-size variants.
- **Google Photos** ([engineering write-up](https://medium.com/google-design/google-photos-45b714dfbed1)):
  virtualized scrubbable grid, tiny low-quality previews (~q25) scaled up, batched thumbnail
  requests so a fast scroll doesn't waste bandwidth, visible tiles always win priority, and in
  the lightbox the grid thumbnail is scaled up instantly while full-res loads underneath.
- **Modern placeholder standard**: [ThumbHash](https://github.com/evanw/thumbhash) — ~25 bytes
  per image embedded in the API response, decoded client-side to a blurry preview; also encodes
  aspect ratio. Better quality than BlurHash at the same size.
- **Delivery**: immutable variant files behind a CDN with `Cache-Control: public|private,
  max-age=31536000, immutable` and **stable URLs** so browser + edge caches actually hit.

## Findings (ranked by impact)

### 1. CRITICAL — backend: S3 presigned URLs defeat all caching
`rc-api/src/utils/cloudfront-url.util.ts` signs **S3 GetObject presigned URLs** (1h expiry,
`ResponseCacheControl: private, max-age=3600`). Consequences:

- **No CDN**: every image byte is served from the S3 region. Guests on venue 4G in India pull
  from the bucket region with no edge caching.
- **Browser cache busted hourly**: the Redis URL cache expires after ~1h, a new signature is
  generated, the URL changes, and the browser re-downloads bytes it already has. Scrolling the
  same gallery the next day re-downloads everything.
- 50-item pages trigger up to 200 signature computations (4 variants each) — Redis hides most
  of it but it's still per-hour churn.

**Fix (industry standard)**: CloudFront distribution in front of the media bucket (Origin
Access Control), then either:
- **Signed cookies** scoped to the event path (`/events/{eventId}/*`) — set once when the guest
  token / admin session is validated; all `<img>` URLs become **stable plain URLs**, fully
  cacheable by browser and edge. This is what the AWS docs recommend for "many files per
  session" ([signed URLs vs cookies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-choosing-signed-urls-cookies.html)).
- Or CloudFront **signed URLs with long, bucketed expiry** (e.g. expire at next 7-day boundary
  so the URL string is deterministic and stable across requests/sessions).

Set `Cache-Control: max-age=31536000, immutable` as object metadata on variant uploads —
variants never change for a given public_id.

### 2. HIGH — backend: no placeholder data, no variant dimensions
- `MediaMetadata` (`file.util.ts`) returns only original `dimensions` (often `0`) and 4 URLs.
  No ThumbHash / dominant color. The frontend fakes placeholders by downloading the whole
  400px thumbnail (see #3) and fakes aspect ratios from a hardcoded array
  (`PinterestPhotoGrid.tsx:157`) when dimensions are missing.
- srcSet descriptors in both galleries (`400w/800w/1600w` and `400w/1080w/1920w` — note they
  disagree) are guesses, not the real variant widths.

**Fix**: during variant generation (sharp pipeline):
1. Always persist `width`/`height` of the **original and each variant** in the media doc.
2. Compute a **ThumbHash** (resize to ≤100px → `thumbhash` npm package → ~25-byte base64) and
   store it; return it as `placeholder` in `responsive_urls` alongside per-variant widths:
   ```json
   "responsive_urls": {
     "thumbnail": { "url": "...", "width": 400 },
     "display":   { "url": "...", "width": 1080 },
     "full":      { "url": "...", "width": 1920 },
     "original":  { "url": "..." },
     "placeholder": "1QcSHQRnh493V4dIh4eXh1h4kJUI",
     "width": 4032, "height": 3024
   }
   ```
   (Keep the old flat strings during migration; frontend already falls back.)
3. Backfill job for existing media (one-off script over the media collection).

### 3. HIGH — frontend: placeholder downloads a second full image
`PinterestPhotoCard.tsx:105-111` renders the 400px thumbnail as a "placeholder" `<img>` AND
the main `<img>` with a srcSet that may resolve to a different URL → **two network images per
cell**. `ProgressiveImage.tsx:163-169` does the same on admin (mitigated only when srcSet
happens to pick the same thumbnail URL).

**Fix**: replace the placeholder `<img>` with:
- ThumbHash data-URI (decode client-side, `thumbhash` is ~1 KB gzipped), or until #2 ships,
  a neutral dominant-color/`bg-muted` block. **Zero network cost**, instant paint, no CLS.

### 4. MEDIUM — frontend grid issues
- `PinterestPhotoCard.tsx:135`: `loading={index < 12 ? "eager" : "lazy"}` — with virtualization
  already culling offscreen cells, mark only the **first visible row** `fetchPriority="high"`,
  everything else `loading="lazy" fetchpriority="auto"`.
- `ProgressiveImage.tsx`: `priority={index < 30}` makes 30 images eager + `fetchPriority="high"`
  — that steals bandwidth from the truly visible ones. Reduce to the first viewport (~8-12).
- `ProgressiveImage.tsx:98-110`: per-image IntersectionObserver (rootMargin 1000px) is redundant
  under `@tanstack/react-virtual` (overscan 10 rows) and toggling `isInView` off **unmounts**
  images on scroll-away, causing re-decode churn when scrolling back. Remove it; let the
  virtualizer own visibility.
- `ProgressiveImage.tsx:70`: WebP detection reads `sessionStorage('webp-support')` which is
  never written. Drop it — `<picture>`/`Accept` negotiation handles this.
- Unify srcSet `sizes` between guest and admin and drive the `w` descriptors from the real
  variant widths returned by the API (#2).
- Guest and admin use two divergent grid implementations (hand-rolled masonry vs
  tanstack-virtual rows). Long-term: one shared virtualized grid component.

### 5. LOW / polish
- `<link rel="preconnect">` to the media CDN host in `app/layout.tsx` (saves DNS+TLS on first image).
- Google-Photos-style scroll-velocity throttling: skip full-quality requests while flinging
  (placeholders already cover the visual gap). Optional, after the above.
- AVIF variants (sharp supports it; ~20-30% smaller than WebP) — only after CDN caching exists,
  otherwise it just adds processing cost.
- Lightbox (`FullscreenPhotoViewer.tsx`) already does progressive display + neighbor preload —
  keep; switch its first paint to the already-cached grid thumbnail scaled up (Google Photos
  pattern), which it mostly does via `thumbnail` URL.

## The Unsplash variant (large high-quality tiles)

Unsplash uses the same fundamentals (known dimensions, BlurHash placeholder, lazy loading,
immutable CDN URLs) but with **on-the-fly transformation (imgix)** instead of pre-baked
variants, and a layout with 2-3 wide columns at true aspect ratios:

- Every image URL is `?w={exact}&q=80&auto=format&fit=...` — resized at the edge, cached
  globally, AVIF/WebP negotiated per browser. Never the original file.
- Dense srcset (10+ width candidates) so the browser picks a near pixel-perfect size for
  column width × DPR. Quality drops as DPR rises (q≈50 at 2x-3x — artifacts are invisible
  on high-DPI screens).
- True aspect ratios, no `object-cover` cropping — this is most of the "premium" look.

**To implement here**: point ImageKit (already in the stack, supports private S3 origins) at
the media bucket → `ik.imagekit.io/{id}/{path}?tr=w-800,q-80,f-auto`. Build one shared
srcset-helper that emits 200-1600w candidates from a base URL; use it in both grids. For the
large-tile preset request width = column × min(DPR, 2). Remove the 0.75-1.5 aspect-ratio
clamp in `PinterestPhotoGrid` once real dimensions ship (#2). Watch ImageKit bandwidth
pricing — the self-hosted equivalent is CloudFront + AWS Serverless Image Handler.

## Implemented: 3-layer gallery architecture (June 2026)

The frontend now follows the Pinterest/Gestalt structure in `src/components/media-gallery/`:

- **Layer 1 — `GalleryImage.tsx`**: the only image-loading primitive (srcset/sizes via
  `utils/imageSrcset.ts`, color placeholder, fade-in, error state, priority, video badge).
- **Layer 2 — `MediaGrid.tsx` + `layouts.ts`**: one virtualized engine. Pure layout functions
  (`computeMasonryLayout`, `computeJustifiedLayout`) position items up front from aspect
  ratios; only ~2-3 screens of tiles are mounted (handles 3000+ items). Works against window
  scroll (guest) or a scroll container (admin dashboard). Built-in range-based infinite scroll.
- **Layer 3 — wrappers**: `AdminMediaTile.tsx` (selection/moderation overlays),
  `components/guest/GuestPhotoGrid.tsx` (styling_config → grid params, plain tiles; imports
  zero admin code so the guest bundle stays light).

Deleted (superseded): `PinterestPhotoGrid`, `PinterestPhotoCard`, `RowsPhotoGallery`,
`ProgressiveImage`, `PhotoGrid` (legacy unvirtualized), `useImagePreloader`,
`rows-layout`/`layout/utils`, and the dead `GuestPageClient.tsx`.

## Rollout order

| Step | Side | Work | Why first |
|---|---|---|---|
| 1 | backend | CloudFront + OAC + signed cookies (or stable long-lived signed URLs) + immutable cache headers | Biggest win; makes every other optimization compound |
| 2 | backend | Store variant dims + ThumbHash at processing time; extend `responsive_urls`; backfill script | Unblocks real placeholders and correct masonry |
| 3 | frontend | Kill double-download placeholder; ThumbHash decode; fix srcSet widths/sizes | Per-cell bandwidth ~halves |
| 4 | frontend | Priority tuning, remove redundant IO, unmount churn fix | Smoothness on mid-range phones |
| 5 | both | preconnect, AVIF, scroll-velocity throttling, grid unification | Polish |

## Sources
- [Building the Google Photos Web UI — Google Design](https://medium.com/google-design/google-photos-45b714dfbed1)
- [Dominant Colors for Lazy-Loading Images (Pinterest technique)](https://manu.ninja/dominant-colors-for-lazy-loading-images/)
- [ThumbHash](https://github.com/evanw/thumbhash) · [ThumbHash discussion](https://news.ycombinator.com/item?id=35265752)
- [Blurry image placeholders compared — Mux](https://www.mux.com/blog/blurry-image-placeholders-on-the-web)
- [CloudFront: signed URLs vs signed cookies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-choosing-signed-urls-cookies.html)
- [CloudFront signed cookies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-signed-cookies.html)
