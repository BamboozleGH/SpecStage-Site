# specstage-site

Marketing site for SpecStage — `https://www.specstage.com/`.

Static HTML / CSS / JS. No build step. Deploys to Cloudflare Pages.

## Structure

```
index.html          Home (hero, capabilities, CTA)
how-it-works.html   Pipeline explainer
about.html          Mission + principles
privacy.html        Short privacy policy (noindex)
styles.css          All styles
site.js             Cookie banner, GA gating, scroll reveals
logo.svg            SpecStage wordmark + bracket icon
favicon.ico         Browser tab icon
robots.txt          Allows search + LLM crawlers
sitemap.xml         For Google Search Console
llms.txt            Curated index for LLM answer engines
_headers            Cloudflare Pages security + cache headers
```

## Local preview

Open any HTML file directly in a browser, or serve the directory:

```
python -m http.server 8080
# then visit http://localhost:8080
```

## Deploy

1. Push this repo to GitHub.
2. Cloudflare dashboard → Pages → Create project → Connect to GitHub → select `specstage-site`.
3. Build settings: leave blank (no build step). Output directory: `/`.
4. After first deploy, add custom domain `www.specstage.com` and `specstage.com` in Pages settings.
5. Cloudflare will guide DNS — likely `CNAME www → <project>.pages.dev` and an A/AAAA record for the apex.

## Configuring Google Analytics

Replace `G-XXXXXXXXXX` in the four HTML files (search the codebase for that string) with your GA4 measurement ID. The cookie banner gates the GA4 loader — if the user declines, no GA script is loaded.

## Build marker

`/version.txt` carries the current asset version (the `?v=NN` cache-buster) and
date, served with `Cache-Control: no-store`. Bump it together with the
cache-busters on every content push — it lets anyone confirm which build the
edge is serving and ends stale-cache debates.

## Editing copy

Page copy lives directly in the HTML files. Headlines have keyword research baked in (UFGS, SpecsIntact, MILCON, federal construction specifications) — change with care to preserve SEO positioning.
