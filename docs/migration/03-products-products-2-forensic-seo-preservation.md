# BONA FIDE — PRODUCTS / PRODUCTS-2 FORENSIC SEO PRESERVATION REPORT

**Scope:** `https://bonafidenitro.com/products/` and `https://bonafidenitro.com/products-2/`
**Date:** 21 September 2026
**Access used:** Google Search Console (`sc-domain:bonafidenitro.com`), live site (logged-out fetches), authorized WordPress admin.
**Mode:** READ ONLY. Nothing was modified. No page edited, no canonical changed, no redirect created, no sitemap change, no Search Console change, nothing deleted, no file saved. The WordPress block/Thrive editor was **not** opened for either page, so no edit-lock or autosave was written against post 147 or 7801.

**Convention:** **DATA** = directly observed. **INTERPRETATION** = my reading of it. Where WordPress does not prove history, this report says so.

---

## 1. EXECUTIVE FINDING

**DATA.** `/products-2/` is WordPress **page ID 7801**, created **2022-04-25 10:10:18**, and its WordPress post title is **"Products NEW"**. `/products/` is **page ID 147**, created **2017-10-17**, WordPress title **"Products"**. The site runs an active plugin called **WP Post Page Clone**. Page 7801's earliest retained revision is dated **2022-04-25 10:10:38 — twenty seconds after the page was created** — and it already carried the title "Products NEW" at that point.

**DATA.** The two pages are **not** content duplicates. On the logged-out render:

| `/products/` `/products-2/`   |                       |                                                              |
| ----------------------------- | --------------------- | ------------------------------------------------------------ |
| Rendered HTML                 | 667,745 bytes         | 714,877 bytes                                                |
| Visible text                  | 13,347 chars          | 15,057 chars                                                 |
| Price instances               | **3** (all `$149.00`) | **19** (`$195.00`, `$135.00`, `$125.00`, `$120.00`)          |
| Amazon.com links              | **13**                | **0**                                                        |
| nitrocoffee.store links       | 16                    | 22                                                           |
| Headings (H1–H3)              | 25                    | 31                                                           |
| Images                        | 35                    | 25                                                           |
| "Alliance Brand" partner SKUs | absent                | **6 SKUs present**                                           |
| Bag-in-Box body content       | **present ×2**        | absent (nav link only)                                       |
| Shelf-life claim              | "at least 180 days"   | "at least 120 days"                                          |
| Distribution language         | web store + Amazon    | "Direct Distribution Program", "direct-store-delivery (DSD)" |

**DATA.** Their SEO metadata is byte-identical: same `<title>`, same 212-character meta description, same og/twitter data, same JSON-LD graph, both self-canonical, both `index, follow`. Site-wide, **only three pages on the entire site have a meta description at all** — `/products/`, `/products-2/` and `/services/hair-raiser-organic/`.

**DATA.** Their Search Console query roles are clearly different. Over the last 3 months every one of `/products-2/`'s 22 clicks came from a **branded** query; `/products/` earned the non-branded keg cluster. Over 16 months `/products-2/` is the **best-ranking page on the entire domain** for `pet coffee keg` (767 impressions, position **4.3**, versus `/products/` at position 14.0) and holds \~295 impressions of Caveman-brand queries that exist nowhere else on the site.

**INTERPRETATION — the answer to "why does Google see value in both".**
`/products-2/` is a **2022 clone of** **`/products/`** **created with a page-duplication plugin, which then diverged into a wholesale/distributor product page** carrying a published price list and six alliance/private-label brands that `/products/` does not carry. It was never wired into the navigation and was never renamed, so it kept `/products/`'s inherited Yoast metadata and got the auto-appended `-2` slug. Google kept it because it is a 200-status, self-canonical, sitemap-listed page whose **body content is materially different** — and Google has attached a small but genuinely distinct query set to it (PET kegs, alliance brands, wholesale pricing, some geographic queries) that `/products/` serves worse or not at all.

This is best described as **classification D leaning C**: *different commercial pages whose SEO metadata accidentally became duplicated*, which have since drifted into *partially different Google query sets*.

**Therefore your default position is correct and this investigation supports it:** keep both as static 200s, both self-canonical, both indexed, no redirect at launch.

**One finding outside the brief but too important to omit:** the active Sydney theme's `header.php` contains, on lines 18–19, third-party script injections pointing at two lookalike CDN hosts. See §15. This is the most likely source of the open "Deceptive pages" Safe Browsing flag.

---

## 2. `/products/` — CURRENT ROLE

**DATA (Search Console, 16 months):** 1,171 clicks · 87,725 impressions · 1.3% CTR · avg position 12.7 · 623 distinct queries · 8 external links from 7 domains · linked from 56 of 57 crawlable pages.

**DATA — its query franchise (16 months):**

| Query Clicks Impr Pos  |    |       |      |
| ---------------------- | -- | ----- | ---- |
| cold brew keg          | 82 | 4,591 | 9.1  |
| nitro cold brew keg    | 53 | 3,630 | 9.3  |
| cold brew kegs         | 43 | 1,476 | 7.3  |
| nitro brew keg         | 32 | 870   | 9.0  |
| cold brew coffee keg   | 24 | 925   | 10.2 |
| coffee keg             | 22 | 3,328 | 9.4  |
| nitro coffee keg       | 17 | 1,997 | 8.5  |
| coffee kegs            | 15 | 774   | 7.0  |
| bona fide coffee       | 15 | 419   | 1.3  |
| nitro coffee kegs      | 12 | 207   | 5.6  |
| keg of cold brew       | 11 | 539   | 7.8  |
| bonafide coffee        | 10 | 689   | 1.9  |
| cold brew coffee kegs  | 10 | 556   | 7.5  |
| keg of coffee          | 10 | 509   | 6.7  |

**PAGE PURPOSE TODAY:** the direct-to-customer / e-commerce product page. It sends buyers to the Bona Fide Shopify store (`nitrocoffee.store`, 16 links) and to **Amazon (13 links)**, sells keg *style* variants ("Nitro Style" / "Still (Flat) Style"), cross-sells Bag-in-Box and dispensing equipment, and publishes almost no pricing.

**USER INTENT:** transactional/commercial — "I want to buy a cold brew or nitro coffee keg."

**PRIMARY COMMERCIAL OFFER:** single-keg purchase via web store or Amazon; plus Bag-in-Box and equipment cross-sell.

**PRIMARY SEARCH INTENT:** non-branded commercial "keg" cluster.

**UNIQUE CONTENT:** hero block ("Try The Best Cold Brew On The Market" / "Nitro Coffee And Tea Kegs That Last For Months"); two Bag-in-Box sections including the "Baby in Box" naming; "Buy Securely In Our NitroCoffee.Store And Save" and "Buy Securely On Amazon.com" CTA pairs on every SKU; Nitro/Still style toggles; "Are You Looking For Dispensing Equipment? → CHECK IT HERE"; the 180-day shelf-life claim; "Preferred Master Roasters".

**UNIQUE PRODUCTS:** none exclusive, but names differ — "Espresso Nitro Organic", "Mango Tea", "Passion Fruit Tea".

**UNIQUE VALUE PROPOSITION:** buy it now, from us or Amazon, in the style you want.

**UNIQUE QUERY OWNERSHIP:** essentially the whole non-branded keg cluster. 25 keg-shaped queries resolve here.

---

## 3. `/products-2/` — CURRENT ROLE

**DATA (Search Console, 16 months):** 178 clicks · 23,928 impressions · 0.7% CTR · avg position 10.6 · 258 distinct queries · 0 external links reported · **0 internal links; Google's only referring page for it is** **`wp-sitemap-posts-page-1.xml`**.

**DATA — its query footprint (16 months). Note how little overlaps §2:**

| Query Clicks Impr Pos Also on `/products/`?  |    |         |         |                      |
| -------------------------------------------- | -- | ------- | ------- | -------------------- |
| bona fide coffee                             | 18 | 382     | 1.2     | yes (15 clicks, 1.3) |
| bona fide nitro coffee                       | 11 | 327     | 1.2     | —                    |
| bonafide coffee                              | 8  | 543     | 1.4     | yes (10 clicks, 1.9) |
| bonafide nitro coffee                        | 6  | 121     | 1.2     | —                    |
| kona nitro coffee                            | 1  | 66      | 6.2     | no                   |
| **pet coffee keg**                           | 0  | **767** | **4.3** | yes but at **14.0**  |
| best nitro cold brew keg                     | 0  | 436     | 30.0    | —                    |
| nitro tea                                    | 0  | 191     | 11.7    | —                    |
| **caveman coffee nitro**                     | 0  | 116     | 28.8    | no                   |
| draft nitro coffee                           | 0  | 77      | 10.9    | no                   |
| nitro cold brew denver                       | 0  | 71      | 9.1     | no                   |
| nitro tea and coffee                         | 0  | 64      | 8.2     | no                   |
| **caveman nitro**                            | 0  | 62      | 13.7    | yes but at **18.6**  |
| **caveman coffee nitro caffeine content**    | 0  | 62      | 29.8    | no                   |
| nitro coffee can manufacturer                | 0  | 61      | 9.6     | no                   |
| **caveman nitro coffee**                     | 0  | 55      | 21.9    | no                   |
| buy nitro coffee online                      | 0  | 48      | 9.8     | no                   |
| nitro cold brew for businesses               | 0  | 37      | 12.0    | no                   |
| nitro coffee can supplier                    | 0  | 33      | 10.1    | no                   |
| nitro coffee orange county                   | 0  | 23      | 88.6    | no                   |
| plastic coffee keg                           | 0  | 20      | 74.2    | no                   |

