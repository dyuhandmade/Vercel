# Catalog model audit after rendering fixes

Audited 27 live product URLs from the local storefront sitemap on 2026-10-02. Each product was opened at 1440 × 1000 in Chrome with software WebGL. The audit paused image autoplay, waited for model readiness, and captured the model at its initial angle, after four right-rotation clicks, and after eight right-rotation clicks.

## Runtime result

- 27 of 27 models reached ready state.
- No browser page errors and no failed requests were recorded.
- All inspected models stayed inside the viewer frame. No missing/open rear faces were apparent in these three captured angles.
- 25 models use manufactured solid inference and two gift sets use photographic relief. No models now use the hand-shaped silhouette fallback.

## Visual findings after fixes

- **Camphora Pink Salt:** closed opaque carton and soap rear surfaces. The beige carton band now continues across the reverse. No real rear-label image exists among its gallery photos, so printed rear artwork remains unavailable rather than fabricated.
- **Tea Tree, Charcoal Mint and Red Sandalwood:** their green/black/red carton bands now continue across the reverse. Pale lettering no longer breaks the Tea Tree band detection.
- **Triple Body Butter Lavender and Sandalwood:** actual visible cream opening and metal rim are isolated into a closed tin. Hands and marketing captions are excluded from the 3D geometry. The reverse is silver metal; curved wall normals now produce a smooth reflection while preserving cap boundaries.
- **Mud Face Wash:** now uses a closed cylinder with the full warm glass body. The crop no longer stops at the last neutral-colored row and makes the jar too shallow. Handle: `mud-face-wash`.
- **Body Ubtan Tea Tree (duplicate handle):** the strongly stretched gray/green rear imagery is corrected. The front source photo still contains ingredients at its base, which can remain in the projected source texture. Handle: `body-ubtan-tea-tree-1`.
- The two gift sets remain explicitly described as photographic relief in the UI and have a plain reverse. Handles: `floral-soap-gift-set`, `wellness-trio-soap-bundle`.
- All catalog models render without visible clipping/holes at the three audited angles. Unseen rear surfaces remain inferred materials, not verified replicas of actual rear packaging.

Contact sheets: `contact-front.png`, `contact-side.png`, `contact-back.png`. Per-product screenshots and detailed metadata, including `partKinds`, are adjacent. After the full catalog review, six affected products were checked again at all three angles following the final Tea Tree, Mud Face Wash, and tin-normal corrections; these current results are merged into the 27-product report. No browser errors or failed requests were recorded in the final checks. The production build and 16 gallery behavior tests passed.
