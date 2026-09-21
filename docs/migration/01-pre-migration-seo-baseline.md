# BONA FIDE — PRE-MIGRATION SEO BASELINE

**Property audited:** `sc-domain:bonafidenitro.com` (Google Search Console, Domain property)
**Audit date:** 20–21 September 2026
**Audit type:** Read-only SEO discovery and preservation audit. **Nothing was modified** in Search Console, WordPress, DNS, sitemaps, redirects or any production file. No sitemap was submitted or removed, no validation or re-indexing was requested, no security review was requested.
**Companion file:** `bona-fide-seo-baseline-RAW-DATA-APPENDIX.md` — every figure quoted here is traceable to a table in that file.

**Convention used throughout:**

> **DATA** = read directly from Google Search Console (or, where stated, from a read-only fetch of the live site).
> **INTERPRETATION** = my reading of that data. Always labelled.
> Where Search Console cannot supply something, it is stated explicitly rather than estimated.

---

## 1. EXECUTIVE SUMMARY

**DATA — the shape of the current organic footprint**

- Over the last 16 months the site earned **4,590 clicks from 356,000 impressions** (CTR 1.3%, average position 15.6).
- Over the last 3 months: **888 clicks / 54,100 impressions / 1.6% CTR / position 12.3**.
- Google has **42 pages indexed** and **76 not indexed**.
- **Just two URLs —** **`/`** **and** **`/products/`** **— produced 3,222 of 4,590 clicks over 16 months (70%).** Adding `/howtobuy/` and the HTTP homepage brings it to 3,859 (84%).
- The site has **182 external links from 65 domains**; **129 of those links (71%) point at the homepage**.
- **86% of clicks and 80% of impressions come from the United States.**
- Mobile and desktop are almost exactly level on clicks (445 vs 437 over 3 months) but not on position (8.5 mobile vs 16.8 desktop).
- **All non-branded commercial traffic is keg-related**: `cold brew keg`, `nitro cold brew keg`, `cold brew kegs`, `coffee keg`, `nitro coffee keg` and variants. These are owned almost exclusively by `/products/`.
- **One security issue is open: "Deceptive pages."** Manual actions: none.

**INTERPRETATION — what this means for the rebuild**

1. **The migration risk is extremely concentrated.** Four URLs carry 84% of all organic clicks. If `/`, `/products/`, `/howtobuy/` and their query associations survive intact, the site survives the rebuild. If any one of them is broken, a double-digit percentage of organic traffic goes with it.
2. **The brand is the traffic engine, and it converts.** `bonafide coffee`, `bona fide nitro coffee`, `bona fide coffee`, `bonafide nitro coffee` and `bona fide brewing company` together account for **990 of 4,590 clicks (21.6%)** at CTRs of 32–79%. This is defensive traffic — easy to keep, embarrassing to lose.
3. **The commercial non-branded franchise is "keg", not "nitro".** `/products/` ranks 7–10 for the whole keg cluster and earns 82+56+43+32+24+22+17+15+12+11+10+10 ≈ **334 clicks** from it. That cluster is the single most valuable non-branded asset in the property and its home must be preserved.
4. **The site's biggest impression pools convert at \~0%.** `bona fide` (18,994 impressions, 4 clicks, position 13.0) and `nitro coffee` (17,541 impressions, 19 clicks, position 19.7) together represent **36,535 impressions — 10.3% of all impressions — producing 23 clicks.** This is the largest single upside in the property, and it is an architecture/relevance problem, not a copywriting problem.
5. **Three duplicate pairs are actively cannibalising.** `/products/` vs `/products-2/` share an *identical* title tag and meta description. `/nitro-cold-brew/` vs `/nitro-cold-brew-old/` share an *identical* title and H1. `/healthy-benefits-drinking-nitro-coffee-nitro-coffee-healthy/` vs `/nitro-coffee-health-benefits/` compete for the same "is nitro cold brew healthy/bad for you" cluster. All are separately indexed and self-canonical.
6. **AMP is a live dependency, not legacy.** 8,415 impressions and 32 clicks in the last 3 months came through AMP non-rich results, and 25 `/amp/` URLs are in Google's index as canonical alternates. A static rebuild will almost certainly drop AMP; that needs to be a deliberate, planned loss with redirects, not a surprise.
7. **The open "Deceptive pages" security issue is the single most urgent item in this document** and is out of scope for the migration itself — it needs resolving on the *current* site regardless of the rebuild.

---

## 2. CURRENT ORGANIC SEARCH FOOTPRINT

### DATA

| Window Clicks Impressions CTR Avg position  |       |         |      |      |
| ------------------------------------------- | ----- | ------- | ---- | ---- |
| Last 28 days                                | 234   | 14,000  | 1.7% | 12.9 |
| Previous 28 days                            | 286   | 17,400  | 1.6% | 12.7 |
| Last 3 months                               | 888   | 54,100  | 1.6% | 12.3 |
| Same 3 months last year                     | 826   | 69,400  | 1.2% | 27.3 |
| Last 16 months                              | 4,590 | 356,000 | 1.3% | 15.6 |

- 28d vs previous 28d: **clicks −18.2%, impressions −19.5%**.
- 3 months YoY: **clicks +7.5%, impressions −22.0%, CTR 1.2% → 1.6%, position 27.3 → 12.3**.
- Distinct query count, 3 months: **867**. 58 of those produced at least one click.
- Distinct landing pages with impressions: **58** (3 months), **82** (16 months).
- Search appearance, 3 months: AMP non-rich results 32 clicks / 8,415 impressions; AMP article 1 click / 184 impressions. No other appearance types exist.
- Devices, 3 months: Mobile 445 clicks / 29,073 impr / pos 8.5 · Desktop 437 / 24,775 / pos 16.8 · Tablet 6 / 259 / pos 6.3.
- Countries, 3 months: US 765 clicks / 43,101 impr; next largest Canada 13 clicks; 158 countries in total.
- Search Console Overview recommendation: *"A query recently got fewer impressions than usual —* ***bona fide*** *↓64%."*

### INTERPRETATION

The YoY picture is **qualitatively healthy and quantitatively shrinking**: the site lost a fifth of its impressions but gained clicks, because average position improved by 15 places and CTR rose by a third. That is the signature of Google trimming low-relevance long-tail impressions while the pages that matter rank better. The recent 28-day decline (−18% clicks) is a real short-term softening, driven mostly by the homepage (−52 clicks on its own — see §7), and coincides with the reported 64% impression drop on the query `bona fide`.

Mobile ranks nine positions better than desktop yet converts at a lower CTR. That gap is worth carrying into the rebuild brief, because a static site typically improves mobile further.

---

## 3. HIGHEST-VALUE EXISTING URLs

### DATA — 16-month ranking by clicks (top 20; full list in appendix §4)

| # URL Clicks Impressions CTR Pos Ext. links Int. links Indexed  |                                                                      |       |        |      |      |     |    |                          |
| --------------------------------------------------------------- | -------------------------------------------------------------------- | ----- | ------ | ---- | ---- | --- | -- | ------------------------ |
| 1                                                               | `/`                                                                  | 2,051 | 89,411 | 2.3% | 18.9 | 129 | 41 | Yes                      |
| 2                                                               | `/products/`                                                         | 1,171 | 87,725 | 1.3% | 12.7 | 8   | 41 | Yes                      |
| 3                                                               | `/howtobuy/`                                                         | 336   | 34,416 | 1.0% | 22.1 | 13  | 41 | Yes                      |
| 4                                                               | `http://bonafidenitro.com/`                                          | 301   | 11,611 | 2.6% | 7.9  | —   | —  | No (alternate/canonical) |
| 5                                                               | `/products-2/`                                                       | 178   | 23,928 | 0.7% | 10.6 | 0   | 0  | Yes                      |
| 6                                                               | `/kegerators/`                                                       | 105   | 22,542 | 0.5% | 22.5 | 0   | 41 | Yes                      |
| 7                                                               | `/nitro-cold-brew/`                                                  | 87    | 45,027 | 0.2% | 16.4 | 2   | 41 | Yes                      |
| 8                                                               | `/hot-nitro-coffee/`                                                 | 87    | 5,179  | 1.7% | 5.3  | 4   | 15 | Yes                      |
| 9                                                               | `/cold-brew-coffee-concentrate-bag-in-box-versus-cold-brew-in-kegs/` | 71    | 15,115 | 0.5% | 14.8 | 1   | 41 | Yes                      |
| 10                                                              | `/nitro-cold-brew-old/`                                              | 55    | 27,204 | 0.2% | 13.2 | 0   | 0  | Yes                      |
| 11                                                              | `/healthy-benefits-drinking-nitro-coffee-nitro-coffee-healthy/`      | 43    | 19,336 | 0.2% | 10.8 | 1   | 4  | Yes                      |
| 12                                                              | `/about/`                                                            | 31    | 18,781 | 0.2% | 8.6  | 2   | 41 | Yes                      |
| 13                                                              | `/nitro-cold-brew-coffee-made-easy-2/`                               | 28    | 12,319 | 0.2% | 22.2 | 1   | 2  | Yes                      |
| 14                                                              | `/contact-bona-fide-nitro-coffee-and-tea/`                           | 25    | 9,620  | 0.3% | 11.6 | 0   | 41 | Yes                      |
| 15                                                              | `/hot-nitro-equipment-rental/`                                       | 24    | 2,737  | 0.9% | 8.5  | 0   | 0  | Yes                      |
| 16                                                              | `/author/admin/`                                                     | 24    | 1,204  | 2.0% | 8.3  | 0   | 0  | Yes                      |
| 17                                                              | `/coffee-on-tap-is-the-future/`                                      | 19    | 8,405  | 0.2% | 9.2  | 0   | 3  | Yes                      |
| 18                                                              | `/coffee-trends-dominate-2018/`                                      | 10    | 2,613  | 0.4% | 16.8 | 3   | 12 | Yes                      |
| 19                                                              | `/nitro-coffee-kegs/`                                                | 10    | 1,179  | 0.8% | 9.1  | 5   | 1  | Yes                      |
| 20                                                              | `/3-cups-of-coffee-a-day-…-health/`                                  | 9     | 24,017 | 0.0% | 9.3  | 3   | 15 | Yes                      |

### INTERPRETATION

Three distinct kinds of "high value" appear here, and the rebuild must treat them differently:

- **Click assets** — `/`, `/products/`, `/howtobuy/`, `/products-2/`, `/hot-nitro-coffee/`. These pay the bills today.
- **Impression assets that don't convert** — `/nitro-cold-brew/` (45,027 impressions → 87 clicks), `/3-cups-of-coffee-a-day-…/` (24,017 → 9), `/nitro-cold-brew-old/` (27,204 → 55), `/kegerators/` (22,542 → 105), `/about/` (18,781 → 31), `/healthy-benefits-…/` (19,336 → 43). Collectively **157,000 impressions producing 330 clicks.** These are Google's opinion that the domain is relevant to those topics. Destroying the URLs destroys the relevance signal; the low CTR is not a reason to delete them.
- **Link assets** — `/howtobuy/` (13 links / 6 domains) and `/nitro-coffee-kegs/` (5 links / 2 domains) punch far above their traffic. `/nitro-coffee-kegs/` earns 10 clicks in 16 months but holds the third-highest external link count on the site. That is a P1/P2 asset on link equity alone.

`/author/admin/` earning 24 clicks at 2.0% CTR is an artefact of the WordPress users sitemap, not an intentional asset — but it is indexed and does receive traffic, so removal is a decision, not a cleanup.

---

## 4. HIGHEST-VALUE QUERIES

### DATA — 16-month top queries by clicks

| Query Clicks Impr CTR Pos Type        |        |           |          |          |                                |
| ------------------------------------- | ------ | --------- | -------- | -------- | ------------------------------ |
| bonafide coffee                       | 315    | 732       | 43.0%    | 1.6      | Branded                        |
| bona fide nitro coffee                | 247    | 393       | 62.8%    | 1.5      | Branded                        |
| bona fide coffee                      | 236    | 435       | 54.3%    | 1.0      | Branded                        |
| bonafide nitro coffee                 | 125    | 158       | 79.1%    | 1.8      | Branded                        |
| **cold brew keg**                     | **82** | **4,610** | **1.8%** | **9.1**  | **Non-branded commercial**     |
| bona fide brewing company             | 67     | 175       | 38.3%    | 1.5      | Branded                        |
| **nitro cold brew keg**               | **56** | **3,662** | **1.5%** | **9.4**  | **Non-branded commercial**     |
| **cold brew kegs**                    | **43** | **1,478** | **2.9%** | **7.3**  | **Non-branded commercial**     |
| **nitro brew keg**                    | **32** | **877**   | **3.6%** | **9.1**  | **Non-branded commercial**     |
| **cold brew coffee keg**              | **24** | **935**   | **2.6%** | **10.4** | **Non-branded commercial**     |
| **coffee keg**                        | **22** | **3,340** | **0.7%** | **9.5**  | **Non-branded commercial**     |
| nitro coffee                          | 19     | 17,541    | 0.1%     | 19.7     | Non-branded informational/head |
| bonafide brewing                      | 18     | 89        | 20.2%    | 4.8      | Branded                        |
| **nitro coffee keg**                  | **17** | **2,084** | **0.8%** | **9.5**  | **Non-branded commercial**     |
| **hot nitro coffee**                  | **16** | **448**   | **3.6%** | **4.7**  | **Non-branded product**        |
| **coffee kegs**                       | **15** | **784**   | **1.9%** | **7.2**  | **Non-branded commercial**     |
| **coffee on tap**                     | **14** | **4,597** | **0.3%** | **6.7**  | **Non-branded category**       |
| nitro coffee kegs                     | 13     | 213       | 6.1%     | 5.8      | Non-branded commercial         |
| keg of cold brew                      | 11     | 540       | 2.0%     | 7.8      | Non-branded commercial         |
| john goerke                           | 10     | 584       | 1.7%     | 6.2      | Person/brand-adjacent          |
| cold brew coffee kegs                 | 10     | 559       | 1.8%     | 7.5      | Non-branded commercial         |
| keg of coffee                         | 10     | 509       | 2.0%     | 6.7      | Non-branded commercial         |
| nitro cold brew kegs                  | 10     | 419       | 2.4%     | 7.3      | Non-branded commercial         |
| where to buy kegs of cold brew coffee | 10     | 262       | 3.8%     | 8.5      | Non-branded transactional      |

### DATA — largest impression pools (16 months)