**PAGE PURPOSE TODAY:** a **wholesale / distributor product page**. It publishes a per-keg price list ($120–$195), uses "Direct Distribution Program" and "direct-store-delivery (DSD)" language, and is the **only page on the site** that carries the Alliance Brand partner range.

**USER INTENT:** commercial/B2B — "what does a keg cost, what brands can I get, who supplies them."

**PRIMARY COMMERCIAL OFFER:** wholesale keg supply with published pricing, including six partner/private-label brands.

**PRIMARY SEARCH INTENT:** brand queries plus a niche commercial set — PET keg format, alliance brand names, supplier/manufacturer queries.

**UNIQUE CONTENT (present here, absent from** **`/products/`****):**

- The whole **"Alliance Brand Nitro Coffee"** section: Caveman Coffee Company Nitro · Our Gorongosa Coffee Company · Jittery John's New Orleans Style – Nitro · Thai Treasures Ang Kang Espresso Nitro · Organic CULT Artisan Beverage Co. Uganda White Nile Nitro · Organic Thanksgiving Coffee Company Nitro
- A **published wholesale price list** on 19 product blocks
- "Direct Distribution Program" / "direct-store-delivery (DSD)" copy
- "Organic Vanilla Nitro Coffee" listed in the main coffee range (not only in specialty flavours)
- The 120-day shelf-life claim and "Calibrated by Master Roasters"
- Product naming variants: "Espresso Organic", "Organic Mango Tea", "Organic Passion Fruit Tea"

**UNIQUE VALUE PROPOSITION:** price transparency and brand breadth for trade buyers.

**UNIQUE QUERY OWNERSHIP:** `pet coffee keg` (best position on the domain), the entire Caveman/alliance-brand query set, `nitro coffee can manufacturer`, `nitro coffee can supplier`, `nitro cold brew for businesses`, `buy nitro coffee online`, `plastic coffee keg`, `5 gallon coffee keg`, `nitro cold brew denver`, `nitro coffee new jersey`, `kona nitro coffee`.

**INTERPRETATION.** That list is not noise. It is a coherent B2B/format/partner-brand cluster that `/products/` does not serve, backed by content that only exists on this URL.

---

## 4. LIVE-PAGE SIDE-BY-SIDE COMPARISON

All values from logged-out fetches (`credentials: omit`) unless noted.

### 4a. WHAT IS IDENTICAL

| Element Value (both pages)  |                                                                                                                      |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Final HTTP status           | 200                                                                                                                  |
| Redirect behaviour          | none — both resolve directly                                                                                         |
| Canonical                   | self-referencing                                                                                                     |
| Robots meta                 | `index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1`                                       |
| Index/noindex               | indexable                                                                                                            |
| `<title>`                   | `Cold Brew Nitro Coffee Kegs - Bona Fide Nitro Coffee and Tea`                                                       |
| Meta description            | identical, 212 characters, beginning "Nitro cold brew coffee kegs on tap are becoming a necessity for coffee shops…" |
| og\:type                    | `article`                                                                                                            |
| og\:locale                  | `en_US`                                                                                                              |
| og\:image                   | `Bona-Fide-Banner-Product-Page-1.jpg`                                                                                |
| twitter\:card               | `summary_large_image`                                                                                                |
| JSON-LD graph               | `WebPage` + `ImageObject` + `BreadcrumbList` + `WebSite`                                                             |
| Breadcrumbs                 | present and valid on both                                                                                            |
| AMP relation                | `/products/amp/` and `/products-2/amp/`, both valid in GSC                                                           |
| Page template               | `page-templates/page_front-page.php`                                                                                 |
| Theme                       | Sydney                                                                                                               |
| Forms                       | 3 (public render)                                                                                                    |
| Videos / iframes            | 0 / 0                                                                                                                |

### 4b. WHAT IS SIMILAR (same idea, different execution)

| Element `/products/` `/products-2/`  |                                                                                         |                                                                                   |
| ------------------------------------ | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| H1                                   | Best Nitro Cold Brew Coffee Kegs **On The** Market                                      | Best Nitro Cold Brew Coffee Kegs **on the** Market                                |
| Opening line                         | "…until Bona Fide® Nitro Cold Brew Coffee in a Keg comes along!"                        | "…until Nitro Cold Brew Coffee on a Keg comes along!"                             |
| Supplier heading                     | "…Keg Suppliers In The **USA**" (H3)                                                    | "…Keg Suppliers in the **US**" (H2)                                               |
| Brewing-craft copy                   | "It takes clever minds… specialty varieties from top tea merchants and coffee roasters" | "It takes gallant brewers… flavorful bean types from top tea and coffee roasters" |
| Office/shop/home trio                | present, positioned near the bottom                                                     | present, positioned near the top                                                  |
| Core organic coffee SKUs             | Hair Raiser®, Espresso, Ethiopia Yirgacheffe, Peru, Guatemala, Decaf Mexico             | same six                                                                          |
| Tea trio                             | Hibiscus, Mango, Passion Fruit                                                          | same three, "Organic" prefixed                                                    |
| Specialty flavours                   | Hazelnut Creme, Vanilla, Caramel                                                        | same three                                                                        |
| "Cold Brew vs Cold Brewed" explainer | identical wording                                                                       | identical wording                                                                 |
| Closing CTA                          | LEARN ALL ABOUT COLD BREW NITRO COFFEE                                                  | same                                                                              |

### 4c. WHAT IS MATERIALLY DIFFERENT

| Dimension `/products/` `/products-2/`  |                                                                                             |                                                                                                |
| -------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| WordPress post title                   | **Products**                                                                                | **Products NEW**                                                                               |
| WordPress ID                           | 147                                                                                         | 7801                                                                                           |
| Created                                | 2017-10-17                                                                                  | 2022-04-25                                                                                     |
| Pricing                                | 3 prices, all $149.00 (specialty flavours only)                                             | **19 prices** — $195.00 core, $135.00 Jittery John's, $125.00 alliance brands, $120.00 caramel |
| Amazon links                           | **13**                                                                                      | 0                                                                                              |
| Purchase routing                       | "Buy Securely In Our NitroCoffee.Store And Save" **+** "Buy Securely On Amazon.com" per SKU | single store CTA per SKU                                                                       |
| Keg style variants                     | "Nitro Style" / "Still (Flat) Style" toggles                                                | none                                                                                           |
| Alliance Brand section                 | **absent**                                                                                  | **present — 6 partner SKUs**                                                                   |
| Bag-in-Box                             | two full body sections                                                                      | nav link only                                                                                  |
| Equipment cross-sell                   | "Are You Looking For Dispensing Equipment? → CHECK IT HERE"                                 | absent                                                                                         |
| Hero block                             | "Try The Best Cold Brew On The Market" + "Nitro Coffee And Tea Kegs That Last For Months"   | absent (starts at the bullet strip)                                                            |
| Shelf-life claim                       | "at least **180** days"                                                                     | "at least **120** days"                                                                        |
| Distribution framing                   | web store / Amazon retail                                                                   | "Direct Distribution Program", "direct-store-delivery (DSD)"                                   |
| Roaster credit                         | "Preferred Master Roasters"                                                                 | "Calibrated by Master Roasters"                                                                |
| Headings H1–H3                         | 25                                                                                          | 31                                                                                             |
| Heading levels                         | "Nitro Coffee For Home" = H3                                                                | "Nitro Coffee for Home" = H2                                                                   |
| Images                                 | 35                                                                                          | 25                                                                                             |
| Internal+external anchors              | 95                                                                                          | 82                                                                                             |
| Rendered HTML / visible text           | 667,745 B / 13,347 chars                                                                    | 714,877 B / 15,057 chars                                                                       |

### 4d. Images and alt text

**DATA.** Both share the same banner and product photography set (`Hair-Raiser-Nitro-Coffee-for-website.png`, `Esspreso-Nitro-Coffee-for-website.png`, `Ethiopia-Nitro-Coffeemfor-website.png`, `Peru-Nitro-Coffee-for-website.png`, `Guatemala-Nitro-Coffee-for-website.png`, `Decaf-Mexico-Nitro-Coffee-for-website.png`, `Hibiscuis-Nitro-Tea-for-website.png`, `Mango-Nitro-Tea-for-website-organic.png`, `Pasion-Fruit-Nitro-tea-for-website-new.png`, `Hazelnut-Nitro-by-Bona-Fide.png`, `Vanilla-Nitro-by-Bona-Fide.png`, `Caramel-Coffee-Nitro-by-Bona-Fide.png`, `Bona-Fide-Banner-Product-Page-1.jpg`, `Banner-Product-Page-Bona-Fide-Product-Page-Bullets.jpg`, `Banner-Product-Page-Bona-Fide-Product-Page-Bullets2.jpg`).

**`/products-2/`** **additionally carries six alliance-brand images that exist on no other page:**
`Caveman-Coffee-Comapany-Nitro-by-Bona-Fide.png` · `ourGorongosa-Coffee-Nitro-by-Bona-Fide.png` · `Jittery-Johns-Coffee-Comapany-Nitro-by-Bona-Fide.png` · `Thai-Treasures-Coffee-Nitro-by-Bona-Fide.png` · `CULT-Coffee-Comapany-Nitro-by-Bona-Fide.png` · `Thanksgiving-Coffee-Company-Nitro-by-Bona-Fide.png`

