# Block 167 visual evidence

Real Chromium (Playwright) full-page screenshots, lazy images scrolled into view.
- `home-before-*` = `main` at a94a128; `home-after-*` = this PR head. Widths 1440, 820, 375.
- `mobile-menu-open-375.png`: native `<details>` menu open (all 11 links, each >=44px tall, no horizontal overflow).
- `products-after-1440.png`, `howtobuy-after-375.png`: inner-page regression checks on the shared shell.
Measured horizontal overflow (scrollWidth - innerWidth) = 0 on /, /howtobuy/, /products/, /about/ at all three widths.