| Query Clicks Impressions CTR Position  |    |        |      |      |
| -------------------------------------- | -- | ------ | ---- | ---- |
| bona fide                              | 4  | 18,994 | 0.0% | 13.0 |
| nitro coffee                           | 19 | 17,541 | 0.1% | 19.7 |
| cold brew keg                          | 82 | 4,610  | 1.8% | 9.1  |
| coffee on tap                          | 14 | 4,597  | 0.3% | 6.7  |
| nitro cold brew keg                    | 56 | 3,662  | 1.5% | 9.4  |
| coffee keg                             | 22 | 3,340  | 0.7% | 9.5  |
| nitrocoffee                            | 1  | 2,466  | 0.0% | 14.5 |
| is nitro cold brew bad for you         | 2  | 2,162  | 0.1% | 12.6 |
| nitro coffee keg                       | 17 | 2,084  | 0.8% | 9.5  |
| bonafide                               | 1  | 1,943  | 0.1% | 6.3  |

### DATA — position bands (16-month, click-producing queries)

- **Positions 1–3:** `bona fide coffee` (1.0), `bona fide nitro coffee and tea` (1.0), `bona fide nitro coffee` (1.5), `bona fide brewing company` (1.5), `bonafide coffee` (1.6), `bonafide nitro coffee` (1.8). *All branded.*
- **Positions 4–10:** `hot nitro coffee` (4.7), `bonafide brewing` (4.8), `nitro coffee kegs` (5.8), `bonafide` (6.3), `john goerke` (6.2), `coffee on tap` (6.7), `keg of coffee` (6.7), `coffee in a keg` (6.8), `coffee kegs` (7.2), `cold brew kegs` (7.3), `nitro cold brew kegs` (7.3), `kegged coffee` (7.3), `iced coffee keg` (7.5), `keg of cold brew` (7.8), `keg nitro cold brew` (7.8), `cold brew nitro keg` (7.9), `is nitro coffee bad for you` (7.9), `keg coffee` (8.5), `where to buy kegs of cold brew coffee` (8.5), `cold brew keg` (9.1), `nitro brew keg` (9.1), `nitro keg coffee` (9.1), `nitro cold brew coffee keg` (9.2), `nitro cold brew keg` (9.4), `coffee keg` (9.5), `nitro coffee keg` (9.5), `cold brew coffee keg` (10.4).
- **Positions 11–20:** `bona fide` (13.0), `nitro keg` (14.1), `coffee near me` (15.5), `nitro tea` (16.4), `countertop nitro coffee dispenser` (16.8), `nitro coffee` (19.7).
- **Beyond 20:** `what is nitro cold brew` (58.6 over 3 months), `cold brew keg cost` (56.2), `nitrogen coffee` (35.1), `nitro cold brew machine` (30.8), and most "what is nitro…" informational queries.

### INTERPRETATION

The property has a **three-layer query structure** that the new architecture should mirror rather than invent:

1. **Brand layer (positions 1–2, CTR 32–79%)** — owned, secure, and worth \~22% of all clicks. The only risk here is a broken URL or a title/H1 that stops matching.
2. **"Keg" commercial layer (positions 6–10, CTR 0.7–6%)** — the actual money layer. Roughly 25 distinct keg-shaped queries all resolve to `/products/`. Two things are notable: the whole cluster sits *just* outside the top 5, and CTR is depressed at those positions. Small ranking gains here have outsized revenue effect.
3. **"Nitro / what is nitro" informational layer (positions 12–60, CTR \~0%)** — enormous impression volume, negligible clicks, and split across five different pages. This is where the architecture is actively working against the site.

`john goerke` (584 impressions, 10 clicks, pos 6.2) is a person-name query with real traffic — worth knowing whose page that is before anything is deleted.

Two queries in the 3-month tail read as AI-assistant prompts rather than typed searches: *"who serves the smoothest nitro cold brew in the los angeles area?"* (42 impressions, pos 7.5) and *"who's the best cold brew and nitro coffee equipment repair for facilities?"* (28 impressions, pos 7.1). **INTERPRETATION:** the domain is already being surfaced for conversational/AI-style queries at strong positions. That's a signal worth designing for, not an anomaly.

---

## 5. QUERY → PAGE MAP

Full per-URL query tables are in appendix §8. Condensed map, 16-month window:

| Query cluster Google's current landing page Position Evidence                                                                                                                                                                                                                                                                                                                |                                                                                                                                                                                                                                                                                                                                                                                      |           |                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ----------------------------------------------------------------- |
| `bonafide coffee`, `bona fide coffee`, `bona fide nitro coffee`, `bonafide nitro coffee`, `bona fide brewing company`, `bonafide brewing`                                                                                                                                                                                                                                    | **`/`** (primary) — **also** `http://…/`, `/products/`, `/products-2/`, `/nitro-cold-brew/`, `/about/`, `/kegerators/`, `/howtobuy/`                                                                                                                                                                                                                                                 | 1.0–1.6   | 5 URLs ranking simultaneously for the same brand terms            |
| `cold brew keg`, `cold brew kegs`, `nitro cold brew keg`, `nitro brew keg`, `cold brew coffee keg`, `coffee keg`, `coffee kegs`, `nitro coffee keg`, `nitro coffee kegs`, `keg of cold brew`, `keg of coffee`, `cold brew coffee kegs`, `nitro cold brew kegs`, `where to buy kegs of cold brew coffee`, `keg coffee`, `coffee in a keg`, `kegged coffee`, `iced coffee keg` | **`/products/`**                                                                                                                                                                                                                                                                                                                                                                     | 5.6–10.4  | 623 distinct queries map to this URL                              |
| `nitro coffee` (17,541 impr)                                                                                                                                                                                                                                                                                                                                                 | **Split across** **`/`** **(16,520),** **`/nitro-cold-brew/`** **(5,075),** **`/about/`** **(4,688),** **`/products-2/`** **(4,149),** **`/cold-brew-…-bag-in-box…/`** **(3,445),** **`/howtobuy/`** **(3,385),** **`/kegerators/`** **(895),** **`/what-is-nitro-cold-brew-coffee/`** **(414),** **`/healthy-benefits…/`** **(279),** **`/nitro-coffee-health-benefits/`** **(70)** | 4.0–74.9  | **10 URLs competing**                                             |
| `bona fide` (18,994 impr)                                                                                                                                                                                                                                                                                                                                                    | `/` (17,848) + `/kegerators/` (36) + `/about/` (97)                                                                                                                                                                                                                                                                                                                                  | 9.8–19.4  | Near-zero CTR at pos 13                                           |
| `coffee on tap`, `tap coffee`, `on tap coffee`, `tea on tap`, `coffe on tap`, `nitro coffee on tap`, `cold brew on tap`                                                                                                                                                                                                                                                      | **`/coffee-on-tap-is-the-future/`**                                                                                                                                                                                                                                                                                                                                                  | 6.0–24.7  | Clean single-page ownership                                       |
| `hot nitro coffee`, `nitro hot coffee`, `nitro coffee hot`, `hot nitro`                                                                                                                                                                                                                                                                                                      | **`/hot-nitro-coffee/`**                                                                                                                                                                                                                                                                                                                                                             | 3.6–5.1   | Clean single-page ownership, best positions on site outside brand |
| `is nitro coffee bad for you`, `is nitro cold brew bad for you`, `is nitro brew coffee bad for you`, `is nitro coffee safe`                                                                                                                                                                                                                                                  | **`/nitro-cold-brew-old/`** (primary) — **also** `/healthy-benefits-…/`, `/nitro-coffee-health-benefits/`                                                                                                                                                                                                                                                                            | 7.2–63.3  | **3 URLs competing**                                              |
| `nitro cold brew benefits`, `are nitro cold brews healthy`, `is nitro cold brew healthy`, `benefits of nitro cold brew`, `nitro coffee benefits`                                                                                                                                                                                                                             | **Split between** **`/healthy-benefits-…/`** **and** **`/nitro-coffee-health-benefits/`**                                                                                                                                                                                                                                                                                            | 13.6–32.8 | **2 URLs competing, both \~0% CTR**                               |
| `what is nitro`, `what is nitro coffee`, `nitro meaning`, `nitro drip`, `what does nitro mean in coffee`, `wat is een nitro coffee`, `nitrogen coffee`                                                                                                                                                                                                                       | **`/what-is-nitro-cold-brew-coffee/`** — **also** `/nitro-cold-brew-old/`, `/nitro-cold-brew/`, `/healthy-benefits-…/`                                                                                                                                                                                                                                                               | 1.0–78.0  | **4 URLs competing**                                              |
| `bag in box coffee`, `bag in box coffee concentrate`, `bag in box cold brew coffee`, `cold brew coffee bag in box`, `bib coffee`, `coffee bag in box`, `bag in box liquid coffee concentrate`                                                                                                                                                                                | **`/cold-brew-coffee-concentrate-bag-in-box-versus-cold-brew-in-kegs/`**                                                                                                                                                                                                                                                                                                             | 13.1–52.1 | Clean single-page ownership                                       |
| `nitro coffee dispenser`, `countertop nitro coffee dispenser`, `cold brew dispenser`, `nitro coffee kegerator`, `commercial nitro cold brew machine`                                                                                                                                                                                                                         | **`/kegerators/`**                                                                                                                                                                                                                                                                                                                                                                   | 13.0–46.3 | Clean single-page ownership                                       |
| `cold brew on draft`, `nitro draft coffee`, `coffee draft system`, `draft nitro coffee`, `cold brew draft`, `how is nitro coffee made`, `nitro coffee setup`, `draft cold brew`, `coffee on draft`                                                                                                                                                                           | **`/nitro-cold-brew-coffee-made-easy-2/`**                                                                                                                                                                                                                                                                                                                                           | 14.1–76.1 | Clean ownership — **zero clicks on every top query**              |
| `coffee distributors`, `coffee distributors near me`, `wholesale nitro cold brew`, `nitro coffee can supplier`, `nitro cold brew coffee can supplier`, `nitro cold brew for office`                                                                                                                                                                                          | **`/howtobuy/`**                                                                                                                                                                                                                                                                                                                                                                     | 4.0–61.4  | B2B intent, clean ownership                                       |
| `europe nitro coffee dispenser two tap price eur` and EU-equipment-price variants, `weitere anbieter`                                                                                                                                                                                                                                                                        | **`/hot-nitro-equipment-rental/`**                                                                                                                                                                                                                                                                                                                                                   | 2.4–7.4   | EU-specific commercial intent                                     |
| `pet coffee keg`, `kegjoy`, `full keg`, `parts of a keg`                                                                                                                                                                                                                                                                                                                     | **`/nitro-coffee-kegs/`**                                                                                                                                                                                                                                                                                                                                                            | 7.0–29.5  | Low traffic, **high external link count**                         |
| `is 3 cups of coffee too much`, `3 cups of coffee a day`, `is 3 cups of coffee a day too much`, `3 coffees a day`, `3 cups of black coffee a day` + \~30 variants                                                                                                                                                                                                            | **`/3-cups-of-coffee-a-day-why-it-can-be-good-for-the-health/`**                                                                                                                                                                                                                                                                                                                     | 1.8–27.7  | Clean ownership, 24,017 impressions, 9 clicks                     |
| `coffee near me`, `coffee shops near me`, `coffee shop near me`, `nitro coffee near me`, `ventura coffee`, `coffee shops ventura`                                                                                                                                                                                                                                            | **`http://bonafidenitro.com/`** and `/`                                                                                                                                                                                                                                                                                                                                              | 2.8–34.2  | Local-intent traffic landing on the HTTP variant                  |
| `nitro tea`, `nitro infused tea`, `nitrogen infused tea`, `draft tea`, `tea on tap`, `nitro iced tea`, `tea keg`, `what is nitro tea`                                                                                                                                                                                                                                        | **`/`** (1,300 impr) and `/kegerators/` (156)                                                                                                                                                                                                                                                                                                                                        | 6.3–21.2  | **No dedicated tea page exists anywhere on the site**             |

---

## 6. URLs THAT MUST BE PROTECTED

### P1 — MUST PRESERVE (default: keep the same URL)

| URL Why Non-negotiable                                                                        |                                                                                                                                                                  |                                                                                                                      |
| --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `https://bonafidenitro.com/`                                                                  | 2,051 clicks / 89,411 impr (16mo); 129 external links from 55 domains; only Review-snippet page on the site; positions 1.0–1.6 on all brand queries              | URL, brand title/H1 relationship, Review + Breadcrumb structured data                                                |
| `https://bonafidenitro.com/products/`                                                         | 1,171 clicks / 87,725 impr; owns the entire "keg" commercial cluster (≈334 clicks); 8 external links from 7 domains; 41 internal links                           | URL, title `Cold Brew Nitro Coffee Kegs…`, H1 `Best Nitro Cold Brew Coffee Kegs On The Market`, keg keyword coverage |
| `https://bonafidenitro.com/howtobuy/`                                                         | 336 clicks / 34,416 impr; **13 external links from 6 domains — second-most-linked page on the site**; the only B2B/distributor page ranking; down −25 clicks YoY | URL and B2B/distributor/wholesale topical coverage                                                                   |
| `https://bonafidenitro.com/hot-nitro-coffee/`                                                 | 87 clicks at CTR 1.7%, average position **5.3** — the best non-branded position on the site; owns `hot nitro coffee` outright; 4 external links                  | URL, title, H1                                                                                                       |
| `https://bonafidenitro.com/kegerators/`                                                       | 105 clicks / 22,542 impr; sole owner of the equipment/dispenser cluster; 41 internal links                                                                       | URL, equipment/dispenser topical coverage                                                                            |
| `https://bonafidenitro.com/cold-brew-coffee-concentrate-bag-in-box-versus-cold-brew-in-kegs/` | 71 clicks / 15,115 impr; **sole owner of the entire bag-in-box cluster** (\~1,900 impressions across BIB variants); +14 clicks YoY                               | URL — long and ugly, but it is the only BIB asset the domain has                                                     |
| `https://bonafidenitro.com/coffee-on-tap-is-the-future/`                                      | 19 clicks / 8,405 impr; owns `coffee on tap` (4,597 impr, pos 6.7) and the whole "on tap" cluster                                                                | URL, "coffee on tap" topical coverage                                                                                |
| `https://bonafidenitro.com/nitro-coffee-kegs/`                                                | Only 10 clicks, **but 5 external links from 2 domains — third-highest link count on the site**                                                                   | URL must resolve (keep or 301 with intent)                                                                           |
| `https://bonafidenitro.com/contact-bona-fide-nitro-coffee-and-tea/`                           | 25 clicks / 9,620 impr; 41 internal links; conversion endpoint                                                                                                   | URL                                                                                                                  |
| `https://bonafidenitro.com/about/`                                                            | 31 clicks / 18,781 impr at position 8.6; ranks 1.1–1.8 for brand queries; 41 internal links; referring page for `/` and `/products/`                             | URL                                                                                                                  |