**DATA — alt-text quality is poor on both.** On `/products-2/`, 10 of 25 images have an empty `alt`, including Peru, Guatemala, Decaf Mexico, all three teas, caramel, and **all six alliance-brand images**. Several alt values are filenames rather than descriptions (`alt="Banner-Product-Page-Bona-Fide-Product-Page-Bullets"`).

### 4e. Scripts, forms and page-builder

**DATA.** Both pages are built with **Thrive Architect** (`tcb_editor_enabled = 1`; `tve_updated_post` 234,895 chars on 147 and 298,535 chars on 7801; `tve_custom_css` \~76 KB each). Neither uses a `tve_landing_page` template; both use the theme header and footer (`_tve_header = 0`, `_tve_footer = 0`).

**DATA — third-party scripts, identical on both (and site-wide):** `www.google.com/recaptcha/api.js`, `static.klaviyo.com/onsite/js/klaviyo.js`, `cdn.quickdelivr.com/mpackage.js` ×2, `cdn.coredelivr.com/mpackage.js`. Inline signals: Google Tag Manager (`GTM-`), Facebook Pixel (`fbq`), `dataLayer`. The last two hosts are the security concern in §15.

**No functionality is unique to either page** beyond content: no page-specific script, no unique form handler, no video, no embed.

---

## 5. WORDPRESS BACKEND COMPARISON

All read via the WordPress REST API and read-only admin screens. **The page editor was not opened for either post.**

| Field `/products/` `/products-2/`  |                                                                                                                                                                               |                                         |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Page ID                            | **147**                                                                                                                                                                       | **7801**                                |
| WordPress title                    | **Products**                                                                                                                                                                  | **Products NEW**                        |
| Slug                               | `products`                                                                                                                                                                    | `products-2`                            |
| Status                             | publish                                                                                                                                                                       | publish                                 |
| Type                               | page                                                                                                                                                                          | page                                    |
| Parent                             | 0 (top level)                                                                                                                                                                 | 0 (top level)                           |
| Menu order                         | 0                                                                                                                                                                             | 0                                       |
| Created                            | **2017-10-17 00:03:19**                                                                                                                                                       | **2022-04-25 10:10:18**                 |
| Last modified                      | 2026-09-20 19:35:12                                                                                                                                                           | 2026-09-20 20:20:36                     |
| Author                             | 1 — **John Goerke** (`admin`)                                                                                                                                                 | 1 — **John Goerke** (`admin`)           |
| Template                           | `page-templates/page_front-page.php`                                                                                                                                          | `page-templates/page_front-page.php`    |
| Featured image                     | none (`0`)                                                                                                                                                                    | none (`0`)                              |
| Comment / ping                     | closed / closed                                                                                                                                                               | closed / closed                         |
| Body class                         | `page-id-147`                                                                                                                                                                 | `page-id-7801`                          |
| Revisions retained                 | **130**, oldest retained 2022-01-20 16:56:56                                                                                                                                  | **100**, oldest 2022-04-25 10:10:38     |
| Revision authors                   | **1 (John Goerke) and 5 (Arnel)**                                                                                                                                             | **1 only**                              |
| First revision title               | "Products"                                                                                                                                                                    | **"Products NEW"**                      |
| Rendered content length            | 45,317 chars                                                                                                                                                                  | 26,693 chars                            |
| Custom fields (identical key set)  | `footnotes`, `tve_updated_post`, `tve_custom_css`, `tve_user_custom_css`, `tve_globals`, `tcb2_ready`, `tcb_editor_enabled`, `tve_landing_page`, `_tve_header`, `_tve_footer` | same ten keys                           |
| `tve_updated_post` size            | 234,895 chars                                                                                                                                                                 | 298,535 chars                           |
| `tve_custom_css` size              | 76,879 chars                                                                                                                                                                  | 75,985 chars                            |
| Yoast title                        | identical                                                                                                                                                                     | identical                               |
| Yoast description                  | identical                                                                                                                                                                     | identical                               |
| Yoast robots                       | `index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1`                                                                                                | identical                               |
| Yoast canonical emitted            | `https://bonafidenitro.com/products/`                                                                                                                                         | `https://bonafidenitro.com/products-2/` |
| Yoast schema graph                 | WebPage + ImageObject + BreadcrumbList + WebSite                                                                                                                              | identical                               |
| In navigation menu                 | **yes**                                                                                                                                                                       | **no**                                  |
| In XML sitemap                     | yes (`wp-sitemap-posts-page-1.xml`)                                                                                                                                           | yes (same file)                         |
| Redirect-plugin rules involving it | **none**                                                                                                                                                                      | **none**                                |

### 5a. Reusable blocks, shortcodes, product data

**DATA.** Neither page uses WordPress reusable blocks. Both are Thrive Architect documents; product information is **hard-coded inside the Thrive content**, not pulled from a product CMS, custom post type, or WooCommerce. There is no WooCommerce on the site. Product purchase links point to the external Shopify store `nitrocoffee.store` and, on `/products/` only, to Amazon.

**INTERPRETATION.** For the static migration this is good news: product data is plain content, not a database relationship. It can be transcribed directly. It is also why the two pages could drift — there is no single product source of truth.

### 5b. Redirect-plugin rules (complete inventory)

**DATA.** Two redirect surfaces exist.

**Simple 301 Redirects — 11 rules, all off-site:**

| Old New                                    |                                                   |
| ------------------------------------------ | ------------------------------------------------- |
| `/services/peru-organic/`                  | nitrocoffee.store/products/organic-peru-nitro-co… |
| `/services/ethiopia-yirgacheffe-organic/`  | nitrocoffee.store/products/ethiopia-yirgacheffe-… |
| `/services/guatemala-organic/`             | nitrocoffee.store/products/guatemala-organic-nit… |
| `/services/hair-raiser-organic/`           | nitrocoffee.store/products/hair-raiser®-organic-… |
| `/services/organic-hibiscus-tea/`          | nitrocoffee.store/products/organic-hibiscus-nitr… |
| `/services/mango-tea/`                     | nitrocoffee.store/products/mango-nitro-tea        |
| `/services/espresso-organic-nitro-coffee/` | nitrocoffee.store/products/organic-espresso-nitr… |
| `/services/passion-fruit-tea/`             | nitrocoffee.store/products/organic-passion-fruit… |
| `/services/green-citrus-nitro-tea/`        | nitrocoffee.store/products/organic-citrus-green-… |
| `/services/cascara-coffee-cherry-tea/`     | nitrocoffee.store/products/nitro-cascara-tea-pet… |
| `/collections-nitro-coffee/`               | nitrocoffee.store/collections/nitro-coffee        |

**Yoast Redirects:** "No items found" — zero rules.

**Neither surface contains any rule referencing** **`/products/`** **or** **`/products-2/`****.**

### 5c. Plugins affecting rendering (32 active)

404 to Start · Accelerated Mobile Pages · Advanced Editor Tools · Akismet · BookingPress Appointment Booking · Classic Editor · Contact Form 7 · Content Views · Content Views Pro · Disable Comments · Easy Table of Contents · Easy Updates Manager · Faq Responsive · Google XML Sitemap for Videos · Head & Footer Code · Insert Pages · Limit Login Attempts · Notibar · Page Builder by SiteOrigin · Really Simple Security · Reveal IDs · Simple 301 Redirects · SiteOrigin CSS · SiteOrigin Widgets Bundle · Smart Slider 3 · Thrive Architect · Thrive Product Manager · **WP Post Page Clone** · WP File Manager · WP GDPR Fix Pro · WP-Optimize · Yoast SEO

Environment: WordPress **7.0.5** (7.1.1 available), Sydney theme, 30 published pages, 15 published posts. Site Health reports a critical issue and 12 items.

**Most relevant to this investigation:**

- **WP Post Page Clone** — a page-duplication plugin. WordPress auto-appends `-2` to a duplicated slug when `products` is taken. This is the mechanism that best explains `products-2` + "Products NEW" + a first revision 20 seconds after creation.
- **Accelerated Mobile Pages** — generates `/amp/` twins for both pages.
- **404 to Start** — redirects 404s to the start page, which masks broken links today.
- **Head & Footer Code** — legitimately holds GTM, Facebook Pixel and Klaviyo.

### 5d. What WordPress proves, and what it does not

**PROVEN by WordPress:**

- `/products-2/` is **newer**, created 2022-04-25, and was named "Products NEW" from its first retained revision.
- Both pages are actively maintained: 130 and 100 retained revisions, both last modified 20 Sep 2026 within 45 minutes of each other.
- They share an identical custom-field key set and template — consistent with duplication.
- A duplication plugin is installed and active.
- No redirect or canonical override targets either URL.

**NOT PROVEN — do not assert:**

- That `/products-2/` was created *by* WP Post Page Clone. No log records it.
- Why it was never put in the menu.
- Whether it was ever intended to replace `/products/`.
- Whether it was built for a campaign. Nothing in WordPress says so.
- What `/products/` looked like before Jan 2022, or `/products-2/` before Apr 2022 — earlier revisions have been pruned.
- Whether Yoast's canonical on either page is an explicit override or Yoast's default self-canonical. The emitted value is self on both; the stored `_yoast_wpseo_canonical` field is not exposed read-only without opening the editor, which I did not do.

---

## 6. SEARCH CONSOLE QUERY COMPARISON

Page-filtered figures. **Page-filtered impressions are not additive** — Google counts one impression per query at property level but one per URL when filtered to a page, so these columns must never be summed to describe demand.

### 6a. Head-to-head table — 16 months

