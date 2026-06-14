# Hide and Seeds — Website

Marketing site for **Hide and Seeds Production**, an award-winning CG studio
(Puchong, Malaysia). Static, multi-page, no build step. The look is an
interactive WebGL "iridescent fluid" world with ink-splatter video reveals and
a liquid-distortion cursor — ported from the Claude Design concept.

## Pages
| File | Purpose |
|------|---------|
| `index.html` | Landing — hero demoreel, about, featured projects (ink reveals), services, clients, CTA |
| `projects.html` | Selected work (Biji, Biji Buddy Bash, showreel, commercial, cinematic) |
| `services.html` | Services detail, process, stats |
| `team.html` | Studio, values, crew by discipline |
| `careers.html` | Perks + open roles (apply by email) |
| `news.html` | Latest updates |
| `contact.html` | Contact info + form (mailto) + map |

## Structure
```
css/style.css   shared styles (all pages)
js/main.js      shared behaviour: WebGL shader, ring cursor, ink reveals, mobile nav, scroll reveals
assets/         studio photos + client logos
uploads/        demoreel + service videos (.mp4)
favicon.svg  robots.txt  sitemap.xml  vercel.json
```

## Run locally
No tooling required — serve the folder with any static server:
```
python -m http.server 8770
# open http://localhost:8770
```

## Deploy (Vercel)
Static site, no framework. Import this repo in the Vercel dashboard and deploy —
`vercel.json` sets caching + security headers. No build command needed
(Output Directory: project root).

## Notes
- Falls back to a CSS gradient background if WebGL2 is unavailable.
- Respects `prefers-reduced-motion`.
- Contact form opens the visitor's email client (no backend). Swap for a form
  service (e.g. Formspree) if server-side handling is wanted.
