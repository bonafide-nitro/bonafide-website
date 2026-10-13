// Block 40 (Issue #97): page-level images of the original /products/ and /products-2/ pages (not product-card images).
// Path, `alt` ('' = the genuine observed empty alt) and intrinsic size come from the owner-saved WordPress HTML of each page
// (document order) and the owner ASSET_MANIFEST.json; positions are documented in docs/migration/39-block40-page-level-artwork.md.
const U = '/wp-content/uploads';
export const MEDIA = {
  logo: { src: `${U}/2019/04/Bona-Fide-logo-White-color-big-tea-for-website-header-1.png`, alt: 'Bona Fide Nitro Coffee', width: 250, height: 108 },
  banner: { src: `${U}/2022/05/Bona-Fide-Banner-Product-Page-1.jpg`, alt: 'Bona-Fide-Banner-Product-Page', width: 1920, height: 900 },
  bullets: { src: `${U}/2022/04/Banner-Product-Page-Bona-Fide-Product-Page-Bullets.jpg`, alt: 'Banner-Product-Page-Bona-Fide-Product-Page-Bullets', width: 152, height: 361 },
  // The original alt of Bullets2 is the one recorded for Bullets (its title differs); kept exactly.
  bullets2: { src: `${U}/2022/04/Banner-Product-Page-Bona-Fide-Product-Page-Bullets2.jpg`, alt: 'Banner-Product-Page-Bona-Fide-Product-Page-Bullets', width: 209, height: 482 },
  goldKegs: { src: `${U}/2022/10/Bona-Fide-Banner-New-Home-Page-Gold-Three-Kegs.jpg`, alt: 'Bona-Fide-Banner-New-Home-Page-Gold-Three-Kegs', width: 1920, height: 700 },
  serving: { src: `${U}/2021/12/Bona-Fide-Serving-Nitro-Coffee-Cold-Ok-Cutted.jpg`, alt: '', width: 699, height: 624 },
  classicBlend: { src: `${U}/2025/09/Classic-Blend-Bag-In-Box-Coffee-Cold-Brew-Bona-Fide.jpg`, alt: '', width: 857, height: 1143 },
  coldMachine: { src: `${U}/2019/08/Bona-Fide-Cold-doble-tap-nitro-machine-compressed.png`, alt: 'Bona-Fide-Cold-doble-tap-nitro-machine-coffee-and-tea', width: 907, height: 1209 },
  hotTap: { src: `${U}/2019/05/NEW-Hot-Tap-Bona-Fide-Nitro-Coffee-and-tea-for-website-compressed.png`, alt: 'NEW-Hot-Tap-Bona-Fide-Nitro-Coffee-and-tea-for-website-compressed', width: 671, height: 796 },
  kegBik: { src: `${U}/2022/10/Bona-Fide-Keg-BIK-Set-Hot-Cold-Machine-New.png`, alt: 'Bona Fide Nitro Coffee And Tea Keg BIK Set Hot Cold Machine New', width: 898, height: 894 },
  amazon: { src: `${U}/2022/12/Bona-Fide-Available-On-Amazon.jpg`, alt: 'Bona Fide Cold brew Nitro Coffee Available On Amazon', width: 2000, height: 660 },
};