| Query `/products/` c/i/pos `/products-2/` c/i/pos Interpretation  |                          |                       |                                                                    |
| ----------------------------------------------------------------- | ------------------------ | --------------------- | ------------------------------------------------------------------ |
| cold brew keg                                                     | **82 / 4,591 / 9.1**     | 0 / 24 / 27.5         | `/products/` owns outright                                         |
| nitro cold brew keg                                               | **53 / 3,630 / 9.3**     | 1 / 31 / 14.6         | `/products/` owns                                                  |
| cold brew kegs                                                    | **43 / 1,476 / 7.3**     | —                     | `/products/` only                                                  |
| nitro brew keg                                                    | **32 / 870 / 9.0**       | —                     | `/products/` only                                                  |
| cold brew coffee keg                                              | **24 / 925 / 10.2**      | —                     | `/products/` only                                                  |
| coffee keg                                                        | **22 / 3,328 / 9.4**     | 0 / 2 / 22.5          | `/products/` owns                                                  |
| nitro coffee keg                                                  | **17 / 1,997 / 8.5**     | 0 / 53 / 16.3         | `/products/` owns                                                  |
| coffee kegs                                                       | **15 / 774 / 7.0**       | —                     | `/products/` only                                                  |
| keg coffee                                                        | 8 / 540 / 8.5            | 0 / 31 / 41.9         | `/products/` owns                                                  |
| kegged coffee                                                     | 4 / 286 / 7.3            | 0 / 21 / 55.9         | `/products/` owns                                                  |
| **pet coffee keg**                                                | 0 / 480 / **14.0**       | 0 / **767** / **4.3** | **`/products-2/`** **owns — best on the domain**                   |
| **caveman nitro**                                                 | 0 / 83 / 18.6            | 0 / 62 / **13.7**     | **`/products-2/`** **ranks better**                                |
| caveman coffee nitro                                              | —                        | 0 / 116 / 28.8        | **`/products-2/`** **only**                                        |
| caveman coffee nitro caffeine content                             | —                        | 0 / 62 / 29.8         | **`/products-2/`** **only**                                        |
| caveman nitro coffee                                              | —                        | 0 / 55 / 21.9         | **`/products-2/`** **only**                                        |
| kona nitro coffee                                                 | —                        | 1 / 66 / 6.2          | **`/products-2/`** **only**                                        |
| nitro coffee can manufacturer                                     | —                        | 0 / 61 / 9.6          | **`/products-2/`** **only**                                        |
| nitro coffee can supplier                                         | —                        | 0 / 33 / 10.1         | **`/products-2/`** **only** (also `/howtobuy/`)                    |
| nitro cold brew for businesses                                    | —                        | 0 / 37 / 12.0         | **`/products-2/`** **only**                                        |
| buy nitro coffee online                                           | —                        | 0 / 48 / 9.8          | **`/products-2/`** **only**                                        |
| plastic coffee keg                                                | —                        | 0 / 20 / 74.2         | **`/products-2/`** **only**                                        |
| nitro cold brew denver                                            | —                        | 0 / 71 / 9.1          | **`/products-2/`** **only**                                        |
| nitro coffee orange county                                        | —                        | 0 / 23 / 88.6         | **`/products-2/`** **only**                                        |
| draft nitro coffee                                                | —                        | 0 / 77 / 10.9         | **`/products-2/`** **only** of this pair                           |
| nitro tea                                                         | —                        | 0 / 191 / 11.7        | **`/products-2/`** **only** of this pair                           |
| bona fide coffee                                                  | 15 / 419 / 1.3           | **18 / 382 / 1.2**    | **both rank top-2;** **`/products-2/`** **earns more**             |
| bonafide coffee                                                   | 10 / 689 / 1.9           | 8 / 543 / **1.4**     | both; `/products-2/` ranks better                                  |
| bona fide nitro coffee                                            | —                        | **11 / 327 / 1.2**    | `/products-2/` of this pair                                        |
| bonafide nitro coffee                                             | —                        | **6 / 121 / 1.2**     | `/products-2/` of this pair                                        |
| bona fide nitro coffee and tea                                    | —                        | 1 / 15 / 1.0          | `/products-2/` of this pair                                        |
| nitro coffee (generic head term)                                  | 0 impressions attributed | 0 / **4,149** / 12.7  | **`/products-2/`** **carries this,** **`/products/`** **does not** |
| nitrocoffee                                                       | —                        | 0 / 1,832 / 11.3      | `/products-2/` only                                                |
| best nitro cold brew keg                                          | 0 / 47 (28d)             | 0 / 436 / 30.0        | both, neither strong                                               |
| cold brew keg cost                                                | 0 / 27 (28d)             | 0 / 26 / 62.7         | both, neither strong                                               |

### 6b. Last 3 months

| `/products/` `/products-2/`  |                            |                     |
| ---------------------------- | -------------------------- | ------------------- |
| Distinct queries             | **162**                    | 43                  |
| Clicks from top queries      | \~60                       | **22**              |
| Branded share of clicks      | small minority (7 of \~60) | **22 of 22 — 100%** |

`/products/` 3-month top: cold brew keg 19/504/8.5 · cold brew kegs 11/295/7.1 · nitro cold brew keg 9/565/11.3 · nitro brew keg 7/104/9.0 · cold brew coffee keg 6/145/9.5 · coffee keg 5/534/8.8 · bona fide coffee 3/83/1.2 · cold brew kegs for sale 3/35/6.3 · coffee kegs 2/125/6.8 · bonafide coffee 2/107/1.4 · bonafide nitro coffee 2/46/1.0 · kegged coffee 2/44/6.1 · nitro cold brew kegs 2/42/6.0 · nitro coffee keg 1/296/10.5

