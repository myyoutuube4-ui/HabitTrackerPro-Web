# HabitTracker Pro Web

Browser-based edition of HabitTracker Pro with a responsive tracker, public guide content, SEO metadata and AdSense setup placeholders.

## Run locally

```bash
npm install
npm run dev
```

## Step 3 additions

- Expanded original guide library
- Search-friendly titles and descriptions
- Open Graph/Twitter metadata
- WebApplication/Organization/CollectionPage/Article/Breadcrumb structured data
- Expanded sitemap and robots configuration
- Privacy page aligned with local storage + planned advertising configuration
- `STEP3-SEO-ADSENSE-SETUP.md` with deployment checklist
- `ads.txt` remains a safe placeholder until Google provides the real publisher line

## Important

Replace the `YOUR-DOMAIN.example` placeholders with the real domain before publishing. Do not publish a fake AdSense publisher ID. Review legal/contact content against the final site configuration before requesting an AdSense review.
## Netlify/Vite build fix
The public HTML pages use module loading for the shared `site.js`, and the homepage canonical URL is an absolute placeholder URL so Vite does not treat `/` as a filesystem asset directory during multi-page builds. Replace `YOUR-DOMAIN.example` before production launch.
