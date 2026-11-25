# CarInsure

Astro landing page with a scroll-scrubbed 2D car story.

    npm install
    npm run dev      # http://localhost:4321
    npm run build    # static site in dist/

| File | What to change there |
|------|----------------------|
| `src/data/chapters.js` | Coverage copy |
| `src/scripts/scene.js` | SVG artwork and per-chapter animation timing |
| `src/scripts/story.js` | Scroll-to-timeline mapping and camera framing |
| `src/components/` | Page sections |
| `public/assets/tow/` | Car and tow truck artwork |
| `public/assets/extracted/` | Character artwork |
| `public/assets/house/` | House, hills, trees, bushes and clouds (sizes listed in `src/scripts/art.js`) |

Brand name, prices and FAQ answers are placeholders. The quote page (`src/pages/quote.astro`) only validates; it sends nothing.