`/products-2/` 3-month, **every click**: bona fide nitro coffee 6/86/1.0 · bonafide coffee 5/109/1.0 · bona fide coffee 5/85/1.2 · bonafide nitro coffee 5/46/1.0 · bona fide nitro coffee and tea 1/14/1.0. Zero-click but ranking: pet coffee keg 0/104/**4.5** · 5 gallon coffee keg 0/5/10.8 · caveman nitro 0/8/9.4 · cold brew keg delivery 0/2/5.0 · nitro keg 0/10/19.8 · best nitro cold brew keg 0/15/42.8 · cold brew keg cost 0/14/53.1 · nitro coffee new jersey 0/5/47.6.

### 6c. Last 28 days

| `/products/` `/products-2/`  |        |        |
| ---------------------------- | ------ | ------ |
| Distinct queries             | **96** | **14** |
| Clicks                       | **25** | **1**  |

`/products/` 28-day: cold brew keg 5/179/9.3 · nitro brew keg 5/34/11.1 · cold brew kegs 4/79/7.9 · nitro cold brew keg 3/160/12.7 · kegged coffee 2/22/4.7 · coffee keg 1/170/10.0 · keg of coffee 1/32/8.2 · keg of cold brew 1/26/8.8 · keg of cold brew coffee 1/17/8.9 · cold brew kegs for sale 1/16/6.1 · coffee in a keg 1/11/7.6 · cold brew keg delivery 1/9/8.4 · keg of nitro cold brew 1/3/5.7 · buy bonafide 1/2/167.5 · try again 1/1/1.0.

`/products-2/` 28-day, complete: bonafide coffee **1**/21/1.1 · pet coffee keg 0/34/**4.6** · bona fide nitro coffee 0/25/1.0 · bona fide coffee 0/19/1.3 · bona fide nitro coffee and tea 0/10/1.0 · bonafide nitro coffee 0/10/1.0 · best nitro cold brew keg 0/6/38.3 · 5 gallon coffee keg 0/5/10.8 · cold brew keg cost 0/5/51.6 · caveman nitro 0/2/8.0 · nitro coffee new jersey 0/2/49.0 · nitro keg 0/1/8.0 · keg coffee 0/1/45.0 · where to buy kegs of cold brew coffee 0/1/56.0.

### 6d. Classification

**Queries primarily owned by** **`/products/`** — the non-branded keg cluster: cold brew keg · cold brew kegs · nitro cold brew keg · nitro brew keg · cold brew coffee keg · coffee keg · coffee kegs · nitro coffee keg · nitro coffee kegs · keg of cold brew · keg of coffee · keg coffee · kegged coffee · coffee in a keg · iced coffee keg · cold brew coffee kegs · cold brew kegs for sale · where to buy kegs of cold brew coffee · keg of nitro cold brew · cold brew keg delivery.

**Queries primarily owned by** **`/products-2/`** — format, partner-brand, B2B and geo: pet coffee keg · 5 gallon coffee keg · plastic coffee keg · caveman nitro · caveman nitro coffee · caveman coffee nitro · caveman coffee nitro caffeine content · kona nitro coffee · nitro coffee can manufacturer · nitro coffee can supplier · nitro cold brew for businesses · buy nitro coffee online · nitro cold brew denver · nitro coffee orange county · nitro tea · draft nitro coffee · nitro tea and coffee · nitronow · best coffee for nitro cold brew · notro coffee.

**Queries where BOTH appear:** bona fide coffee · bonafide coffee · cold brew keg · nitro cold brew keg · coffee keg · nitro coffee keg · keg coffee · kegged coffee · pet coffee keg · caveman nitro · best nitro cold brew keg · cold brew keg cost · nitro keg.

**Branded:** bona fide coffee · bonafide coffee · bona fide nitro coffee · bonafide nitro coffee · bona fide nitro coffee and tea · bona fide brewing company · buy bonafide. Both pages rank positions 1.0–1.9. `/products-2/` converts these better than `/products/` does.

**Non-branded commercial:** almost entirely `/products/`, except the `/products-2/` list above.

**Product/keg queries:** `/products/` owns generic "keg"; `/products-2/` owns the **format** variants — PET, plastic, 5-gallon.

**Generic** **`nitro coffee`****:** `/products-2/` carries 4,149 impressions at position 12.7 and `nitrocoffee` 1,832 at 11.3. `/products/` is not a significant ranker for the bare head term at all.

### 6e. Answer to your specific question

**Yes — the pages have distinct query roles despite identical title and meta description.** The overlap is concentrated in branded terms, where both rank 1.0–1.9 and Google is choosing between two acceptable answers. Outside branded terms they barely compete: `/products/` owns "keg", `/products-2/` owns "PET keg / alliance brand / supplier / generic nitro coffee". The duplicate metadata has not collapsed them into one because the **body content is genuinely different**.

---

## 7. INDEXING / CANONICAL COMPARISON

| URL Inspection field `/products/` `/products-2/`  |                                                                                   |                                                                                                      |
| ------------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Verdict                                           | URL is on Google                                                                  | URL is on Google                                                                                     |
| Page indexing                                     | **Page is indexed**                                                               | **Page is indexed**                                                                                  |
| User-declared canonical                           | `https://bonafidenitro.com/products/`                                             | `https://bonafidenitro.com/products-2/`                                                              |
| Google-selected canonical                         | **Inspected URL**                                                                 | **Inspected URL**                                                                                    |
| Last crawl                                        | **2026-09-20 21:33:43**                                                           | **2026-08-29 05:23:59**                                                                              |
| Crawled as                                        | Googlebot smartphone                                                              | Googlebot smartphone                                                                                 |
| Crawl allowed                                     | Yes                                                                               | Yes                                                                                                  |
| Page fetch                                        | Successful                                                                        | Successful                                                                                           |
| Indexing allowed                                  | Yes                                                                               | Yes                                                                                                  |
| Referring sitemap                                 | `https://bonafidenitro.com/sitemap.xml`                                           | `https://bonafidenitro.com/sitemap.xml`                                                              |
| **Referring page(s)**                             | `/`, `http://bit.ly/2IcCDmi`, `https://www.bonafidenitro.com/products`, `/about/` | **`https://bonafidenitro.com/wp-sitemap-posts-page-1.xml`** **— the sitemap file, and nothing else** |
| Enhancements                                      | AMP valid · HTTPS · Breadcrumbs valid                                             | AMP valid · HTTPS · Breadcrumbs 1 valid                                                              |

**Does Google expose a clue as to why it keeps both?** Yes, three:

1. **Google-selected canonical = Inspected URL on both.** Google evaluated each page against its declared canonical and agreed. It has **not** clustered them. If Google considered them duplicates it would have picked one canonical for both and reported the other as "Duplicate, Google chose different canonical than user" — that state does not exist anywhere in this property.
2. **The referring-page difference.** `/products/` is discovered through links; `/products-2/` is discovered **only through the sitemap**. Its index membership is sustained by sitemap inclusion plus its own accumulated history.
3. **The 22-day crawl gap** (20 Sep vs 29 Aug). Google crawls `/products-2/` far less often — a low-priority but still-valued URL.

**INTERPRETATION.** The safest reading of "Google-selected canonical = Inspected URL" on a page whose title and meta description are byte-identical to another indexed page is that **the body content is doing the differentiating work**. That is the single most important fact for the migration: the thing keeping `/products-2/` alive is its unique content, not its metadata.

---

## 8. INTERNAL-LINK COMPARISON

**DATA — verified by crawling 57 pages that return HTTP 200 and parsing every** **`<a href>`****:**

| `/products/` `/products-2/`                     |                            |                                    |
| ----------------------------------------------- | -------------------------- | ---------------------------------- |
| GSC "Internal links" report                     | 41                         | **0**                              |
| Pages linking to it (live crawl, static HTML)   | **56 of 57**               | **1 — itself** (5 in-page anchors) |
| Rendered homepage DOM (JS executed, logged out) | **10 links**               | **0 links**                        |
| Present in global navigation                    | **yes**                    | **no**                             |
| Google's reported referring page                | 4 URLs incl. a bit.ly link | the sitemap file only              |

**DATA — the global navigation's internal destinations:** `/nitro-cold-brew/`, `/howtobuy/`, `/`, `/products/`, `/cold-brew-coffee-concentrate-bag-in-box-versus-cold-brew-in-kegs/`, `/kegerators/`, `/about/`, `/contact-bona-fide-nitro-coffee-and-tea/`, `/nitro-coffee-questions/`, `/blog/`, plus the external `nitrocoffee.store`. `/products-2/` is not among them.

**Answers to your questions:**

- **Where is** **`/products/`** **linked from?** Every page on the site, via the global header/footer navigation, plus additional in-body links on the homepage (10 total anchors there).
- **Is** **`/products-2/`** **linked anywhere in rendered HTML?** No. Verified in both raw HTML across 57 pages and in the fully JS-rendered homepage DOM.
- **Is it only discoverable through the sitemap / external history?** **Through the sitemap, yes** — `wp-sitemap-posts-page-1.xml`. That is exactly what Google reports as its referring page. No external referrer is exposed.
- **Do JavaScript, menus, old pages or hidden elements link to it?** No. The Thrive-rendered DOM, the SiteOrigin widgets and the Smart Slider content were all in scope of the rendered check. Nothing links to it.
- **Is orphan status part of its ranking history?** **INTERPRETATION:** orphan status is not what earns it rankings, but it plausibly explains the *shape* of what it ranks for. With no internal anchor text and no internal PageRank flow, it competes almost entirely on its own on-page content — which is why the queries it wins are the ones whose **words only appear on that page** (Caveman, PET keg, can manufacturer, DSD-flavoured B2B terms) and why it does not contest the keg cluster that `/products/` wins on internal authority.

---

## 9. EXTERNAL-LINK EVIDENCE

**What Search Console can prove:**

**DATA.** The Links report's "Top linked pages" list contains **17 URLs**. `/products/` appears with **8 external links from 7 domains**. `/products-2/` **does not appear in that list**. Property total: 182 external links from 65 domains, of which 129 point at the homepage.

**DATA.** URL Inspection reports `/products/`'s referring pages as `/`, `http://bit.ly/2IcCDmi`, `https://www.bonafidenitro.com/products` and `/about/` — of which `bit.ly/2IcCDmi` is an **external** shortener. For `/products-2/`, URL Inspection reports **one** referring page: the sitemap file.

**What Search Console cannot prove, and what must therefore not be asserted:**

- GSC's Links report is a **current** view. It has no history and no "links that used to exist" view.
- The "Top linked pages" list is **top-N**, not exhaustive. A URL with 1–2 links can fall below the display threshold even if links exist.
- URL Inspection's referring-page list is a **sample**, not a complete backlink set.
- GSC does not expose lost or disavowed links.

**Therefore:** the correct statement is *"Search Console currently reports no external links to* *`/products-2/`**, and exposes no external referring page for it."* It is **not** valid to conclude that `/products-2/` has never had external link equity. If that question matters to the consolidation decision later, it needs a third-party backlink index (Semrush/Ahrefs/Majestic historical), not Search Console.

---

## 10. UNIQUE SEO EQUITY OF EACH URL

### `/products/` — equity that exists nowhere else

1. **The non-branded keg franchise.** \~334 clicks over 16 months across \~25 keg queries at positions 5.6–10.4. This is the single most valuable non-branded asset in the property.
2. **External links:** 8 links from 7 domains — second-highest of any page after the homepage and `/howtobuy/`.
3. **Internal authority:** 41 GSC-counted internal links; present on all 57 pages.
4. **Link-based discovery:** four referring pages including an external shortener, meaning it is crawled frequently (last crawl same-day).
5. **Amazon and store routing:** the only page on the site carrying Amazon purchase links.
6. **Bag-in-Box body content** in a product context (the topic otherwise lives only on a blog post).
7. **Equipment cross-sell path** to `/kegerators/`.

### `/products-2/` — equity that exists nowhere else

1. **`pet coffee keg`** **at position 4.3 with 767 impressions** — the best position any page on this domain holds for that query, better than `/products/` (14.0) and `/nitro-coffee-kegs/` (15.5).
2. **The entire Caveman / alliance-brand query cluster** — \~295 impressions across four Caveman variants, plus Gorongosa, Jittery John's, Thai Treasures, CULT Artisan and Thanksgiving Coffee content that exists on no other URL.
3. **Format queries:** `5 gallon coffee keg` (10.8), `plastic coffee keg`.
4. **Supplier/manufacturer B2B queries:** `nitro coffee can manufacturer` (9.6), `nitro coffee can supplier` (10.1), `nitro cold brew for businesses` (12.0), `buy nitro coffee online` (9.8).
5. **Geographic queries:** `nitro cold brew denver` (9.1), `nitro coffee new jersey`, `nitro coffee orange county`.
6. **A meaningful share of the generic head term:** 4,149 impressions for `nitro coffee` at 12.7 and 1,832 for `nitrocoffee` at 11.3 — impressions `/products/` does not hold.
7. **Branded conversion:** over 3 months it earned 22 branded clicks at positions 1.0–1.2, out-earning `/products/` on the same terms.
8. **A published wholesale price list** — the only pricing page the domain has.
9. **Six unique product images.**

**INTERPRETATION.** Neither URL's equity is a subset of the other's. That is the core justification for your two-200s default.

---

## 11. STATIC MIGRATION PRESERVATION REQUIREMENTS

### 11a. `/products/`

| Item Requirement                     |                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **URL**                              | `https://bonafidenitro.com/products/` — **unchanged, including the trailing slash**                                                                                                                                                                                                                                                                           |
| **HTTP**                             | Static **200**. No redirect, no chain, no soft 404                                                                                                                                                                                                                                                                                                            |
| **Canonical**                        | Self-referencing `https://bonafidenitro.com/products/`                                                                                                                                                                                                                                                                                                        |
| **Robots**                           | `index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1`                                                                                                                                                                                                                                                                                |
| **Title**                            | Must keep containing **"Cold Brew"**, **"Nitro Coffee"** and **"Kegs"**. Current: `Cold Brew Nitro Coffee Kegs - Bona Fide Nitro Coffee and Tea`                                                                                                                                                                                                              |
| **H1**                               | Must keep containing **"Nitro Cold Brew Coffee Kegs"**. Current: `Best Nitro Cold Brew Coffee Kegs On The Market`                                                                                                                                                                                                                                             |
| **Meta description**                 | Reproduce or improve — but see §11c, it must **stop being identical** to `/products-2/`'s                                                                                                                                                                                                                                                                     |
| **Query concepts that must survive** | cold brew keg · cold brew kegs · nitro cold brew keg · nitro brew keg · cold brew coffee keg · coffee keg · coffee kegs · nitro coffee keg · nitro coffee kegs · keg of cold brew · keg of coffee · keg coffee · kegged coffee · coffee in a keg · iced coffee keg · cold brew kegs for sale · where to buy kegs of cold brew coffee · cold brew keg delivery |
| **Schema**                           | `BreadcrumbList` (mandatory — currently valid), `WebPage`, `ImageObject`, `WebSite`. **Adding** **`Product`** **is an opportunity, not a preservation requirement**                                                                                                                                                                                           |
| **Open Graph / Twitter**             | `og:type=article`, `og:locale=en_US`, `og:image=Bona-Fide-Banner-Product-Page-1.jpg`, `twitter:card=summary_large_image`                                                                                                                                                                                                                                      |
| **Important links out**              | All 13 Amazon product links · all 16 `nitrocoffee.store` links · `/howtobuy/` · `/contact-bona-fide-nitro-coffee-and-tea/` · the `/kegerators/` equipment CTA · the "LEARN ALL ABOUT COLD BREW NITRO COFFEE" link                                                                                                                                             |
| **Images/assets**                    | Preserve **filenames and paths** for all 35 images, especially the SKU photography and `Bona-Fide-Banner-Product-Page-1.jpg`. Several currently rank in web search                                                                                                                                                                                            |
| **Product information**              | All six core organic SKUs with nutrition lines and tasting notes · the tea trio · the three specialty flavours with $149.00 · the Nitro/Still style distinction · the 180-day claim · both Bag-in-Box sections                                                                                                                                                |
| **Internal linking in**              | Keep it in the global navigation. **Do not reduce** its site-wide link presence                                                                                                                                                                                                                                                                               |
| **Sitemap**                          | Must be in the new XML sitemap                                                                                                                                                                                                                                                                                                                                |
| **AMP**                              | `/products/amp/` must **301 to** **`/products/`**. It is a valid AMP page today                                                                                                                                                                                                                                                                               |

### 11b. `/products-2/`

| Item Requirement                                                           |                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **URL**                                                                    | `https://bonafidenitro.com/products-2/` — **unchanged**. Do not "tidy" this slug at migration                                                                                                                                                                                                                                                                                                                                    |
| **HTTP**                                                                   | Static **200**. No redirect                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Canonical**                                                              | **Self-referencing** **`https://bonafidenitro.com/products-2/`****.** Do **not** point it at `/products/`                                                                                                                                                                                                                                                                                                                        |
| **Robots**                                                                 | `index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1`                                                                                                                                                                                                                                                                                                                                                   |
| **Title**                                                                  | Currently identical to `/products/`. See §11c — must be differentiated, but **not by removing the keg/nitro vocabulary**                                                                                                                                                                                                                                                                                                         |
| **H1**                                                                     | Currently `Best Nitro Cold Brew Coffee Kegs on the Market`                                                                                                                                                                                                                                                                                                                                                                       |
| **Query concepts that must survive — these are the reason the URL exists** | **pet coffee keg** · 5 gallon coffee keg · plastic coffee keg · **caveman nitro / caveman nitro coffee / caveman coffee nitro / caveman coffee nitro caffeine content** · kona nitro coffee · **nitro coffee can manufacturer** · **nitro coffee can supplier** · nitro cold brew for businesses · buy nitro coffee online · nitro cold brew denver · nitro tea · draft nitro coffee · plus the brand terms it ranks 1.0–1.2 for |
| **Schema**                                                                 | `BreadcrumbList` (currently 1 valid item), `WebPage`, `ImageObject`, `WebSite`                                                                                                                                                                                                                                                                                                                                                   |
| **Open Graph / Twitter**                                                   | Same values as today                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Important links out**                                                    | All 22 `nitrocoffee.store` links · `/howtobuy/` · `/contact-bona-fide-nitro-coffee-and-tea/`                                                                                                                                                                                                                                                                                                                                     |
| **Images/assets — critical**                                               | The six alliance-brand images exist on **no other page**: `Caveman-Coffee-Comapany-Nitro-by-Bona-Fide.png`, `ourGorongosa-Coffee-Nitro-by-Bona-Fide.png`, `Jittery-Johns-Coffee-Comapany-Nitro-by-Bona-Fide.png`, `Thai-Treasures-Coffee-Nitro-by-Bona-Fide.png`, `CULT-Coffee-Comapany-Nitro-by-Bona-Fide.png`, `Thanksgiving-Coffee-Company-Nitro-by-Bona-Fide.png`. Preserve filenames                                        |
| **Product information — critical**                                         | The **Alliance Brand Nitro Coffee** section in full (all six partner SKUs, names, descriptions, prices) · the **published price list** ($195/$135/$125/$120) · "Direct Distribution Program" and "direct-store-delivery (DSD)" language · the "PET Keg" / "5 Gal" format vocabulary that earns `pet coffee keg`                                                                                                                  |
| **Internal linking in**                                                    | **Leave at zero for the initial migration.** See the note below                                                                                                                                                                                                                                                                                                                                                                  |
| **Sitemap**                                                                | Must be in the new XML sitemap — it is currently the *only* thing keeping this URL discoverable                                                                                                                                                                                                                                                                                                                                  |
| **AMP**                                                                    | `/products-2/amp/` must **301 to** **`/products-2/`**                                                                                                                                                                                                                                                                                                                                                                            |

**On internal links to** **`/products-2/`****:** your brief says do not create new links, and I agree for launch. **INTERPRETATION:** adding internal links to an orphan page at the same moment you change CMS introduces a second variable and could shift which page Google prefers for branded terms. Adding one or two contextual links is a strong post-migration candidate (§13), tested on its own.

### 11c. The one change I would argue for at launch — and the case against

**The problem (DATA).** Both pages ship a byte-identical `<title>` and a byte-identical 212-character meta description. Site-wide, only three pages have a meta description at all; `/products-2/` has one purely because it inherited `/products/`'s when it was cloned.

**The argument for fixing it at launch:** it is the clearest remaining duplicate signal, it costs nothing, and leaving two indexed pages with the same title is the condition that most often precedes Google collapsing them.

**The argument against, which I think wins:** your stated principle is that the CMS change should be the only variable. Google has already evaluated both pages and selected each as its own canonical *despite* the duplicate metadata — the duplication is demonstrably not currently fatal. Changing titles changes the query–title relationship on a page earning 1,171 clicks.

**Recommendation:** treat title/meta differentiation as the **first post-migration change**, made alone, once indexation is stable — not as part of the migration. If you decide you must do it at launch, change **`/products-2/`** **only** and leave `/products/` untouched, so the high-value page stays a constant.

---

## 12. WHAT MUST REMAIN UNCHANGED DURING THE INITIAL MIGRATION

1. **`/products/`** **stays** **`/products/`****.** Same path, same trailing slash, static 200, self-canonical, indexable.
2. **`/products-2/`** **stays** **`/products-2/`****.** Same path, same trailing slash, static 200, self-canonical, indexable.
3. **No redirect between them.** In either direction.
4. **No cross-canonical.** `/products-2/` must not canonicalise to `/products/`.
5. **No** **`noindex`** on either.
6. **Neither is removed from the sitemap.** `/products-2/` has no other discovery path.
7. **The Alliance Brand section stays on** **`/products-2/`** and is not moved to `/products/` during migration.
8. **The price list stays on** **`/products-2/`****.**
9. **The Amazon links stay on** **`/products/`****.**
10. **The Bag-in-Box sections stay on** **`/products/`****.**
11. **`BreadcrumbList`** **on both.**
12. **Image filenames and paths preserved on both.**
13. **`/products/`** **keeps its global-navigation presence;** **`/products-2/`** **stays orphaned** — change one variable at a time.
14. **No intent rewrite.** Do not turn `/products-2/` into something else during the CMS change.
15. **Both** **`/amp/`** **twins 301 to their canonical page.** No 404s.

---

## 13. POSSIBLE POST-MIGRATION DIFFERENTIATION — PROPOSAL ONLY, DO NOT IMPLEMENT

The evidence supports a defensible split. I am not inventing an intent; both roles below are already what Google ranks each page for.

**`/products/`** **→ the retail / direct-to-customer keg hub.**
Already true: Amazon + store checkout, no wholesale pricing, style variants, Bag-in-Box and equipment cross-sell, and ownership of the non-branded "keg" cluster. Differentiation work would be: lean the title and H1 harder into buying a keg, add `Product` schema, keep the Bag-in-Box and equipment paths, and build internal links from `/kegerators/` and `/cold-brew-…-bag-in-box-…/`.

**`/products-2/`** **→ the wholesale / trade / alliance-brand catalogue.**
Already true: published price list, DSD and Direct Distribution Program language, six partner brands, and ownership of `pet coffee keg`, the Caveman cluster, `nitro coffee can manufacturer`, `nitro coffee can supplier`, `nitro cold brew for businesses`. Differentiation work would be: a title and H1 built around **wholesale / trade pricing / PET kegs / partner brands** rather than duplicating `/products/`; its own meta description; and — deliberately, later — one or two internal links from `/howtobuy/`, which is the site's existing B2B page and is itself declining (−30% YoY).

**A third option worth naming:** if the business does not want a public wholesale price list on an orphan URL, the honest alternative is a **planned, measured consolidation** under §14 — not a silent one during the CMS change.

**Not supported by evidence:** turning `/products-2/` into a tea page, a location page, or a blog hub. Nothing in its query profile justifies that.

---

## 14. FUTURE CONSOLIDATION DECISION GATE

**Observation window: a minimum of 90 days after the static site is live**, covering at least one full Google recrawl of `/products-2/`. Note that Google currently crawls it roughly every 3–4 weeks (last crawl 29 Aug vs 20 Sep for `/products/`), so a shorter window will not produce reliable signal.

**Consolidating** **`/products-2/`** **into** **`/products/`** **is justified only when ALL of the following are objectively true:**

| # Gate How to verify  |                                                      |                                                                                                                                                                                                                                                                          |
| --------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1                     | **Rankings stable**                                  | `/products/`'s keg cluster within ±2 positions of this report's 16-month baseline for 8 consecutive weeks                                                                                                                                                                |
| 2                     | **Indexation stable**                                | Both URLs "Page is indexed", Google-selected canonical = Inspected URL, in GSC Page Indexing for 8 consecutive weeks                                                                                                                                                     |
| 3                     | **No unexplained clustering**                        | Neither URL has appeared as "Duplicate, Google chose different canonical" at any point post-launch                                                                                                                                                                       |
| 4                     | **Query ownership understood**                       | A fresh page-filtered query pull for both URLs confirms whether `/products-2/`'s unique set (pet coffee keg, Caveman, can manufacturer/supplier, nitro cold brew for businesses, buy nitro coffee online, geo terms) has persisted, migrated to `/products/`, or decayed |
| 5                     | **`pet coffee keg`** **resolved**                    | Either `/products/` has reached ≤ position 6 for it, or the query has decayed below 100 impressions/quarter. Today `/products-2/` holds 4.3 and `/products/` holds 14.0 — consolidating now would trade a position-4 ranking for a position-14 one                       |
| 6                     | **Alliance-brand decision made**                     | The business has decided whether Caveman / Gorongosa / Jittery John's / Thai Treasures / CULT / Thanksgiving remain a live offer. If they do, that content must live *somewhere*                                                                                         |
| 7                     | **Destination contains all valuable source content** | `/products/` (or a new destination) already carries the price list, the six partner SKUs and the PET-keg vocabulary **before** the redirect is created — not after                                                                                                       |
| 8                     | **Source has no unique intent left**                 | `/products-2/` has no query in the last 90 days where it ranks materially better than the destination                                                                                                                                                                    |
| 9                     | **External link check done**                         | A third-party backlink index has been checked for historical links to `/products-2/`. GSC cannot answer this (§9)                                                                                                                                                        |
| 10                    | **Redirect mapping tested**                          | The 301 and the `/products-2/amp/` → destination mapping verified on staging, single hop, no chain                                                                                                                                                                       |
| 11                    | **Baseline retained**                                | This report and the 16-month SEO baseline preserved as the comparison point                                                                                                                                                                                              |

**Trigger to consolidate sooner:** if post-launch GSC shows `/products-2/` flipping to "Duplicate, Google chose different canonical than user", Google has made the decision itself — at that point consolidate deliberately rather than leaving a contested URL in place.

**Trigger to never consolidate:** if `/products-2/` holds or improves `pet coffee keg`, the Caveman cluster and the supplier queries while `/products/` holds the keg cluster, the two-page split is working and should be formalised per §13 instead.

---

## 15. CURRENT WORDPRESS CRAWL FINDINGS RELEVANT TO MIGRATION

**Method:** 73 URLs fetched logged-out (50 from the WordPress sitemap + 23 known legacy/GSC URLs). Result: **57 × HTTP 200**, **5 same-origin redirects**, **15 cross-origin redirects unreadable via fetch (CORS)**, **1 × 404**.

### 15a. Status and redirect findings

**Same-origin redirects observed:**

| Old Destination                  |                                                                            |
| -------------------------------- | -------------------------------------------------------------------------- |
| `/contact/`                      | `/contact-bona-fide-nitro-coffee-and-tea/`                                 |
| `/contact`                       | `/contact-bona-fide-nitro-coffee-and-tea/`                                 |
| `/hot-nitro-coffee`              | `/hot-nitro-coffee/`                                                       |
| `/nitro-cold-brew`               | `/nitro-cold-brew/`                                                        |
| `/services/hair-raiser-organic/` | `https://www.nitrocoffee.store/products/hair-raiser®-organic-nitro-coffee` |

**Cross-origin redirects (destination not readable read-only; all are GSC "Page with redirect" URLs):** `/To`, `/roots/`, `/where-to-refill-your-`, `/blog-new/`, `/collections/`, `/sustainability/`, `/copyright-notice/`, `/kegging-service/`, `/best-coffee-creamers/`, `/best-nitro-cold-brew-coffee-maker/`, `/author/raul/`, `/cold-brew-coffee-tap-future-serve/`, `/contact-email/`, `/collections-nitro-coffee/`, `/healthy-benefits-drinking-nitro-coffee-nitro-coffee-health-benefits/`.
**Flag:** these need `curl -I` from a shell before the redirect register is finalised — the **404 to Start** plugin may be sending some of them to the homepage, which would be a blanket-homepage redirect by accident.

**404:** `/wp-json/tcb/v1/video-reporting` (Thrive endpoint).

### 15b. Site-wide SEO element findings

| Finding Count Detail               |             |                                                                                                                                                               |
| ---------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pages with a meta description**  | **3 of 57** | `/products/` (212) · `/products-2/` (212, identical) · `/services/hair-raiser-organic/` (118)                                                                 |
| Pages with **no** meta description | **54**      | Includes `/`, `/howtobuy/`, `/kegerators/`, `/about/`, `/nitro-cold-brew/`, every blog post                                                                   |
| Pages with no canonical            | 4           | `/privacy-policies/`, `/terms-of-service/`, `/thank-you-page-usa/`, `/thank-you-your-ticket-is-paid/`                                                         |
| Pages with `noindex`               | 4           | the same four — correct and intentional                                                                                                                       |
| Pages with no H1                   | 3           | `/nitro-coffee-questions/`, `/privacy-policies/`, `/terms-of-service/`                                                                                        |
| Pages with an AMP twin             | 29 of 57    | the rest have none                                                                                                                                            |
| Pages with Article schema          | \~15        | all blog posts, plus `Person`                                                                                                                                 |
| Pages with no schema at all        | 6           | `/category/our-facilities/`, `/category/products/`, `/category/tea/`, `/category/news-nitro-coffee-and-nitro-tea/`, `/author/admin/`, `/author/admin/page/2/` |
| Forms per page                     | 3–4         | global (Contact Form 7 / Thrive), not page-specific                                                                                                           |

### 15c. Flags for the migration master plan

**Duplicate pages:** `/products/` ↔ `/products-2/` (this report) · `/nitro-cold-brew/` ↔ `/nitro-cold-brew-old/` (identical title **and** H1) · `/healthy-benefits-drinking-nitro-coffee-nitro-coffee-healthy/` ↔ `/nitro-coffee-health-benefits/` (same cluster) · `/blog/` ↔ `/blog-old/`.

**Orphan pages (in sitemap, zero internal links):** `/products-2/`, `/nitro-cold-brew-old/`, `/hot-nitro-equipment-rental/`, `/interested-in-selling-usa/`, `/interested-in-selling-eu-and-usa/`, `/interested-in-selling-eu-qr-2/`, `/blog-old/`, `/on-tap-in-10-min/`, `/gastro-and-hotel-2023-paid-ticket/`, `/thank-you-page-usa/`, `/stability-kegs-nitro-coffee/`.

**Malformed URLs being crawled:** `/To`, `/where-to-refill-your-` (and its `http://` twin), `/roots/`. Something is emitting broken links.

**Redirect-chain risk:** three contact URLs (`/contact`, `/contact/`, `/contact-bona-fide-nitro-coffee-and-tea/`); trailing-slash-less twins answered for at least `/hot-nitro-coffee` and `/nitro-cold-brew`.

**Plugin-generated URLs that must NOT be reproduced:** all 25 `/…/amp/` URLs · `/amp/?bpa_page=bookingpress_download&…` ×3 · `/?bpa_page=…` ×3 · `/?p=1187`, `/?p=1202`, `/?p=1211` · `/?s={search_term_string}` · `/comments/feed/` · `/wp-admin/*`, `/wp-login.php*`, `/wp-json/*` · `/resource/video_files/*.mp4?t={seek_to_start_number}` · WordPress author and category archives.

**Ranking URLs that MUST be reproduced:** `/`, `/products/`, `/products-2/`, `/howtobuy/`, `/kegerators/`, `/nitro-cold-brew/`, `/hot-nitro-coffee/`, `/cold-brew-coffee-concentrate-bag-in-box-versus-cold-brew-in-kegs/`, `/healthy-benefits-drinking-nitro-coffee-nitro-coffee-healthy/`, `/about/`, `/contact-bona-fide-nitro-coffee-and-tea/`, `/coffee-on-tap-is-the-future/`, `/nitro-coffee-kegs/`, `/3-cups-of-coffee-a-day-why-it-can-be-good-for-the-health/`, `/blog/`, `/nitro-coffee-questions/`, `/hot-nitro-equipment-rental/`, `/nitro-cold-brew-old/`, `/nitro-cold-brew-coffee-made-easy-2/`, `/what-is-nitro-cold-brew-coffee/`.

**Analytics / integrations to carry over:** Google Tag Manager (`GTM-`), Facebook Pixel (`fbq` + `dataLayer`), Klaviyo (`static.klaviyo.com/onsite/js/klaviyo.js`), Google reCAPTCHA, Contact Form 7, BookingPress. GTM, Facebook Pixel and Klaviyo are configured in the **Head & Footer Code** plugin (two code blocks, 625 and 242 characters) — that is where to read the exact snippets before the rebuild.

**Redirect rules to carry over:** the 11 Simple 301 Redirects rules in §5b. Yoast Redirects is empty.

### 15d. "Deceptive pages" security warning — read-only findings

**DATA.**

1. Every theme-rendered front-end page carries three third-party script tags: `cdn.quickdelivr.com/mpackage.js` (×2) and `cdn.coredelivr.com/mpackage.js`. Verified on `/`, `/products/`, `/products-2/`, `/howtobuy/`, `/about/`, `/blog/`, `/contact-bona-fide-nitro-coffee-and-tea/`, `/nitro-cold-brew/`.
2. They are **not** present on `/wp-login.php`, `/products/amp/`, `/?feed=rss2` or `/wp-json/`.
3. They are **not** in the Head & Footer Code plugin, which contains only the legitimate GTM / Facebook / Klaviyo blocks.
4. They **are** present in the active **Sydney theme's** **`header.php`**, a 59-line file, on **lines 18 and 19** — read via the Theme File Editor. The file was **not modified**.
5. In the rendered HTML, the injection sits **inside** **`<head>`** and is immediately preceded by inline JavaScript using randomised identifiers (`kEWRpcHH`, `wConDmkjW`, `lcKgBdJa`, `NdLCkEWOVdMG`, `hSkdzblcUG`) — the signature of obfuscated/packed code.
6. Search Console reports the security issue as **"Deceptive pages"** with **Sample URLs: N/A**.
7. URL Inspection lists `http://weon.polylepistizttyrant.lol/` among the referring pages for `http://bonafidenitro.com/`.
8. WordPress core is **7.0.5** with 7.1.1 available; Site Health reports a critical issue and 12 items.

**INTERPRETATION.** `cdn.quickdelivr.com` and `cdn.coredelivr.com` are lookalike "CDN" hostnames serving an identically-named `mpackage.js`, loaded from a hand-edited theme file on every public page, next to obfuscated inline code. That pattern is consistent with a **WordPress theme-file compromise**, and it is the most likely cause of the Safe Browsing "Deceptive pages" flag.

**What this means for the migration:** a static rebuild will drop the injection automatically — but **it must not be treated as the fix**. The flag persists until the content is removed and a Safe Browsing review is requested, and if the underlying access route is still open, a rebuild does not close it. I did not attempt remediation, and I did not analyse the payload beyond identifying it.

**Recommended next step (not taken):** a proper malware scan and clean-up on the current install, led by someone with server access — file-integrity check of the theme and plugins, review of the five WordPress users (`John Goerke`/admin, `Arnel`, `Noelle`, `sys_maint`, `thrive_support`), review of recently modified files, then a Safe Browsing review request. **`sys_maint`** **and** **`thrive_support`** **are accounts worth confirming are expected.**

---

## 16. REMAINING UNKNOWNS

| # Unknown Why it matters How to resolve  |                                                                              |                                                                                                                                                             |                                                                                                                                        |
| ---------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 1                                        | **Why** **`/products-2/`** **was created, and by whom/what**                 | Determines whether it is a deliberate wholesale page or an abandoned redesign                                                                               | Ask John Goerke (author of both) and Arnel (revision author on 147). WordPress does not record it                                      |
| 2                                        | **Whether the Alliance Brand range is still a live offer**                   | Gate 6 of the consolidation decision                                                                                                                        | Business question                                                                                                                      |
| 3                                        | **Whether the published wholesale price list is intentionally public**       | It is the only pricing on the site, on an orphan URL                                                                                                        | Business question                                                                                                                      |
| 4                                        | **Is Yoast's canonical on either page an explicit override or the default?** | Affects how the static equivalent is generated                                                                                                              | Requires opening the page editor, which I did not do. Alternatively read `_yoast_wpseo_canonical` in `wp_postmeta` via database access |
| 5                                        | **Why both pages were modified on 2026-09-20 within 45 minutes**             | Could be a person editing, or a plugin touching posts                                                                                                       | Check with the team; the revision diffs would show it (readable via the Revisions screen)                                              |
| 6                                        | **The real destinations of the 15 cross-origin redirects**                   | Needed before the redirect register is final; some may be going to the homepage via "404 to Start"                                                          | `curl -I` each from a shell                                                                                                            |
| 7                                        | **Historical external links to** **`/products-2/`**                          | Gate 9. GSC cannot answer it                                                                                                                                | Semrush / Ahrefs / Majestic historical backlink index                                                                                  |
| 8                                        | **Which specific URLs triggered "Deceptive pages"**                          | GSC reports Sample URLs: N/A                                                                                                                                | Server-side malware scan                                                                                                               |
| 9                                        | **The exact source of the obfuscated inline blob**                           | `header.php` is only 2,148 bytes with no line over 192 chars, so the large obfuscated block in the rendered HTML has another origin                         | File-integrity scan across theme, plugins and core                                                                                     |
| 10                                       | **Whether** **`/products-2/`** **content pre-dates the current version**     | Its oldest retained revision is 20 seconds after creation, so the original clone state is visible, but anything before 2022-01-20 on `/products/` is pruned | Nothing further available read-only                                                                                                    |
| 11                                       | **Queries below GSC's display threshold for** **`/products-2/`**             | 258 queries shown; the long tail is truncated                                                                                                               | Accept as a known limit                                                                                                                |
| 12                                       | **Whether the** **`-2`** **slug carries any user-perception cost**           | Not an SEO question, a brand one                                                                                                                            | Business judgement                                                                                                                     |

---

# CONCLUSIONS

## INITIAL MIGRATION DECISION FOR `/products/`

**KEEP AS STATIC 200 AT THE IDENTICAL URL, SELF-CANONICAL, INDEXED, IN THE SITEMAP, IN THE GLOBAL NAVIGATION.**

No redirect. No canonical change. No title or H1 rewrite. No intent change. Preserve the non-branded keg vocabulary, both Bag-in-Box sections, all 13 Amazon links, all 16 store links, the equipment cross-sell, all 35 image filenames, and the `BreadcrumbList` markup. `/products/amp/` 301s here. This URL carries 1,171 clicks, 87,725 impressions, the domain's most valuable non-branded query cluster and its second-strongest deep link profile — it is the highest-risk single asset in the entire migration.

## INITIAL MIGRATION DECISION FOR `/products-2/`

**KEEP AS STATIC 200 AT THE IDENTICAL URL, SELF-CANONICAL, INDEXED, IN THE SITEMAP, AND DELIBERATELY LEFT ORPHANED.**

No redirect to `/products/`. No cross-canonical. No `noindex`. No slug tidy-up. The investigation found a **strong reason not to consolidate at launch**: this URL is the best-ranking page on the domain for `pet coffee keg` (position 4.3 vs `/products/` at 14.0), it is the sole host of the Alliance Brand range and its \~295 impressions of Caveman queries, it holds a supplier/manufacturer B2B query set `/products/` does not serve, and Google has independently selected it as its own canonical despite byte-identical metadata. Its **only** discovery path is the sitemap, so sitemap inclusion is not optional — it is load-bearing. Preserve the price list, the six partner SKUs and their six unique image filenames, and the PET-keg format vocabulary.

## POST-MIGRATION DECISION TO REVISIT

**Re-open the consolidation question no earlier than 90 days after launch, against the eleven gates in §14, and only after the two prerequisite changes below have each been made and measured alone.**

1. **First post-migration change:** differentiate `/products-2/`'s `<title>` and meta description from `/products/`'s — changing `/products-2/` only, leaving `/products/` untouched. This is the last remaining duplicate signal and the condition most likely to make Google collapse the pair by itself.
2. **Second, separately:** consider one or two contextual internal links to `/products-2/` from `/howtobuy/`, and formalise the retail-vs-wholesale split described in §13.
3. **Then, and only then,** evaluate consolidation. Consolidate early **only** if GSC reports `/products-2/` as "Duplicate, Google chose different canonical than user" — at that point Google has decided, and the response should be a deliberate 301 with all valuable source content already living on the destination.

**Separately and with higher urgency than anything in this report:** the "Deceptive pages" security issue and the theme-file script injection documented in §15d need a proper remediation process on the current site. That work is independent of the migration and should not wait for it.

---

*End of report. Read-only investigation. Nothing in WordPress, Google Search Console, the sitemap, redirects, canonicals or any production file was modified. No code was written and no change was implemented.*