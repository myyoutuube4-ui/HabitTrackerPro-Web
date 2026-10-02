# Step 3 — SEO + AdSense setup

This version adds a stronger SEO/content foundation and keeps advertising placeholders inactive until the site owner completes the real Google setup.

## 1. Before deployment

Replace every `YOUR-DOMAIN.example` placeholder with the real HTTPS domain you own in:

- `sitemap.xml`
- `public/robots.txt`
- any absolute canonical/OG URLs added later

Do not invent a publisher ID. Copy the publisher ID shown in your AdSense account.

## 2. Search setup

1. Deploy the site on HTTPS.
2. Verify the domain in Google Search Console.
3. Submit `/sitemap.xml`.
4. Confirm that `https://YOUR-DOMAIN.example/robots.txt` is reachable and returns HTTP 200.
5. Test important URLs as Googlebot/URL Inspection allows.
6. Keep the tracker useful, navigable and accessible from the public site.

## 3. AdSense setup

1. Create/finish the AdSense account.
2. Add the real site in AdSense Sites.
3. Complete the ownership verification method Google provides (ad code, meta tag or ads.txt as instructed in AdSense).
4. After Google gives the actual publisher ID, replace the placeholder comments in `public/ads.txt` with the exact line shown by Google.
5. Add the exact AdSense script Google provides to the site's `<head>` as instructed by the AdSense UI.
6. Keep ad placeholders on informational pages until the real ad units are configured.

## 4. Consent

If personalized Google ads are served to visitors in the EEA, UK or Switzerland, configure a Google-certified CMP integrated with the IAB TCF as required by Google's current EU user consent policy. Review the live policy before deployment.

## 5. Content

The site now contains:

- 8 guide articles
- a guide hub
- About
- Privacy
- Terms
- Contact
- a focused tracker product page
- internal links between guides and the tracker
- Article/Breadcrumb structured data on guide pages
- WebApplication/Organization/CollectionPage structured data where appropriate

Do not publish copied or lightly rewritten articles. Continue adding useful original content that directly serves the site's audience.

## 6. Ad placement principle

Do not put ads in a way that makes the tracker difficult to use or makes ads look like navigation or controls. Keep clear spacing and labels, and review each page after the actual ad units are active.

## 7. Final checks before requesting review

- Real domain and HTTPS
- Real contact email
- Privacy and Terms reviewed for the actual configuration
- No placeholder publisher IDs
- `ads.txt` updated from AdSense
- Sitemap uses the real domain
- Robots file uses the real domain
- Public pages are reachable without login
- Main content is original and useful
- Mobile layout works
- No broken internal links
- 404 page works
- Consent configuration matches the final ad setup


## Google reference pages checked for this build

- AdSense eligibility: https://support.google.com/adsense/answer/9724
- Make pages ready for AdSense: https://support.google.com/adsense/answer/7299563
- Add and verify a site in AdSense: https://support.google.com/adsense/answer/12131223
- ads.txt: https://support.google.com/adsense/answer/9785052
- EU/UK/Switzerland consent requirements: https://support.google.com/adsense/answer/13554116