### P2 — PRESERVE OR CAREFULLY REDIRECT

| URL Why it has value If the URL must change                                                              |                                                                                                                                                           |                                                                                                                                              |
| -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `/nitro-cold-brew/`                                                                                      | 87 clicks / **45,027 impressions** — the third-largest impression pool of any URL, behind only `/` and `/products/`; ranks 1.0–1.2 on several brand terms | 301 to the new "what is nitro cold brew" hub. Never to the homepage.                                                                         |
| `/products-2/`                                                                                           | 178 clicks / 23,928 impr; +25 clicks YoY (a *growing* page); ranks 1.2–1.4 for brand queries; **0 internal links**                                        | 301 → `/products/` (see §13 — it is a duplicate)                                                                                             |
| `/nitro-cold-brew-old/`                                                                                  | 55 clicks / 27,204 impr; primary ranker for `is nitro coffee bad for you` (pos 7.2); +15 clicks YoY; **0 internal links**                                 | 301 → the consolidated nitro-health/explainer page                                                                                           |
| `/healthy-benefits-drinking-nitro-coffee-nitro-coffee-healthy/`                                          | 43 clicks / 19,336 impr; +8 clicks YoY                                                                                                                    | Keep as the consolidation target for the health cluster, or 301 into it                                                                      |
| `/nitro-cold-brew-coffee-made-easy-2/`                                                                   | 28 clicks / 12,319 impr; **sole owner of the entire "draft / on draft / coffee draft system" cluster**                                                    | 301 → new draft-systems page. This is the closest thing the site has to a "draft coffee" asset, which matters given the new brand direction. |
| `/what-is-nitro-cold-brew-coffee/`                                                                       | 8 clicks / 9,693 impr; owns `what is nitro`, `nitro meaning`, `nitro drip` (pos 1.0–3.2); 2 external links                                                | 301 → consolidated nitro explainer                                                                                                           |
| `/3-cups-of-coffee-a-day-why-it-can-be-good-for-the-health/`                                             | 9 clicks / **24,017 impr**; 3 external links from 3 domains; ranks **2.5** for `is 3 cups of coffee too much` (1,633 impr)                                | Keep. This URL holds a position-2.5 ranking on a 1,600-impression query.                                                                     |
| `/hot-nitro-equipment-rental/`                                                                           | 24 clicks / 2,737 impr at pos 8.5; **sole owner of EU equipment-price queries**; 0 internal links                                                         | Keep if EU rental is still a business line; otherwise 301 → equipment page                                                                   |
| `/interested-in-selling-usa/` · `/interested-in-selling-eu-and-usa/` · `/interested-in-selling-eu-qr-2/` | 9 + 8 + 1 clicks; B2B reseller intent; `/interested-in-selling-eu-and-usa/` has 1 external link                                                           | Consolidate to one reseller page, 301 the other two                                                                                          |
| `/nitro-coffee-health-benefits/`                                                                         | 4 clicks / 8,724 impr                                                                                                                                     | 301 → `/healthy-benefits-…/` (duplicate cluster)                                                                                             |
| `/coffee-trends-dominate-2018/`                                                                          | 10 clicks / 2,613 impr; **3 external links from 1 domain**; 12 internal links                                                                             | Content is dated; the URL carries links. 301 → a trends/insights page.                                                                       |
| `/a-touch-of-vanilla-to-your-nitro-coffee/`                                                              | 4 clicks / 3,746 impr; 2 external links from 2 domains                                                                                                    | 301 → flavours/products                                                                                                                      |
| `/how-ambient-stable-coffee-kegs-help-you-save-more-money/`                                              | 4 clicks / 815 impr; **3 external links from 2 domains**                                                                                                  | 301 → keg/logistics content                                                                                                                  |
| `/nitro-coffee-questions/`                                                                               | 9 clicks / 2,036 impr; 41 internal links (site-wide nav item)                                                                                             | Keep as FAQ, or 301 → new FAQ                                                                                                                |
| `/nitro-coffee-in-time-of-covid-19-pandemic-how-safe-is-it/`                                             | 1 click / 1,842 impr; **2 external links from 2 domains**                                                                                                 | 301 → safety/quality content                                                                                                                 |
| `http://bonafidenitro.com/`                                                                              | 301 clicks / 11,611 impr attributed to it                                                                                                                 | Must 301 → `https://bonafidenitro.com/` (see §12 and §17)                                                                                    |
| `https://www.bonafidenitro.com/`                                                                         | 2 impressions, but referenced as a referring page for `/products/`                                                                                        | Must 301 → apex https                                                                                                                        |

### P3 — CONSOLIDATION CANDIDATE

| URL Reasoning                                                    |                                                                                                                                                                                                                                                                         |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/nitro-coffee-health-benefits/`                                 | Identical topical target to `/healthy-benefits-drinking-nitro-coffee-nitro-coffee-healthy/`; the two split `nitro cold brew benefits` (601 + 621 impressions) and both convert at 0%. One merged page with the combined content would concentrate \~28,000 impressions. |
| `/nitro-cold-brew-old/`                                          | Identical title and H1 to `/nitro-cold-brew/`. Merging concentrates 72,231 impressions onto one URL. `-old` in a live indexed URL is itself a signal problem.                                                                                                           |
| `/products-2/`                                                   | Identical title and meta description to `/products/`. Merging concentrates 111,653 impressions.                                                                                                                                                                         |
| `/is-coffee-healthy/`                                            | 0 clicks / 334 impr, 0 internal links — merge into the health cluster                                                                                                                                                                                                   |
| `/coffee-doesnt-produce-cancer-says-leading-american-scientist/` | 0 clicks / 1,256 impr at pos 28.9 — merge into health cluster                                                                                                                                                                                                           |
| `/nitro-coffee-future/`                                          | 0 clicks / 170 impr — merge with `/coffee-on-tap-is-the-future/` or trends content                                                                                                                                                                                      |
| `/blog-old/`                                                     | 0 clicks / 199 impr, discovered-not-indexed, still in sitemap — merge into `/blog/`                                                                                                                                                                                     |
| `/interested-in-selling-eu-qr-2/`                                | 1 click / 106 impr — merge into one reseller page                                                                                                                                                                                                                       |

### P4 — LOW SEO VALUE (verify before removing)

`/thank-you/` · `/thank-you/amp/` · `/appointment-cancellation-confirmation/` (+`/amp/`) · `/my-bookings/` (+`/amp/`) · `/book-appointment/` · `/cancel-appointment/` · `/cancel-payment/` · `/gastro-and-hotel-2023-paid-ticket/` · `/on-tap-in-10-min/` · `/stability-kegs-nitro-coffee/` · `/thank-you-page-usa/` · `/services/hair-raiser-organic/`, `/services/peru-organic/`, `/services/espresso-organic-nitro-coffee/`, `/services/passion-fruit-tea/`, `/services/mango-tea/`, `/services/organic-hibiscus-tea/`

**INTERPRETATION:** the `/services/*` URLs are the only per-product/per-flavour URLs the site has ever had. They currently earn 2–8 impressions each and 0 clicks, and only one (`/services/hair-raiser-organic/`) is even crawled. They are low-value *as they stand* — but they are also the historical precedent for a product-detail URL pattern, which is directly relevant to the new architecture. Flag for the IA phase, don't just bin them.

### P5 — TECHNICAL / DUPLICATE / UNWANTED INDEXING (document only, implement nothing)

- All 25 `/…/amp/` URLs (correctly excluded as alternates today)
- `/amp/?bpa_page=bookingpress_download&…` × 3 (booking-plugin parameter URLs surfacing as AMP alternates)
- `/?bpa_page=bookingpress_download&action=generate_ics&state=…&appointment_id=` × 3 (redirecting)
- `/?p=1187`, `/?p=1202`, `/?p=1211` (raw WordPress post IDs)
- `/wp-admin/*`, `/wp-admin/admin-ajax.php`, `/wp-login.php?…` × 2, `/wp-admin/?page=sb-instagram-feed`
- `/?s={search_term_string}` (search template leaking into the index)
- `/comments/feed/`
- `/wp-json/tcb/v1/video-reporting` (404)
- `/resource/video_files/8a49e0018aa99881.mp4?t={seek_to_start_number}`
- `/To`, `/roots/`, `/where-to-refill-your-` (and its http variant) — malformed/truncated URLs
- `/contact` (no trailing slash, crawled-not-indexed) vs `/contact/` (redirecting) vs `/contact-bona-fide-nitro-coffee-and-tea/` (indexed) — three contact URLs
- 6 trailing-slash-less duplicates picking up 1 impression each: `/hot-nitro-coffee`, `/nitro-cold-brew`, `/a-touch-of-vanilla-to-your-nitro-coffee`, `/coffee-trend-dominate-2018`, `/3-cups-of-coffee-a-day-why-it-can-be-good-for-the-health`
- `/healthy-benefits-drinking-nitro-coffee-nitro-coffee-health-benefits/` — a near-miss slug of the real page, 2 impressions
- 20+ `/wp-content/uploads/*.jpg|png` image URLs ranking in web search
- 2 indexed PDFs: `/wp-content/uploads/2026/02/Bona-Fide-Marketing-Plan-2026.pdf` (1 click / 602 impr) and `/wp-content/uploads/2021/09/17x11-Bona-FIde-coffee-for-Offices-version-10-Email_compressed.pdf` (0 clicks / 569 impr)

**INTERPRETATION:** the indexed **Bona Fide Marketing Plan 2026 PDF** is worth a second look before migration — an internal-sounding marketing plan is indexed and receiving impressions. That is a business decision, not an SEO one, and it is outside the scope of this audit to act on.

---

## 7. HISTORICAL / SEASONAL SEO ASSETS

### DATA

- 3 months YoY: impressions fell 22% while clicks rose 7.5% and average position improved from 27.3 to 12.3.
- Only **8 URLs lost clicks year over year**: `/howtobuy/` −25, `http://bonafidenitro.com/` −12, `/kegerators/` −3, `/nitro-cold-brew-coffee-made-easy-2/` −1, `/hot-nitro-equipment-rental/` −1, `/coffee-trends-dominate-2018/` −1, `/a-touch-of-vanilla-to-your-nitro-coffee/` −1, `/interested-in-selling-eu-qr-2/` −1.
- Largest YoY gains: `/` +31, `/products-2/` +25, `/nitro-cold-brew-old/` +15, `/cold-brew-…-bag-in-box-…/` +14, `/products/` +10, `/hot-nitro-coffee/` +8, `/healthy-benefits-…/` +8.
- In the last 28 days the homepage fell from 136 clicks to 84 (−52) and from 3,862 to 2,715 impressions (−1,147) — **the entire site-wide 28-day decline is the homepage**.
- GSC flags `bona fide` as down 64% in impressions.
- Pages with large 16-month impressions but near-zero recent clicks: `/nitro-cold-brew/`, `/3-cups-of-coffee-a-day-…/`, `/what-is-nitro-cold-brew-coffee/`, `/nitro-coffee-health-benefits/`, `/a-touch-of-vanilla-to-your-nitro-coffee/`, `/coffee-doesnt-produce-cancer-…/`, `/blog/`.

### INTERPRETATION

Search Console shows **no seasonal pattern** in this property: the 16-month daily chart is noisy but trendless, with no summer/winter cycle on any of the top URLs. The year-over-year movement is compositional, not seasonal.

The important historical finding is the **`/howtobuy/`** **decline**: it is the second-most-externally-linked page on the site and it is down 25 clicks (−30%) year over year while everything else grew. It is also the site's only genuine B2B/distributor asset. **INTERPRETATION:** this page is degrading and is exactly the kind of page a rebuild either rescues or finishes off. It should be treated as a priority rebuild target, not just a preservation target.

The second historical finding is the pages that are **dormant but not dead**: `/3-cups-of-coffee-a-day-…/` has 24,017 impressions and a position-2.5 ranking on `is 3 cups of coffee too much`; `/what-is-nitro-cold-brew-coffee/` ranks 1.0–3.2 for `nitro drip`, `nitro meaning`, `nitro`. Judged on clicks alone both look disposable. Judged on accumulated ranking equity, neither is.

---

## 8. INDEXING & CANONICAL FINDINGS

### DATA

**42 indexed · 76 not indexed across 7 reasons.** Full URL lists in appendix §9.

| Reason Count                             |    |
| ---------------------------------------- | -- |
| Page with redirect                       | 26 |
| Alternate page with proper canonical tag | 26 |
| Excluded by 'noindex' tag                | 7  |
| Blocked due to other 4xx issue           | 1  |
| Not found (404)                          | 1  |
| Discovered – currently not indexed       | 10 |
| Crawled – currently not indexed          | 5  |

URL Inspection results for the five most important URLs:

| URL Status User canonical Google canonical  |                                                            |                              |                                                                                                                              |
| ------------------------------------------- | ---------------------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `/`                                         | Indexed                                                    | self                         | Inspected URL                                                                                                                |
| `/products/`                                | Indexed                                                    | self                         | Inspected URL                                                                                                                |
| `/products-2/`                              | Indexed                                                    | self                         | Inspected URL                                                                                                                |
| `/nitro-cold-brew-old/`                     | Indexed                                                    | self                         | Inspected URL                                                                                                                |
| `http://bonafidenitro.com/`                 | **Not indexed — Alternate page with proper canonical tag** | `https://bonafidenitro.com/` | Same as user-declared. **Page fetch: Successful. Indexing allowed: Yes.** Referring sitemap: *"Temporary processing error."* |

Live browser check (read-only, not GSC): `http://bonafidenitro.com/` **does** resolve to `https://bonafidenitro.com/`, and `https://www.bonafidenitro.com/` resolves to the apex.

### A. Problems to FIX in the new website

1. **`/products/`** **and** **`/products-2/`** **are both indexed, both self-canonical, with an identical** **`<title>`** **and identical meta description.** Google has chosen the inspected URL as canonical for *each* — it is treating them as two distinct pages. Combined: 1,349 clicks / 111,653 impressions split across two URLs that say the same thing.
2. **`/nitro-cold-brew/`** **and** **`/nitro-cold-brew-old/`** **are both indexed, both self-canonical, with identical** **`<title>`** **AND identical** **`<h1>`****.** Combined 142 clicks / 72,231 impressions. A URL containing `-old` is in Google's index, and it — not `/nitro-cold-brew/` — is the page Google ranks for `is nitro coffee bad for you` (4 clicks, 527 impressions, position 7.2).
3. **Three contact URLs exist:** `/contact-bona-fide-nitro-coffee-and-tea/` (indexed), `/contact/` (redirect), `/contact` (crawled, not indexed). The no-slash variant being crawled-not-indexed means the redirect chain isn't clean.
4. **Six trailing-slash-less duplicates** are in the performance data at position 1.0 with 1 impression each — the server answers both forms for at least some URLs.
5. **`/?s={search_term_string}`** **is being crawled** — the WordPress search template is exposed to Googlebot (currently saved by `noindex`).
6. **Booking-plugin parameter URLs** (`?bpa_page=bookingpress_download&action=generate_ics&state=…`) are being crawled in both normal and `/amp/` forms — 6 URLs across two buckets.
7. **`/?p=1187`****,** **`/?p=1202`****,** **`/?p=1211`** — raw post-ID URLs are discoverable.
8. **`/To`****,** **`/roots/`****,** **`/where-to-refill-your-`** — malformed URLs are being crawled and redirected. Something is generating broken links.
9. **Two AMP validity errors** ("tag outside document head", "disallowed attribute").
10. **`/wp-json/tcb/v1/video-reporting`** **returns 404** (Thrive plugin endpoint).
11. **A** **`.mp4`** **with a template placeholder in its query string** (`?t={seek_to_start_number}`) is being crawled.
12. **The HTTP homepage's sitemap association shows "Temporary processing error"** and Google reports `Page fetch: Successful / Indexing allowed: Yes` for it even though the live site redirects. **INTERPRETATION:** either Googlebot is being served a 200 where browsers get a 301, or this is stale crawl state. This should be verified server-side before the rebuild; it is the most likely explanation for 301 clicks being attributed to an HTTP URL.

### B. Exclusions that are CORRECT and intentional

- All 25 `/…/amp/` URLs excluded as "Alternate page with proper canonical tag" — this is exactly how AMP is supposed to behave.
- `/terms-of-service/`, `/privacy-policies/`, `/thank-you-your-ticket-is-paid/` noindexed.
- `/wp-login.php?…` × 2 and `/wp-admin/?page=sb-instagram-feed` noindexed; `/wp-admin/admin-ajax.php` 4xx-blocked; `/wp-admin/*` redirecting.
- `http://www.bonafidenitro.com/`, `https://www.bonafidenitro.com/`, `http://www.bonafidenitro.com/kegging-service/` redirecting — correct host canonicalisation.
- `/comments/feed/` crawled-not-indexed.
- `/cancel-appointment/`, `/cancel-payment/`, `/book-appointment/`, `/my-bookings/` — transactional utility pages; not indexing them is fine.

**INTERPRETATION:** of 76 not-indexed URLs, roughly **45 are correct and intentional** and roughly **31 represent genuine hygiene problems** — mostly parameterised, malformed or duplicate URLs generated by plugins. A static rebuild eliminates most of category B automatically, which is one of the strongest arguments for the rebuild.

---

## 9. SITEMAP FINDINGS

### DATA

Three sitemaps are submitted:

| Sitemap Type Submitted Last read Status Pages  |               |            |            |                                |    |
| ---------------------------------------------- | ------------- | ---------- | ---------- | ------------------------------ | -- |
| `https://bonafidenitro.com/sitemap.xml`        | Sitemap index | 2020-02-07 | 2026-09-17 | Success                        | 50 |
| `https://bonafidenitro.com/sitemap_index.xml`  | Unknown       | 2018-10-23 | 2026-09-20 | **1 error: "Sitemap is HTML"** | 0  |
| `http://bonafidenitro.com/sitemap.xml`         | Sitemap index | 2018-01-15 | 2026-09-18 | Success                        | 50 |

`/sitemap.xml` resolves to WordPress core's `/wp-sitemap.xml`, which indexes four children: posts (15 URLs), pages (30), categories (4), users (1) = **50 URLs**.

`robots.txt` declares only `Sitemap: https://bonafidenitro.com/wp-sitemap.xml`. A Yoast block is present but its `Disallow:` is empty.

### INTERPRETATION

**Three problems, all cheap to fix at rebuild time — and none to be touched now:**

1. **`sitemap_index.xml`** **is a dead Yoast-era sitemap** submitted in 2018. It now returns HTML (almost certainly a soft-404 or a redirect to a page), and Google is *still fetching it 8 years later* — it was read the day of this audit. It contributes 0 pages and one permanent error.
2. **`http://bonafidenitro.com/sitemap.xml`** **is submitted separately from the HTTPS version.** Both report Success and both report 50 pages — Google is processing the same sitemap twice under two protocols.
3. **The sitemap is generated by WordPress core, which means it will disappear entirely with WordPress.** It includes URLs that Google refuses to index (`/blog-old/`, `/on-tap-in-10-min/`, `/gastro-and-hotel-2023-paid-ticket/`, `/cancel-appointment/`, `/cancel-payment/`, `/thank-you-page-usa/`) and noindexed URLs (`/privacy-policies/`, `/terms-of-service/`, `/thank-you-your-ticket-is-paid/`). It also includes the legacy duplicates `/nitro-cold-brew-old/` and `/blog-old/` while omitting nothing important.

**Should the current sitemap structure inform the new architecture?** Partly. The **30 pages / 15 posts / 4 categories** split is a reasonable reflection of what the site actually is, and the 50-URL scope is a useful sanity check: the new site's sitemap should be *roughly this size or smaller*, not dramatically larger. The `/wp-sitemap-*` naming and the users sitemap should not carry over.

---

## 10. EXTERNAL / INTERNAL LINK FINDINGS

### DATA — External (182 links, 65 domains)

Top linked pages: `/` 129 links from 55 domains · `/howtobuy/` 13 from 6 · `/products/` 8 from 7 · `/nitro-coffee-kegs/` 5 from 2 · `/hot-nitro-coffee/` 4 from 3 · `/3-cups-of-coffee-a-day-…/` 3 from 3 · `/coffee-trends-dominate-2018/` 3 from 1 · `/how-ambient-stable-coffee-kegs-…/` 3 from 2. Full 17-row list in appendix §11.

Top linking domains: reddit.com (23), grandviewresearch.com (18), weebly.com (16), gravatar.com (13), tumblr.com (10), blogspot.com (7), sitelike.org (6), verifiedmarketreports.com (5), felom.com (4), myvidster.com (4), nitrocoffee.store (4).

Top anchor text: `https bonafidenitro com`, `bona fide nitro coffee & tea experts`, `bonafidenitro com`, `bona fide nitro coffee & tea`, `navigate to website bonafidenitro com`.

### DATA — Internal (534 links, 22 URLs)

Ten URLs each receive exactly 41 internal links (the site-wide navigation/footer set): `/`, `/about/`, `/blog/`, `/cold-brew-…-bag-in-box-…/`, `/contact-bona-fide-nitro-coffee-and-tea/`, `/howtobuy/`, `/kegerators/`, `/nitro-coffee-questions/`, `/nitro-cold-brew/`, `/products/`.

A second tier receives 12–15: `/3-cups-of-coffee-a-day-…/`, `/hot-nitro-coffee/`, `/how-ambient-stable-coffee-kegs-…/`, `/nitro-coffee-in-time-of-covid-19-…/`, `/what-is-nitro-cold-brew-coffee/` (15 each), `/a-touch-of-vanilla-…/` (14), `/nitro-coffee-health-benefits/` (13), `/coffee-trends-dominate-2018/` (12).

A thin tier: `/healthy-benefits-…/` (4), `/coffee-on-tap-is-the-future/` (3), `/nitro-cold-brew-coffee-made-easy-2/` (2), `/nitro-coffee-kegs/` (1).

**Zero internal links** despite having organic performance: `/products-2/`, `/nitro-cold-brew-old/`, `/hot-nitro-equipment-rental/`, `/interested-in-selling-usa/`, `/interested-in-selling-eu-and-usa/`, `/interested-in-selling-eu-qr-2/`, `/is-coffee-healthy/`, `/coffee-doesnt-produce-cancer-…/`, `/nitro-coffee-future/`, `/blog-old/`, `/author/admin/`, `/category/news-nitro-coffee-and-nitro-tea/`, `/thank-you/`, both PDFs.

### INTERPRETATION

**The link profile is small, brand-anchored, and homepage-heavy.** 71% of links point at the homepage and the anchor text is almost entirely the bare domain or the brand name. That is a low-risk, low-leverage profile: there is little to lose to a bad migration *except* on the handful of deep-linked pages.

**The deep links are the thing to protect.** `/howtobuy/` (13/6), `/products/` (8/7), `/nitro-coffee-kegs/` (5/2), `/hot-nitro-coffee/` (4/3), `/3-cups-of-coffee-a-day-…/` (3/3), `/coffee-trends-dominate-2018/` (3/1), `/how-ambient-stable-coffee-kegs-…/` (3/2). Two of these — `/nitro-coffee-kegs/` and `/coffee-trends-dominate-2018/` — would look expendable on traffic alone and are not.

`grandviewresearch.com` (18 links) and `verifiedmarketreports.com` (5) are market-research publishers citing the brand; `mtpak.coffee`, `coldbrewpak.coffee` and `copackconnect.com` are industry/supply-chain sites; `kegjoy.com` and `nitrocoffee.store` are sector-adjacent. **INTERPRETATION:** there is a small but genuine industry-citation footprint here that is worth not disturbing.

**The internal link graph is flat and nav-driven.** Ten URLs get 41 links each because they are in the global navigation; everything else gets whatever the blog sidebar gives it. There is essentially **no topical internal linking**. Notably, `/products-2/` — which earns 178 clicks — receives **zero** internal links, and `/nitro-coffee-kegs/`, the third-most-linked page externally, receives **one**. This is a large, cheap opportunity for the new site.

---

## 11. SEARCH APPEARANCE / STRUCTURED DATA FINDINGS

### DATA

| Enhancement Valid Invalid           |                                                                                            |   |
| ----------------------------------- | ------------------------------------------------------------------------------------------ | - |
| AMP                                 | 12                                                                                         | 2 |
| Breadcrumbs                         | 24                                                                                         | 0 |
| Review snippets                     | 1                                                                                          | 0 |
| Videos                              | 0 indexed (5 "no videos indexed")                                                          | — |
| Product results / Merchant listings | **None.** Merchant opportunities: *"Your products are not appearing in the Shopping tab."* | — |

Search-appearance performance, last 3 months: **AMP non-rich results 32 clicks / 8,415 impressions / pos 10.1**; **AMP article 1 click / 184 impressions / pos 1.0**. No other search-appearance rows exist for this property.

Review snippet: exactly one, on `/`, item name *"Bona Fide Nitro Coffee and Tea"*, last detected 2026-09-18.

Breadcrumbs: 24 valid URLs — essentially every substantive content page. Full list in appendix §12.

### INTERPRETATION

Three things must survive the rebuild or be consciously written off:

1. **Breadcrumb structured data on 24 pages.** This is currently clean (0 invalid) and it is the site's only working site-structure signal in the SERP. A static rebuild must emit `BreadcrumbList` JSON-LD on every equivalent page. This is cheap and there is no excuse for losing it.
2. **The single Review snippet on the homepage.** One item, but it is the only rich result the entire domain has. Whatever generates it (a review/rating block on the homepage) needs an equivalent in the new build, with the same item name.
3. **AMP — 8,415 impressions and 32 clicks in 3 months (15.6% of all impressions).** A static rebuild will not ship AMP. **This is a planned loss.** The right handling is: 301 every `/…/amp/` URL to its canonical page, expect a visible impression drop in the AMP search-appearance row, and expect *no* proportional click loss (AMP CTR is 0.4%, versus 1.6% site-wide). Documenting this in advance prevents it being misread as a migration failure.

**A large gap:** the site sells physical products and has **no Product structured data, no merchant listings, and no Shopping presence at all.** For a company whose top non-branded cluster is `cold brew keg` / `nitro cold brew keg`, that is a standing opportunity, not a current asset to preserve.

---

## 12. TECHNICAL SEARCH CONSOLE FINDINGS

### DATA

| Report Finding            |                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Security issues**       | **1 issue detected — "Deceptive pages."** *"Google has detected harmful content on some of your site's pages… browsers such as Google Chrome will display a warning when users visit or download certain files from your site."* Description: *"These pages attempt to trick users into doing something dangerous, such as installing unwanted software or revealing personal information."* **Sample URLs: N/A** |
| Manual actions            | No issues detected                                                                                                                                                                                                                                                                                                                                                                                                |
| Core Web Vitals (Mobile)  | "Not enough usage data in the last 90 days for this device type."                                                                                                                                                                                                                                                                                                                                                 |
| Core Web Vitals (Desktop) | "Not enough usage data in the last 90 days for this device type."                                                                                                                                                                                                                                                                                                                                                 |
| HTTPS                     | Non-HTTPS URLs: 0 · HTTPS URLs: 24 · "No issues detected in the last 90 days"                                                                                                                                                                                                                                                                                                                                     |
| Removals                  | No requests in the last 6 months                                                                                                                                                                                                                                                                                                                                                                                  |
| Videos                    | No data                                                                                                                                                                                                                                                                                                                                                                                                           |

URL Inspection on `http://bonafidenitro.com/` lists **`http://weon.polylepistizttyrant.lol/`** among its referring pages.

Property configuration: a single **Domain property**, `bonafidenitro.com`. No URL-prefix properties exist in the account. The Domain property covers http + https, www + non-www, and all subdomains.

### INTERPRETATION

**The "Deceptive pages" security issue is the most serious finding in this audit and it is independent of the migration.** Google is showing Safe Browsing warnings to Chrome users on some pages of this site. That suppresses clicks, suppresses rankings, and is a live trust problem. Search Console gives no sample URLs, which makes it harder but not impossible to trace. The presence of a `.lol` spam domain (`weon.polylepistizttyrant.lol`) as a referring page to the HTTP homepage is consistent with — though not proof of — a spam-injection or hijack pattern on the WordPress install.

**This needs a separate investigation and remediation on the current site, before or in parallel with the rebuild.** It should not be assumed that rebuilding the site as static will clear it: the review has to be requested and the underlying content removed. It is explicitly outside the read-only scope of this audit, so nothing was actioned.

**Core Web Vitals has no field data at all.** With \~250 clicks a month the site does not meet Chrome UX Report thresholds. **INTERPRETATION:** CWV is currently a non-factor for rankings here, and it will probably remain a non-factor after the rebuild too. A static site will almost certainly be faster, but there is no baseline to prove improvement against and no ranking gain to bank on. Do not size the rebuild business case on CWV.

**HTTPS is clean** (0 non-HTTPS, 24 HTTPS, no issues) — which sits oddly beside 301 clicks attributed to `http://bonafidenitro.com/`. The live check confirms the HTTP URL redirects for browsers. This discrepancy is listed in §19 as an open question requiring server-side verification.

**Property configuration is correct and nothing needs changing.** A single Domain property is the right choice and means all protocol/host variants are already covered in one place. There is no second property holding extra history — 16 months is all the history that exists.

---

## 13. CANNIBALIZATION FINDINGS

### Confirmed duplicate pairs — DATA

| Pair Shared `<title>` Shared `<h1>` Combined clicks Combined impressions Both indexed?             |                                                                                     |                                                   |       |         |                          |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------- | ----- | ------- | ------------------------ |
| `/products/` ↔ `/products-2/`                                                                      | **Identical**: *Cold Brew Nitro Coffee Kegs - Bona Fide Nitro Coffee and Tea*       | Near-identical (case only)                        | 1,349 | 111,653 | Yes, both self-canonical |
| `/nitro-cold-brew/` ↔ `/nitro-cold-brew-old/`                                                      | **Identical**: *Nitro Cold Brew - Bona Fide Brewing Company - Nitro Coffee Experts* | **Identical**: *ALL ABOUT NITRO COLD BREW COFFEE* | 142   | 72,231  | Yes, both self-canonical |
| `/healthy-benefits-drinking-nitro-coffee-nitro-coffee-healthy/` ↔ `/nitro-coffee-health-benefits/` | Different wording, same topic                                                       | Different wording, same topic                     | 47    | 28,060  | Yes, both self-canonical |

Meta descriptions on `/products/` and `/products-2/` are also identical.

### Multi-page competition on single queries — DATA

| Query Impressions Competing URLs (impressions each)  |         |                                                                                                                                                                                                                                                                                          |
| ---------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `nitro coffee`                                       | 17,541  | `/` 16,520 · `/nitro-cold-brew/` 5,075 · `/about/` 4,688 · `/products-2/` 4,149 · `/cold-brew-…-bag-in-box-…/` 3,445 · `/howtobuy/` 3,385 · `/kegerators/` 895 · `/what-is-nitro-cold-brew-coffee/` 414 · `/healthy-benefits-…/` 279 · `/nitro-coffee-health-benefits/` 70 — **10 URLs** |
| `bonafide coffee`                                    | 732     | `/` 718 · `/products/` 689 · `/kegerators/` 555 · `/nitro-cold-brew/` 539 · `/products-2/` 543 · `/about/` 467 · `/howtobuy/` 312 · `http://…/` 462 — **8 URLs**                                                                                                                         |
| `bona fide coffee`                                   | 435     | `/` 435 · `/products/` 419 · `/nitro-cold-brew/` 395 · `/products-2/` 382 · `/kegerators/` 365 · `/about/` 336 · `http://…/` 336 · `/howtobuy/` 127 — **8 URLs**                                                                                                                         |
| `is nitro cold brew bad for you`                     | 2,162   | `/nitro-cold-brew-old/` 1,291 · `/healthy-benefits-…/` 888 · `/nitro-coffee-health-benefits/` 112 — **3 URLs**                                                                                                                                                                           |
| `nitro cold brew benefits`                           | 1,222   | `/nitro-coffee-health-benefits/` 601 · `/healthy-benefits-…/` 621 — **2 URLs, near-perfect split**                                                                                                                                                                                       |
| `what is nitro coffee`                               | \~1,100 | `/what-is-nitro-cold-brew-coffee/` 499 · `/nitro-cold-brew/` 381 · `/healthy-benefits-…/` 143 · `/nitro-cold-brew-old/` 96 — **4 URLs**                                                                                                                                                  |
| `nitrocoffee`                                        | 2,466   | `/products-2/` 1,832 · `/about/` 1,832 · `/nitro-cold-brew/` 1,838 — **3 URLs**                                                                                                                                                                                                          |
| `nitro drip`                                         | \~789   | `/what-is-nitro-cold-brew-coffee/` 540 (pos 1.0) · `/healthy-benefits-…/` 172 (pos 1.0) · `/nitro-coffee-health-benefits/` 77 (pos 1.0) — **3 URLs all at position 1**                                                                                                                   |

> **Reading note (DATA):** the per-URL impression figures above are taken from page-filtered views. Google counts one impression per query per search at the property level, but one per URL when the report is filtered to a page — so the per-URL numbers sum to more than the unfiltered query total. That over-count is itself the evidence of cannibalization: it means multiple URLs from this domain were shown in the same result sets.

### INTERPRETATION

This is the clearest structural finding in the audit. **The** **`nitro coffee`** **query — 17,541 impressions, the second-largest pool on the site — is being answered by ten different URLs, and earns 19 clicks.** Google cannot tell which page is the nitro coffee page, because there isn't one; there are ten partial ones. Average position on that query is 19.7 despite the homepage sitting at 18.9 and `/nitro-cold-brew-old/` at 4.0 for it.

The brand queries show the same pattern more benignly: 8 URLs surface for `bonafide coffee`, but because the homepage wins position 1.2 it doesn't cost anything. The health cluster is the worst case — `nitro cold brew benefits` splits 621/601 between two pages that both convert at 0%, and `nitro drip` has three URLs all sitting at position 1.0.

**The single highest-leverage architectural decision for the new site is to designate one canonical page per cluster** — one nitro explainer, one health page, one products page, one cold-brew page — and to make the internal linking and heading structure say so unambiguously.

---

## 14. SEO OPPORTUNITIES

*(Preservation is §6. This section is upside only, and none of it should drive URL changes.)*

### 14.1 High impressions / near-zero CTR — the biggest single pool

| Query Impressions (16mo) Clicks Position Current page  |        |    |      |                                 |
| ------------------------------------------------------ | ------ | -- | ---- | ------------------------------- |
| bona fide                                              | 18,994 | 4  | 13.0 | `/`                             |
| nitro coffee                                           | 17,541 | 19 | 19.7 | 10 pages                        |
| nitrocoffee                                            | 2,466  | 1  | 14.5 | 3 pages                         |
| is nitro cold brew bad for you                         | 2,162  | 2  | 12.6 | 3 pages                         |
| bonafide                                               | 1,943  | 1  | 6.3  | `/`                             |
| nitro keg                                              | 1,571  | 8  | 14.1 | `/products/`                    |
| nitro tea                                              | 1,483  | 4  | 16.4 | `/`                             |
| iced coffee keg                                        | 1,175  | 5  | 7.5  | `/products/`                    |
| coffee distributors \*                                 | 1,934  | 1  | 61.4 | `/howtobuy/`                    |
| coffee keg                                             | 3,340  | 22 | 9.5  | `/products/`                    |
| coffee on tap                                          | 4,597  | 14 | 6.7  | `/coffee-on-tap-is-the-future/` |

\* `coffee distributors` figures are from the `/howtobuy/` page-filtered view, not the unfiltered query report.

**INTERPRETATION:** `bona fide` at position 13 with 0% CTR is the outlier. The brand exact-match sits outside the top 10 while `bonafide coffee` sits at 1.6 — meaning Google does not confidently associate the two-word phrase with this entity. That is an entity/brand-signal problem (structured data, consistent naming, about page) more than a keyword problem, and it is worth \~19,000 impressions.

### 14.2 Positions 4–10 that could move higher

The entire keg cluster sits here: `cold brew keg` (9.1), `nitro cold brew keg` (9.4), `coffee keg` (9.5), `nitro coffee keg` (9.5), `nitro brew keg` (9.1), `cold brew coffee keg` (10.4), `cold brew kegs` (7.3), `coffee kegs` (7.2), `nitro cold brew kegs` (7.3), `keg of cold brew` (7.8), `keg of coffee` (6.7), `keg coffee` (8.5), `where to buy kegs of cold brew coffee` (8.5). Plus `coffee on tap` (6.7), `hot nitro coffee` (4.7), `nitro coffee kegs` (5.8).

**INTERPRETATION:** roughly 4,600 + 3,662 + 3,340 + 2,084 + 1,478 ≈ **15,000 impressions sitting at positions 7–10 on one page (****`/products/`****)**. Moving that page from \~9 to \~5 roughly triples its click yield without needing new content — it needs depth, internal links and a real product structure.

### 14.3 Positions 11–20

`bona fide` (13.0), `nitro keg` (14.1), `nitro cold brew keg` in the 3-month view (11.4), `countertop nitro coffee dispenser` (16.8), `nitro coffee dispenser` (18.4 on `/kegerators/`), `nitro tea` (16.4), `coffee near me` (15.5), `cold brew keg for office` (15.4), `bag in box coffee` (24.3 — just outside).

### 14.4 Queries with no ideal dedicated landing page

| Query cluster Impressions Current owner Gap                                                                                                                                                                                                  |             |                                                   |                                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **Tea**: `nitro tea` 1,483, `nitro infused tea` 29, `nitrogen infused tea` 9, `draft tea` 27, `tea on tap` 231, `nitro iced tea` 7, `tea keg` 7, `what is nitro tea` 21, `nitro cold brew tea` 12, `n25 nitro tea` 12, `nitro tea machine` 8 | **\~1,850** | `/` and `/kegerators/` incidentally               | **There is no tea page on the site at all**, despite "Tea" being in the company name |
| **Office / workplace**: `cold brew keg for office` 484, `cold brew kegs for office` 64, `nitro cold brew for office` 77, `office coffee` 4                                                                                                   | \~630       | `/howtobuy/` partially                            | No office-coffee landing page                                                        |
| **Dispenser / machine**: `nitro coffee dispenser` 1,531, `countertop nitro coffee dispenser` 829, `nitro coffee machine` 1,548, `cold brew dispenser` 664, `commercial nitro cold brew machine` 381, `nitro coffee kegerator` 386            | **\~5,300** | `/kegerators/` (title: "Kegerators")              | Page exists but is named for a term nobody searches                                  |
| **Bag-in-box**: 7+ variants                                                                                                                                                                                                                  | \~1,900     | `/cold-brew-…-bag-in-box-…/`                      | Single blog post carrying a commercial cluster                                       |
| **Supplier / co-pack**: `nitro coffee can supplier` 560, `nitro cold brew coffee can supplier` 472, `cold brew supplier for foodservice` 5, `iced coffee supplier for franchises` 13                                                         | \~1,050     | `/howtobuy/`                                      | Real B2B intent with no dedicated page                                               |
| **Draft systems**: `cold brew on draft` 600, `nitro draft coffee` 436, `coffee draft system` 361, `draft nitro coffee` 329, `cold brew draft` 314, `coffee on draft` 137, `draft cold brew` 137, `what is draft coffee` 6, `draft coffee` 4  | **\~2,300** | `/nitro-cold-brew-coffee-made-easy-2/` (0 clicks) | **Directly relevant to the "Draft Coffee and Tea" positioning**                      |
| **Pricing**: `cold brew keg cost` 118, `europe nitro coffee dispenser two tap price eur` 110 + EU price variants                                                                                                                             | \~370       | none / `/hot-nitro-equipment-rental/`             | No pricing page                                                                      |

### 14.5 Coffee vs tea architecture

**DATA:** the company name is "Bona Fide Nitro Coffee **and Tea**". Search Console shows **\~1,850 tea-related impressions** and **zero tea landing pages**. `/services/passion-fruit-tea/`, `/services/mango-tea/`, `/services/organic-hibiscus-tea/` exist but are not indexed and earn 2–6 impressions each. `/category/tea/` is "Discovered – currently not indexed".

**INTERPRETATION:** tea is currently an unserved branch of the site's own brand promise. The new architecture has an obvious, evidence-backed reason to create a coffee/tea split at the category level.

### 14.6 Internal linking

**INTERPRETATION:** `/products-2/` earns 178 clicks with **0** internal links. `/nitro-coffee-kegs/` is the third-most-externally-linked page with **1** internal link. `/coffee-on-tap-is-the-future/` owns `coffee on tap` (4,597 impressions) with **3** internal links. `/nitro-cold-brew-coffee-made-easy-2/` owns the entire draft cluster with **2**. The current internal link graph is a flat nav; there is no topical linking at all. This is the cheapest available win in the whole audit.

### 14.7 Commercial / B2B intent currently underserved

`/howtobuy/` is the only B2B page and it is **down 30% year over year** while carrying 13 external links and 34,416 impressions. It ranks 61.4 for `coffee distributors` (1,934 impressions) and 48.8 for `coffee distributors near me` (972). **INTERPRETATION:** there is a clear, measurable B2B demand pool that a single ageing page is failing to serve.

### 14.8 AI / conversational surfaces

**DATA:** the 3-month query set contains conversational prompts ranking well — *"who serves the smoothest nitro cold brew in the los angeles area?"* (42 impressions, pos 7.5), *"who's the best cold brew and nitro coffee equipment repair for facilities?"* (28 impressions, pos 7.1), plus long prompt-shaped queries about instant coffee and beverage trends. Search Console also surfaces a dedicated report link for *"performance in generative AI features on Google Search."*

**INTERPRETATION:** worth capturing as a design input — clear, extractable, question-shaped content blocks — but there is not enough volume yet to justify architecture decisions on its own.

---

## 15. SEO ASSET REGISTER

Recommended Action values: **KEEP URL · KEEP + IMPROVE CONTENT · REDIRECT 301 · CONSOLIDATE · INVESTIGATE · ALLOW TO DISAPPEAR · TECHNICAL FIX REQUIRED**
Metrics are the **16-month** window. "Hist." = historical value. "Ext." = external links / linking domains.

| Existing URL Page type Primary queries Clicks Impr Avg pos Hist. value Ext. link value Indexed? Canonical Class Recommended action                                                                                                                                                                                       |                            |                                                                                               |       |        |           |                         |              |                    |              |        |                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------- | --------------------------------------------------------------------------------------------- | ----- | ------ | --------- | ----------------------- | ------------ | ------------------ | ------------ | ------ | --------------------------------------------------------------------- |
| `/`                                                                                                                                                                                                                                                                                                                      | Homepage                   | bonafide coffee, bona fide nitro coffee, bona fide coffee, bona fide, nitro coffee, nitro tea | 2,051 | 89,411 | 18.9      | Very high               | **129 / 55** | Yes                | Self         | **P1** | **KEEP URL** + KEEP structured data                                   |
| `/products/`                                                                                                                                                                                                                                                                                                             | Product / category         | cold brew keg, nitro cold brew keg, cold brew kegs, coffee keg, nitro coffee keg              | 1,171 | 87,725 | 12.7      | Very high               | 8 / 7        | Yes                | Self         | **P1** | **KEEP URL + IMPROVE CONTENT**                                        |
| `/howtobuy/`                                                                                                                                                                                                                                                                                                             | B2B / commercial           | coffee distributors, wholesale nitro cold brew, nitro coffee can supplier                     | 336   | 34,416 | 22.1      | High (declining)        | **13 / 6**   | Yes                | Self         | **P1** | **KEEP URL + IMPROVE CONTENT**                                        |
| `http://bonafidenitro.com/`                                                                                                                                                                                                                                                                                              | Protocol variant           | bonafide coffee, coffee near me                                                               | 301   | 11,611 | 7.9       | High                    | —            | No (alt/canonical) | → https apex | **P2** | **TECHNICAL FIX REQUIRED** — verify 301                               |
| `/products-2/`                                                                                                                                                                                                                                                                                                           | Duplicate product          | bona fide coffee, nitro coffee, nitrocoffee                                                   | 178   | 23,928 | 10.6      | High, growing           | 0            | Yes                | Self         | **P3** | **CONSOLIDATE →** **`/products/`** **(301)**                          |
| `/kegerators/`                                                                                                                                                                                                                                                                                                           | Equipment                  | nitro coffee dispenser, countertop nitro coffee dispenser, cold brew dispenser                | 105   | 22,542 | 22.5      | High                    | 0            | Yes                | Self         | **P1** | **KEEP URL + IMPROVE CONTENT** (rename in nav, not in URL)            |
| `/nitro-cold-brew/`                                                                                                                                                                                                                                                                                                      | Informational hub          | nitro coffee, nitro coffee machine, nitro coffee psi                                          | 87    | 45,027 | 16.4      | Very high (impressions) | 2 / 1        | Yes                | Self         | **P2** | **KEEP URL** as the single nitro hub                                  |
| `/hot-nitro-coffee/`                                                                                                                                                                                                                                                                                                     | Product                    | hot nitro coffee, nitro hot coffee                                                            | 87    | 5,179  | **5.3**   | High                    | 4 / 3        | Yes                | Self         | **P1** | **KEEP URL**                                                          |
| `/cold-brew-coffee-concentrate-bag-in-box-versus-cold-brew-in-kegs/`                                                                                                                                                                                                                                                     | Informational / commercial | bag in box coffee, bib coffee, bag in box cold brew                                           | 71    | 15,115 | 14.8      | High, growing           | 1 / 1        | Yes                | Self         | **P1** | **KEEP URL + IMPROVE CONTENT**                                        |
| `/nitro-cold-brew-old/`                                                                                                                                                                                                                                                                                                  | Duplicate informational    | is nitro coffee bad for you, what is nitro cold brew                                          | 55    | 27,204 | 13.2      | High                    | 0            | Yes                | Self         | **P3** | **CONSOLIDATE →** **`/nitro-cold-brew/`** **(301)**                   |
| `/healthy-benefits-drinking-nitro-coffee-nitro-coffee-healthy/`                                                                                                                                                                                                                                                          | Informational / health     | is nitro cold brew bad for you, nitro cold brew benefits                                      | 43    | 19,336 | 10.8      | High                    | 1 / 1        | Yes                | Self         | **P2** | **KEEP URL** as health-cluster target                                 |
| `/about/`                                                                                                                                                                                                                                                                                                                | Company                    | brand queries, nitro coffee                                                                   | 31    | 18,781 | 8.6       | Medium-high             | 2 / 2        | Yes                | Self         | **P1** | **KEEP URL**                                                          |
| `/nitro-cold-brew-coffee-made-easy-2/`                                                                                                                                                                                                                                                                                   | Informational              | cold brew on draft, nitro draft coffee, coffee draft system                                   | 28    | 12,319 | 22.2      | High (draft cluster)    | 1 / 1        | Yes                | Self         | **P2** | **REDIRECT 301** → new draft-systems page                             |
| `/contact-bona-fide-nitro-coffee-and-tea/`                                                                                                                                                                                                                                                                               | Contact                    | brand + contact                                                                               | 25    | 9,620  | 11.6      | Medium                  | 0            | Yes                | Self         | **P1** | **KEEP URL**                                                          |
| `/hot-nitro-equipment-rental/`                                                                                                                                                                                                                                                                                           | Commercial (EU)            | europe nitro coffee dispenser price eur                                                       | 24    | 2,737  | 8.5       | Medium                  | 0            | Yes                | Self         | **P2** | **INVESTIGATE** — keep if EU rental still offered                     |
| `/author/admin/`                                                                                                                                                                                                                                                                                                         | Author archive             | —                                                                                             | 24    | 1,204  | 8.3       | Low                     | 0            | Yes                | Self         | **P5** | **INVESTIGATE** then ALLOW TO DISAPPEAR                               |
| `/coffee-on-tap-is-the-future/`                                                                                                                                                                                                                                                                                          | Informational              | coffee on tap, tap coffee, on tap coffee                                                      | 19    | 8,405  | 9.2       | High                    | 0            | Yes                | Self         | **P1** | **KEEP URL + IMPROVE CONTENT**                                        |
| `/coffee-trends-dominate-2018/`                                                                                                                                                                                                                                                                                          | Blog (dated)               | coffee trends, millennials coffee                                                             | 10    | 2,613  | 16.8      | Medium                  | **3 / 1**    | Yes                | Self         | **P2** | **REDIRECT 301** → trends/insights                                    |
| `/nitro-coffee-kegs/`                                                                                                                                                                                                                                                                                                    | Product                    | pet coffee keg, nitro coffee kegs                                                             | 10    | 1,179  | 9.1       | Medium                  | **5 / 2**    | Yes                | Self         | **P2** | **KEEP URL** (link equity)                                            |
| `/3-cups-of-coffee-a-day-why-it-can-be-good-for-the-health/`                                                                                                                                                                                                                                                             | Informational              | is 3 cups of coffee too much (pos 2.5)                                                        | 9     | 24,017 | 9.3       | High                    | **3 / 3**    | Yes                | Self         | **P2** | **KEEP URL + IMPROVE CONTENT**                                        |
| `/nitro-coffee-questions/`                                                                                                                                                                                                                                                                                               | FAQ                        | —                                                                                             | 9     | 2,036  | 12.5      | Medium                  | 0            | Yes                | Self         | **P2** | **KEEP URL** or 301 → new FAQ                                         |
| `/interested-in-selling-usa/`                                                                                                                                                                                                                                                                                            | B2B reseller               | —                                                                                             | 9     | 1,068  | 13.0      | Medium                  | 0            | Yes                | Self         | **P3** | **CONSOLIDATE** → one reseller page                                   |
| `/what-is-nitro-cold-brew-coffee/`                                                                                                                                                                                                                                                                                       | Informational              | what is nitro, nitro drip, nitro meaning                                                      | 8     | 9,693  | 25.6      | High                    | 2 / 2        | Yes                | Self         | **P2** | **CONSOLIDATE →** **`/nitro-cold-brew/`** **(301)**                   |
| `/interested-in-selling-eu-and-usa/`                                                                                                                                                                                                                                                                                     | B2B reseller               | —                                                                                             | 8     | 1,393  | 10.0      | Medium                  | 1 / 1        | Yes                | Self         | **P3** | **CONSOLIDATE** → one reseller page                                   |
| `/nitro-coffee-health-benefits/`                                                                                                                                                                                                                                                                                         | Informational / health     | nitro cold brew benefits                                                                      | 4     | 8,724  | 15.8      | Medium-high             | 0            | Yes                | Self         | **P3** | **CONSOLIDATE →** **`/healthy-benefits-…/`** **(301)**                |
| `/a-touch-of-vanilla-to-your-nitro-coffee/`                                                                                                                                                                                                                                                                              | Blog                       | vanilla nitro, nitro vanilla                                                                  | 4     | 3,746  | 11.0      | Medium                  | 2 / 2        | Yes                | Self         | **P2** | **REDIRECT 301** → flavours/products                                  |
| `/how-ambient-stable-coffee-kegs-help-you-save-more-money/`                                                                                                                                                                                                                                                              | Blog                       | —                                                                                             | 4     | 815    | 10.9      | Medium                  | **3 / 2**    | Yes                | Self         | **P2** | **REDIRECT 301** → keg logistics content                              |
| `/nitro-coffee-in-time-of-covid-19-pandemic-how-safe-is-it/`                                                                                                                                                                                                                                                             | Blog (dated)               | —                                                                                             | 1     | 1,842  | 13.2      | Low-medium              | 2 / 2        | Yes                | Self         | **P2** | **REDIRECT 301** → safety/quality                                     |
| `/wp-content/uploads/2026/02/Bona-Fide-Marketing-Plan-2026.pdf`                                                                                                                                                                                                                                                          | PDF                        | —                                                                                             | 1     | 602    | 24.0      | Low                     | 0            | Yes                | —            | **P5** | **INVESTIGATE** (should this be public?)                              |
| `/interested-in-selling-eu-qr-2/`                                                                                                                                                                                                                                                                                        | B2B reseller               | —                                                                                             | 1     | 106    | 13.3      | Low                     | 0            | Yes                | Self         | **P3** | **CONSOLIDATE** → one reseller page                                   |
| `/blog/`                                                                                                                                                                                                                                                                                                                 | Blog index                 | —                                                                                             | 0     | 2,626  | 18.8      | Medium                  | 0            | Yes                | Self         | **P2** | **KEEP URL**                                                          |
| `/coffee-doesnt-produce-cancer-says-leading-american-scientist/`                                                                                                                                                                                                                                                         | Blog                       | organic coffee for cancer, acrylamide                                                         | 0     | 1,256  | 28.9      | Low-medium              | 0            | Yes                | Self         | **P3** | **CONSOLIDATE** → health cluster                                      |
| `/wp-content/uploads/2021/09/17x11-…-Email_compressed.pdf`                                                                                                                                                                                                                                                               | PDF                        | —                                                                                             | 0     | 569    | 22.6      | Low                     | 0            | Yes                | —            | **P4** | **ALLOW TO DISAPPEAR**                                                |
| `/category/news-nitro-coffee-and-nitro-tea/`                                                                                                                                                                                                                                                                             | Category                   | —                                                                                             | 0     | 548    | 11.4      | Low                     | 0            | Yes                | Self         | **P2** | **REDIRECT 301** → `/blog/`                                           |
| `/is-coffee-healthy/`                                                                                                                                                                                                                                                                                                    | Blog                       | —                                                                                             | 0     | 334    | 14.3      | Low                     | 0            | Yes                | Self         | **P3** | **CONSOLIDATE** → health cluster                                      |
| `/blog-old/`                                                                                                                                                                                                                                                                                                             | Legacy index               | —                                                                                             | 0     | 199    | 22.4      | Low                     | 0            | No (discovered)    | —            | **P3** | **REDIRECT 301** → `/blog/`                                           |
| `/blog/page/2/`                                                                                                                                                                                                                                                                                                          | Pagination                 | —                                                                                             | 0     | 178    | 22.3      | Low                     | 0            | Yes                | Self         | **P5** | **ALLOW TO DISAPPEAR** (rebuild pagination)                           |
| `/nitro-coffee-future/`                                                                                                                                                                                                                                                                                                  | Blog                       | —                                                                                             | 0     | 170    | 31.2      | Low                     | 0            | Yes                | Self         | **P3** | **CONSOLIDATE** → trends content                                      |
| `/category/news-nitro-coffee-and-nitro-tea/page/2/`, `/author/admin/page/2/`                                                                                                                                                                                                                                             | Pagination                 | —                                                                                             | 0     | 43–50  | 7.2–20.6  | Low                     | 0            | Yes                | Self         | **P5** | **ALLOW TO DISAPPEAR**                                                |
| `/thank-you/`, `/my-bookings/`, `/appointment-cancellation-confirmation/`, `/book-appointment/`, `/cancel-appointment/`, `/cancel-payment/`, `/thank-you-page-usa/`                                                                                                                                                      | Utility / booking          | —                                                                                             | 0     | 1–54   | 8.3–17.9  | None                    | 0            | Mixed              | Self         | **P4** | **ALLOW TO DISAPPEAR** (noindex equivalents in new build)             |
| `/gastro-and-hotel-2023-paid-ticket/`, `/on-tap-in-10-min/`, `/stability-kegs-nitro-coffee/`                                                                                                                                                                                                                             | Campaign / legacy          | —                                                                                             | 0     | 11–26  | 16.5–33.8 | None                    | 0            | No                 | —            | **P4** | **ALLOW TO DISAPPEAR**                                                |
| `/services/hair-raiser-organic/`, `/services/peru-organic/`, `/services/espresso-organic-nitro-coffee/`, `/services/passion-fruit-tea/`, `/services/mango-tea/`, `/services/organic-hibiscus-tea/`                                                                                                                       | Product detail (legacy)    | —                                                                                             | 0     | 2–8    | 1.0–27.9  | None                    | 0            | No                 | —            | **P4** | **INVESTIGATE** — precedent for new product-detail URLs               |
| `/category/our-facilities/`, `/category/products/`, `/category/tea/`                                                                                                                                                                                                                                                     | Category                   | —                                                                                             | 0     | —      | —         | None                    | 0            | No (discovered)    | —            | **P4** | **INVESTIGATE** — `/category/tea/` is a naming precedent              |
| All 25 `/…/amp/` URLs                                                                                                                                                                                                                                                                                                    | AMP alternates             | AMP non-rich results: 32 clicks / 8,415 impr (3mo)                                            | —     | —      | —         | Medium                  | 0            | No (alternate)     | → canonical  | **P5** | **REDIRECT 301** → canonical page                                     |
| `https://www.bonafidenitro.com/`, `http://www.bonafidenitro.com/`                                                                                                                                                                                                                                                        | Host variants              | —                                                                                             | 0–2   | 2      | 1.5       | Low                     | 0            | No (redirect)      | → apex       | **P5** | **KEEP REDIRECT**                                                     |
| `/contact/`, `/contact`                                                                                                                                                                                                                                                                                                  | Contact variants           | —                                                                                             | 0     | —      | —         | Low                     | 0            | No                 | —            | **P5** | **TECHNICAL FIX REQUIRED** — single clean 301                         |
| `/To`, `/roots/`, `/where-to-refill-your-`, `/?p=1187`, `/?p=1202`, `/?p=1211`, `/cold-brew-coffee-tap-future-serve/`, `/best-coffee-creamers/`, `/best-nitro-cold-brew-coffee-maker/`, `/collections/`, `/sustainability/`, `/copyright-notice/`, `/kegging-service/`, `/contact-email/`, `/author/raul/`, `/blog-new/` | Redirecting legacy         | —                                                                                             | 0     | —      | —         | None                    | 0            | No (redirect)      | —            | **P5** | **INVESTIGATE** then let go — but map any that once had traffic       |
| `/wp-admin/*`, `/wp-login.php*`, `/wp-json/*`, `/?s={search_term_string}`, `/comments/feed/`, `/?bpa_page=…` × 6, `/resource/video_files/*.mp4?t=…`                                                                                                                                                                      | Technical                  | —                                                                                             | 0     | —      | —         | None                    | 0            | No                 | —            | **P5** | **ALLOW TO DISAPPEAR** (won't exist in a static build)                |
| 20+ `/wp-content/uploads/*.jpg\|png`                                                                                                                                                                                                                                                                                     | Images                     | —                                                                                             | 0     | 1–15   | 4.0–24.5  | Low                     | 0            | Mixed              | —            | **P5** | **TECHNICAL FIX REQUIRED** — preserve image filenames where practical |

---

## 16. PRELIMINARY REDIRECT REGISTER

**Nothing below is to be implemented now.** This is a proposal for the IA phase. The governing rule: **if a URL can stay, it stays.** Every row here exists because the URL is a duplicate, a legacy artefact, or a technology dependency that will not exist in a static build.

Format: **OLD URL → PROPOSED DESTINATION → REASON → SEO RISK**

### 16a. Duplicate consolidation (highest value, highest care)

| Old URL Proposed destination Reason SEO risk                     |                                                                 |                                                                                                              |                                                                                                                                                                                        |
| ---------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/products-2/`                                                   | `/products/`                                                    | Identical title + meta description; 178 clicks and 23,928 impr currently split from the primary product page | **HIGH** — this page is *growing* (+25 clicks YoY) and ranks 1.2–1.4 on brand terms. Merge the content, don't just redirect the shell. Monitor brand-query positions for 8 weeks.      |
| `/nitro-cold-brew-old/`                                          | `/nitro-cold-brew/`                                             | Identical title and H1; `-old` in a live indexed URL                                                         | **HIGH** — `/nitro-cold-brew-old/` is the *primary* ranker for `is nitro coffee bad for you` (pos 7.2). The destination must absorb that content or the ranking moves to a competitor. |
| `/nitro-coffee-health-benefits/`                                 | `/healthy-benefits-drinking-nitro-coffee-nitro-coffee-healthy/` | Same cluster; `nitro cold brew benefits` splits 601/621 between them                                         | MEDIUM                                                                                                                                                                                 |
| `/is-coffee-healthy/`                                            | health cluster page                                             | 0 clicks, 334 impr, 0 internal links                                                                         | LOW                                                                                                                                                                                    |
| `/coffee-doesnt-produce-cancer-says-leading-american-scientist/` | health cluster page                                             | 0 clicks, 1,256 impr                                                                                         | LOW                                                                                                                                                                                    |
| `/what-is-nitro-cold-brew-coffee/`                               | `/nitro-cold-brew/`                                             | Same cluster; but holds pos 1.0–3.2 for `nitro drip`, `nitro meaning`, `nitro`                               | **MEDIUM-HIGH** — those position-1 rankings must be reproduced on the destination                                                                                                      |
| `/interested-in-selling-eu-and-usa/`                             | single reseller page                                            | Three near-identical reseller pages                                                                          | MEDIUM (has 1 external link)                                                                                                                                                           |
| `/interested-in-selling-eu-qr-2/`                                | single reseller page                                            | Same                                                                                                         | LOW                                                                                                                                                                                    |
| `/nitro-coffee-future/`                                          | trends/insights page                                            | 0 clicks, 170 impr                                                                                           | LOW                                                                                                                                                                                    |
| `/blog-old/`                                                     | `/blog/`                                                        | Legacy index, discovered-not-indexed, still in sitemap                                                       | LOW                                                                                                                                                                                    |
| `/category/news-nitro-coffee-and-nitro-tea/` (+ `/page/2/`)      | `/blog/`                                                        | Only category with traffic; 548 impr                                                                         | LOW                                                                                                                                                                                    |

### 16b. Technology-dependency redirects (AMP)

| Old URL Proposed destination Reason SEO risk                                                                                                                                                                                               |                                 |                                      |        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------- | ------------------------------------ | ------ |
| `/products/amp/`                                                                                                                                                                                                                           | `/products/`                    | AMP will not exist in a static build | MEDIUM |
| `/products-2/amp/`                                                                                                                                                                                                                         | `/products/`                    | AMP + duplicate                      | MEDIUM |
| `/nitro-cold-brew/amp/`                                                                                                                                                                                                                    | `/nitro-cold-brew/`             | AMP                                  | MEDIUM |
| `/nitro-cold-brew-old/amp/`                                                                                                                                                                                                                | `/nitro-cold-brew/`             | AMP + duplicate                      | MEDIUM |
| `/kegerators/amp/`                                                                                                                                                                                                                         | `/kegerators/`                  | AMP                                  | MEDIUM |
| `/hot-nitro-coffee/amp/`                                                                                                                                                                                                                   | `/hot-nitro-coffee/`            | AMP                                  | MEDIUM |
| `/healthy-benefits-…/amp/`                                                                                                                                                                                                                 | `/healthy-benefits-…/`          | AMP                                  | MEDIUM |
| `/nitro-coffee-health-benefits/amp/`                                                                                                                                                                                                       | health cluster page             | AMP + consolidation                  | MEDIUM |
| `/3-cups-of-coffee-a-day-…/amp/`                                                                                                                                                                                                           | `/3-cups-of-coffee-a-day-…/`    | AMP                                  | MEDIUM |
| `/cold-brew-…-bag-in-box-…/amp/`                                                                                                                                                                                                           | `/cold-brew-…-bag-in-box-…/`    | AMP                                  | MEDIUM |
| `/coffee-on-tap-is-the-future/amp/`                                                                                                                                                                                                        | `/coffee-on-tap-is-the-future/` | AMP                                  | MEDIUM |
| `/what-is-nitro-cold-brew-coffee/amp/`                                                                                                                                                                                                     | `/nitro-cold-brew/`             | AMP + consolidation                  | MEDIUM |
| `/coffee-trends-dominate-2018/amp/`                                                                                                                                                                                                        | trends page                     | AMP + consolidation                  | LOW    |
| `/how-ambient-stable-coffee-kegs-…/amp/`                                                                                                                                                                                                   | keg logistics page              | AMP + consolidation                  | LOW    |
| `/nitro-coffee-questions/amp/`                                                                                                                                                                                                             | FAQ page                        | AMP                                  | LOW    |
| `/nitro-coffee-future/amp/`, `/is-coffee-healthy/amp/`, `/coffee-doesnt-produce-cancer-…/amp/`, `/nitro-coffee-in-time-of-covid-19-…/amp/`, `/thank-you/amp/`, `/my-bookings/amp/`, `/appointment-cancellation-confirmation/amp/`, `/amp/` | corresponding canonical page    | AMP                                  | LOW    |
| `/amp/?bpa_page=bookingpress_download&…` × 3                                                                                                                                                                                               | `/`                             | Plugin parameter AMP URLs            | LOW    |

### 16c. Legacy / plugin URLs already redirecting today (preserve behaviour)

| Old URL Proposed destination Reason SEO risk                                                                                                                                            |                                                               |                                                                                                |                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `http://bonafidenitro.com/*`                                                                                                                                                            | `https://bonafidenitro.com/*`                                 | Protocol canonicalisation — **already the intended behaviour; must be verified and preserved** | **HIGH** — 301 clicks attributed to the HTTP homepage                   |
| `http://www.bonafidenitro.com/*`, `https://www.bonafidenitro.com/*`                                                                                                                     | apex https                                                    | Host canonicalisation                                                                          | MEDIUM                                                                  |
| `/contact/` and `/contact`                                                                                                                                                              | `/contact-bona-fide-nitro-coffee-and-tea/` (or its successor) | Three contact URLs exist                                                                       | MEDIUM                                                                  |
| `/kegging-service/` (+ www/http variants)                                                                                                                                               | `/products/` or service page                                  | Currently redirecting                                                                          | LOW                                                                     |
| `/cold-brew-coffee-tap-future-serve/`                                                                                                                                                   | `/coffee-on-tap-is-the-future/`                               | Currently redirecting                                                                          | LOW                                                                     |
| `/best-nitro-cold-brew-coffee-maker/`, `/best-coffee-creamers/`, `/collections/`, `/sustainability/`, `/copyright-notice/`, `/roots/`, `/contact-email/`, `/blog-new/`, `/author/raul/` | current destinations                                          | Already redirecting — reproduce so nothing 404s                                                | LOW                                                                     |
| `/?p=1187`, `/?p=1202`, `/?p=1211`                                                                                                                                                      | current destinations                                          | Raw post IDs currently redirect                                                                | LOW                                                                     |
| `/To`, `/where-to-refill-your-` (+ http variant)                                                                                                                                        | `/` **only if no better match exists**                        | Malformed URLs                                                                                 | LOW — these are the *only* rows where a homepage redirect is defensible |
| Trailing-slash-less duplicates (`/hot-nitro-coffee`, `/nitro-cold-brew`, `/a-touch-of-vanilla-to-your-nitro-coffee`, `/coffee-trend-dominate-2018`, `/3-cups-of-coffee-a-day-…`)        | slash version                                                 | URL-form canonicalisation                                                                      | LOW                                                                     |

### 16d. Explicitly NOT redirected — these URLs stay exactly as they are

`/` · `/products/` · `/howtobuy/` · `/kegerators/` · `/nitro-cold-brew/` · `/hot-nitro-coffee/` · `/cold-brew-coffee-concentrate-bag-in-box-versus-cold-brew-in-kegs/` · `/healthy-benefits-drinking-nitro-coffee-nitro-coffee-healthy/` · `/about/` · `/contact-bona-fide-nitro-coffee-and-tea/` · `/coffee-on-tap-is-the-future/` · `/nitro-coffee-kegs/` · `/3-cups-of-coffee-a-day-why-it-can-be-good-for-the-health/` · `/blog/` · `/nitro-coffee-questions/` · `/hot-nitro-equipment-rental/`

**These 16 URLs carry 4,078 of 4,590 clicks (89%) and 168 of 182 external links (92%). None of them should change, for any reason short of a demonstrated defect.**

---

## 17. MIGRATION RISKS

| # Risk Evidence Severity  |                                                                                                                                                               |                                                                                     |                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------- |
| 1                         | **Concentration risk.** 84% of organic clicks sit on four URLs                                                                                                | `/` 2,051 + `/products/` 1,171 + `/howtobuy/` 336 + `http://…/` 301 = 3,859 / 4,590 | **Critical**                                    |
| 2                         | **Open security issue ("Deceptive pages") is unresolved and has no sample URLs.** Migrating on top of a compromised install can carry the problem forward     | GSC Security issues report; `.lol` domain among referring pages                     | **Critical**                                    |
| 3                         | **AMP removal loses 8,415 impressions / 32 clicks per quarter** and 25 indexed alternate URLs                                                                 | Search appearance, 3 months                                                         | **High**                                        |
| 4                         | **The HTTP homepage is credited with 301 clicks but reports "Page fetch: Successful / Indexing allowed: Yes"** in GSC while redirecting in a live browser     | URL Inspection vs live check                                                        | **High**                                        |
| 5                         | **Breadcrumb structured data on 24 pages is not automatic in a static build** and would silently disappear                                                    | Breadcrumbs report: 24 valid                                                        | **High**                                        |
| 6                         | **The single homepage Review snippet — the domain's only rich result — depends on a WordPress component**                                                     | Review snippets report: 1 valid                                                     | **Medium-High**                                 |
| 7                         | **Consolidating** **`/products-2/`** **and** **`/nitro-cold-brew-old/`** **moves 51,132 impressions.** Done badly, both the source *and* the destination lose | 23,928 + 27,204 impressions                                                         | **High**                                        |
| 8                         | **`/howtobuy/`** **is already declining (−30% YoY) and carries the site's second-largest link profile.** A rebuild is a second shock to a weakening page      | 336 → 57 clicks (3mo), 13 links / 6 domains                                         | **Medium-High**                                 |
| 9                         | **Brand queries are answered by 8 URLs.** Restructuring can easily hand position 1.0 for `bona fide coffee` to a page that no longer exists                   | Query→page map                                                                      | **Medium-High**                                 |
| 10                        | **No Core Web Vitals baseline exists**, so post-migration performance cannot be proven or disproven from GSC                                                  | CWV: "Not enough usage data"                                                        | **Medium**                                      |
| 11                        | **Sitemap generation disappears with WordPress.** Three sitemaps are currently submitted, one of which has been erroring since 2018                           | Sitemaps report                                                                     | **Medium**                                      |
| 12                        | **16 months is all the history there is.** Once the migration happens, the pre-migration baseline can never be regenerated                                    | Single Domain property, no URL-prefix property                                      | **Medium** — mitigated by this document         |
| 13                        | **`/nitro-coffee-kegs/`** **(5 links) and** **`/coffee-trends-dominate-2018/`** **(3 links) look disposable on traffic and are not**                          | Links report                                                                        | **Medium**                                      |
| 14                        | **20+ image URLs rank in web search.** Changing image paths/filenames silently drops them                                                                     | 16-month page table                                                                 | **Low-Medium**                                  |
| 15                        | **Two indexed PDFs**, one of which is a "Marketing Plan 2026"                                                                                                 | 602 + 569 impressions                                                               | **Low** (SEO) / **unknown** (business)          |
| 16                        | **Query-level data is anonymised**, so per-page query coverage in this document is necessarily incomplete                                                     | `/howtobuy/`: 336 page clicks vs 5 top-query clicks                                 | **Low** — affects interpretation, not decisions |

---

## 18. NON-NEGOTIABLE SEO REQUIREMENTS FOR THE NEW WEBSITE

1. **The 16 URLs listed in §16d do not change.** Not for tidiness, not for a nicer slug, not for a new taxonomy.
2. **`/products/`** **remains the single home of the keg cluster** — `cold brew keg`, `nitro cold brew keg`, `cold brew kegs`, `coffee keg`, `nitro coffee keg`, `coffee kegs`, `nitro brew keg`, `cold brew coffee keg`, `keg of cold brew`, `keg of coffee`, `nitro cold brew kegs`, `keg coffee`, `coffee in a keg`, `kegged coffee`, `iced coffee keg`, `where to buy kegs of cold brew coffee`.
3. **The homepage keeps its brand ownership.** Title and H1 must continue to contain "Bona Fide" plus "Nitro Coffee" and "Tea". Current: title *Nitro Coffee Experts & Leaders - Bona Fide Nitro Coffee & Nitro Tea*, H1 *BONA FIDE - EXPERTS IN NITRO COFFEE AND NITRO TEA*.
4. **`BreadcrumbList`** **structured data on every page that has it today** (24 URLs, listed in appendix §12).
5. **The homepage Review/rating structured data is reproduced**, item name *"Bona Fide Nitro Coffee and Tea"*.
6. **Every** **`/…/amp/`** **URL 301s to its canonical page.** No 404s, no chains.
7. **`http://`** **→** **`https://`** **and** **`www.`** **→ apex are single 301 hops**, verified with a real Googlebot-style fetch, not just a browser test.
8. **Every URL in the current 50-URL sitemap either exists in the new site or 301s to a topically relevant page.** No blanket homepage redirects.
9. **One canonical page per query cluster.** No page ships with a title or H1 that duplicates another page's.
10. **Self-referencing canonical on every indexable page.**
11. **A new XML sitemap exists at a stable path, declared in** **`robots.txt`**, containing only indexable canonical URLs.
12. **`robots.txt`** **does not disallow anything currently crawlable and ranking.**
13. **Topical internal links, not just navigation.** Specifically: `/products/` ↔ `/kegerators/` ↔ `/howtobuy/` ↔ `/nitro-cold-brew/`; and every informational page links to its commercial counterpart.
14. **US-first.** 86% of clicks are US. No geo-routing, no country splitting, no hreflang unless a real EU site is being built — and if it is, `/hot-nitro-equipment-rental/`'s EU price queries are the only evidence of EU demand in the data.
15. **Mobile parity or better.** Mobile is 50% of clicks and already ranks 8 positions better than desktop.
16. **Image filenames and paths preserved** where those images currently rank.
17. **`/nitro-coffee-kegs/`****,** **`/howtobuy/`****,** **`/hot-nitro-coffee/`****,** **`/3-cups-of-coffee-a-day-…/`****,** **`/coffee-trends-dominate-2018/`****,** **`/how-ambient-stable-coffee-kegs-…/`****,** **`/a-touch-of-vanilla-…/`****,** **`/nitro-coffee-in-time-of-covid-19-…/`** **must resolve** — each carries external links.
18. **The Search Console Domain property stays as-is.** It already covers every protocol and host variant and holds the only history that exists.

---

## 19. QUESTIONS / UNKNOWNS REQUIRING FURTHER INVESTIGATION

| # Question Why it matters How to resolve  |                                                                                                    |                                                                                                                                                          |                                                                                                                             |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 1                                         | **What triggered the "Deceptive pages" security issue, and which URLs are affected?**              | Blocks rankings and shows browser warnings. GSC reports Sample URLs: N/A                                                                                 | Server-side malware/injection scan; check for injected pages, redirects, uploaded files; review the `.lol` referring domain |
| 2                                         | **Does** **`http://bonafidenitro.com/`** **return a 301 to Googlebot, or a 200 with a canonical?** | Explains 301 clicks attributed to a non-indexed URL and determines whether a server fix is needed pre-migration                                          | `curl -I -A "Googlebot" http://bonafidenitro.com/` and compare to browser behaviour                                         |
| 3                                         | **Why is** **`/howtobuy/`** **down 30% YoY** when everything else grew?                            | It is the second-most-linked page and the only B2B asset                                                                                                 | Query-level 16-month comparison filtered to that page; check for a content or template change                               |
| 4                                         | **Is** **`/hot-nitro-equipment-rental/`** **still a live business line?**                          | Determines KEEP vs CONSOLIDATE for a page owning EU equipment-price queries                                                                              | Business question for the team                                                                                              |
| 5                                         | **Whose name is** **`john goerke`****,** and which page should own it?                             | 584 impressions, 10 clicks, position 6.2 — a real person-entity query                                                                                    | Internal                                                                                                                    |
| 6                                         | **Should** **`Bona-Fide-Marketing-Plan-2026.pdf`** **be publicly indexed?**                        | Currently indexed with 602 impressions                                                                                                                   | Business decision                                                                                                           |
| 7                                         | **Which 2 AMP pages are invalid?**                                                                 | Only matters if AMP is retained; irrelevant if it is retired                                                                                             | Expand the two AMP issue rows in GSC                                                                                        |
| 8                                         | **Which sitemap refers** **`/products-2/`** **and** **`/nitro-cold-brew-old/`****?**               | URL Inspection showed no Sitemaps row for either                                                                                                         | Re-inspect, or check `wp-sitemap-posts-page-1.xml` directly                                                                 |
| 9                                         | **Is tea an actual product line to build architecture around?**                                    | \~1,850 tea impressions, zero tea pages, "Tea" in the company name                                                                                       | Business decision — this is the single biggest IA question                                                                  |
| 10                                        | **Is "Bona Fide Draft Coffee and Tea" replacing "Bona Fide Nitro Coffee and Tea" as the brand?**   | If so, 990 clicks of brand equity sit on "nitro" phrasing, and the draft cluster (\~2,300 impressions, currently 0 clicks) becomes strategically central | Business decision — **materially changes the migration plan**                                                               |
| 11                                        | **Will the rebuild keep the** **`bonafidenitro.com`** **domain?**                                  | A domain change is a different and far riskier project than a rebuild                                                                                    | Business decision                                                                                                           |
| 12                                        | **What generated** **`/To`****,** **`/roots/`****,** **`/where-to-refill-your-`****?**             | Something is emitting malformed links                                                                                                                    | Crawl the site; check theme/plugin templates                                                                                |
| 13                                        | **Does the team want Product structured data / Merchant Center?**                                  | No Shopping presence today for a company selling kegs                                                                                                    | Business decision                                                                                                           |
| 14                                        | **What are the remaining \~41 external linking domains?**                                          | Only 24 of 65 captured; GSC paginates                                                                                                                    | Page through the Links report, or use the CSV export                                                                        |
| 15                                        | **Is** **`/author/admin/`** **worth keeping?**                                                     | 24 clicks at 2.0% CTR from a WordPress users sitemap                                                                                                     | Low stakes, but it is traffic                                                                                               |

---

# SEO MIGRATION GUARDRAILS

**Rules the new website implementation MUST obey. Derived entirely from the Search Console data above.**

### URLs that cannot change

```
/
/products/
/howtobuy/
/kegerators/
/nitro-cold-brew/
/hot-nitro-coffee/
/cold-brew-coffee-concentrate-bag-in-box-versus-cold-brew-in-kegs/
/healthy-benefits-drinking-nitro-coffee-nitro-coffee-healthy/
/about/
/contact-bona-fide-nitro-coffee-and-tea/
/coffee-on-tap-is-the-future/
/nitro-coffee-kegs/
/3-cups-of-coffee-a-day-why-it-can-be-good-for-the-health/
/blog/
/nitro-coffee-questions/
/hot-nitro-equipment-rental/

```

*(88% of clicks, 44 of 65 external linking domains.)*

### URLs requiring 301 mappings before deployment

- All 25 `/…/amp/` URLs → their canonical page
- `/products-2/` → `/products/`
- `/nitro-cold-brew-old/` → `/nitro-cold-brew/`
- `/what-is-nitro-cold-brew-coffee/` → `/nitro-cold-brew/`
- `/nitro-coffee-health-benefits/` → `/healthy-benefits-drinking-nitro-coffee-nitro-coffee-healthy/`
- `/nitro-cold-brew-coffee-made-easy-2/` → new draft-systems page
- `/interested-in-selling-usa/`, `/interested-in-selling-eu-and-usa/`, `/interested-in-selling-eu-qr-2/` → one reseller page
- `/coffee-trends-dominate-2018/`, `/nitro-coffee-future/` → trends/insights page
- `/is-coffee-healthy/`, `/coffee-doesnt-produce-cancer-says-leading-american-scientist/` → health cluster page
- `/a-touch-of-vanilla-to-your-nitro-coffee/` → flavours/products
- `/how-ambient-stable-coffee-kegs-help-you-save-more-money/` → keg logistics content
- `/nitro-coffee-in-time-of-covid-19-pandemic-how-safe-is-it/` → safety/quality content
- `/blog-old/`, `/category/news-nitro-coffee-and-nitro-tea/` (+ `/page/2/`) → `/blog/`
- `http://*` → `https://*`; `www.*` → apex — **single hop, no chains**
- All currently-redirecting legacy URLs listed in §16c — reproduce, do not 404
- Trailing-slash-less duplicates → slash version

**Never redirect unrelated URLs to the homepage.** The only defensible exceptions are the malformed `/To` and `/where-to-refill-your-`.

### Content / topics that must survive

- **Keg products** (the whole `cold brew keg` / `nitro cold brew keg` / `coffee keg` family) — on `/products/`
- **B2B distribution and wholesale supply** — on `/howtobuy/`
- **Hot nitro coffee** — on `/hot-nitro-coffee/`
- **Dispensers / kegerators / equipment** — on `/kegerators/`
- **Bag-in-box cold brew concentrate** — on `/cold-brew-coffee-concentrate-bag-in-box-versus-cold-brew-in-kegs/`
- **"Coffee on tap"** — on `/coffee-on-tap-is-the-future/`
- **"What is nitro cold brew" + "is nitro coffee bad for you / healthy"** — consolidated, not deleted
- **"3 cups of coffee a day"** — position 2.5 on a 1,633-impression query
- **Draft / on-draft coffee systems** — \~2,300 impressions currently held by a zero-click page
- **Brand entity content** ("Bona Fide", "Bona Fide Brewing Company") — on `/` and `/about/`

### Title / H1 / query relationships to preserve

| URL Must keep containing        |                                                         |
| ------------------------------- | ------------------------------------------------------- |
| `/`                             | "Bona Fide" + "Nitro Coffee" + "Tea"                    |
| `/products/`                    | "Cold Brew" + "Nitro Coffee" + **"Kegs"**               |
| `/howtobuy/`                    | "Distributor" / "Wholesale" + "Coffee Keg"              |
| `/kegerators/`                  | "Nitro Cold Brew Coffee" + equipment/dispenser language |
| `/hot-nitro-coffee/`            | "Hot Nitro Coffee" (exact)                              |
| `/nitro-cold-brew/`             | "Nitro Cold Brew"                                       |
| `/cold-brew-…-bag-in-box-…/`    | "Cold Brew Bag In Box Coffee"                           |
| `/coffee-on-tap-is-the-future/` | "Coffee on Tap"                                         |
| `/3-cups-of-coffee-a-day-…/`    | "3 Cups of Coffee a Day"                                |
| `/nitro-coffee-kegs/`           | "Nitro Coffee Kegs"                                     |

**No two pages may ship with the same** **`<title>`****.** Two pairs violate this today.

### Canonical requirements

- Self-referencing canonical on every indexable page
- Exactly one indexable URL per piece of content — no `-2` / `-old` / `-new` twins
- Consistent trailing-slash policy, enforced by 301
- Apex + HTTPS is the canonical host/protocol; everything else 301s in one hop
- No page canonicalises to a URL that 301s

### Internal-link relationships to preserve or create

- **Preserve:** the 10 URLs currently receiving 41 internal links each (`/`, `/about/`, `/blog/`, `/cold-brew-…-bag-in-box-…/`, `/contact-…/`, `/howtobuy/`, `/kegerators/`, `/nitro-coffee-questions/`, `/nitro-cold-brew/`, `/products/`) keep site-wide prominence
- **Create:** `/coffee-on-tap-is-the-future/` (3 links today), `/nitro-coffee-kegs/` (1 link today), `/healthy-benefits-…/` (4), `/nitro-cold-brew-coffee-made-easy-2/`'s successor (2) get real topical links
- **Create:** commercial ↔ informational pairs — `/products/` ↔ `/nitro-cold-brew/`, `/kegerators/` ↔ draft-systems page, `/howtobuy/` ↔ `/products/`
- **Fix:** no page earning meaningful clicks ships with zero internal links (today: `/products-2/`, `/nitro-cold-brew-old/`, `/hot-nitro-equipment-rental/`, the reseller pages)

### Structured data that must survive

- `BreadcrumbList` on all 24 pages that carry it today (appendix §12)
- The homepage Review/rating markup, item name *"Bona Fide Nitro Coffee and Tea"*
- **Planned loss:** AMP markup and all `/amp/` URLs — expect the AMP search-appearance row (8,415 impressions/quarter) to go to zero, with minimal click impact given its 0.4% CTR
- **Planned addition (opportunity, not preservation):** `Product` and `Organization` markup — neither exists today

### Sitemap requirements

- One XML sitemap at a stable path, declared in `robots.txt`
- Contains only indexable, canonical, 200-returning URLs
- Excludes the noindex/utility/booking URLs currently included (`/privacy-policies/`, `/terms-of-service/`, `/thank-you-your-ticket-is-paid/`, `/cancel-appointment/`, `/cancel-payment/`, `/book-appointment/`, `/thank-you-page-usa/`, `/blog-old/`, `/on-tap-in-10-min/`, `/gastro-and-hotel-2023-paid-ticket/`)
- No author/users sitemap
- Roughly 50 URLs or fewer — a sudden jump in sitemap size is a red flag, not a win
- **After launch:** retire `sitemap_index.xml` (erroring since 2018) and the duplicate `http://` sitemap submission

### Indexing requirements

- The 42 currently-indexed URLs either remain indexed or 301 to an indexed URL
- No new `noindex` on any page in §16d
- No `robots.txt` disallow on anything currently crawlable and ranking
- Parameter URLs, search templates, feeds, admin paths and raw post-ID URLs must not be generatable
- Every page returns a real 200 or a real 301 — no soft 404s
- A 404 page that returns a genuine 404 status

### Launch-day verification checklist

1. Crawl the old URL list (appendix §3, §4, §9) against the new site — **zero unexpected 404s, zero redirect chains**
2. `curl` every §16d URL — must return 200 with a self-referencing canonical
3. Validate `BreadcrumbList` on all 24 pages and the homepage Review markup with the Rich Results Test
4. Submit the new sitemap **only after** the redirect map is live and verified
5. Re-run URL Inspection on `/`, `/products/`, `/howtobuy/`, `/kegerators/`, `/nitro-cold-brew/` — confirm "URL is on Google" and Google-selected canonical = inspected URL
6. Keep this document and its appendix as the immovable comparison point for the first 90 days post-launch

---

*End of report. Nothing in Search Console, WordPress, DNS, the sitemap, redirects, or any production file was modified during this audit.*