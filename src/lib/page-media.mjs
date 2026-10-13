// Block 40 (Issue #97): page-level original images with the alt observed on the saved WordPress pages
// (owner-saved /products/ and /products-2/ HTML). `alt: ''` is a genuinely observed empty alt.
// width/height are the intrinsic pixel size of the original binary (layout-shift guard only).
const U = '/wp-content/uploads/';
export const PAGE_MEDIA = {
  banner: { src: `${U}2022/05/Bona-Fide-Banner-Product-Page-1.jpg`, alt: 'Bona-Fide-Banner-Product-Page', width: 1920, height: 900 },
  threeKegs: { src: `${U}2022/10/Bona-Fide-Banner-New-Home-Page-Gold-Three-Kegs.jpg`, alt: 'Bona-Fide-Banner-New-Home-Page-Gold-Three-Kegs', width: 1920, height: 700 },
  serving: { src: `${U}2021/12/Bona-Fide-Serving-Nitro-Coffee-Cold-Ok-Cutted.jpg`, alt: '', width: 699, height: 624 },
  classicBlend: { src: `${U}2025/09/Classic-Blend-Bag-In-Box-Coffee-Cold-Brew-Bona-Fide.jpg`, alt: '', width: 857, height: 1143 },
  coldMachine: { src: `${U}2019/08/Bona-Fide-Cold-doble-tap-nitro-machine-compressed.png`, alt: 'Bona-Fide-Cold-doble-tap-nitro-machine-coffee-and-tea', width: 907, height: 1209 },
  hotTap: { src: `${U}2019/05/NEW-Hot-Tap-Bona-Fide-Nitro-Coffee-and-tea-for-website-compressed.png`, alt: 'NEW-Hot-Tap-Bona-Fide-Nitro-Coffee-and-tea-for-website-compressed', width: 671, height: 796 },
  kegBikSet: { src: `${U}2022/10/Bona-Fide-Keg-BIK-Set-Hot-Cold-Machine-New.png`, alt: 'Bona Fide Nitro Coffee And Tea Keg BIK Set Hot Cold Machine New', width: 898, height: 894 },
  amazon: { src: `${U}2022/12/Bona-Fide-Available-On-Amazon.jpg`, alt: 'Bona Fide Cold brew Nitro Coffee Available On Amazon', width: 199, height: 66 },
  bullets: { src: `${U}2022/04/Banner-Product-Page-Bona-Fide-Product-Page-Bullets.jpg`, alt: 'Banner-Product-Page-Bona-Fide-Product-Page-Bullets', width: 152, height: 361 },
  bullets2: { src: `${U}2022/04/Banner-Product-Page-Bona-Fide-Product-Page-Bullets2.jpg`, alt: 'Banner-Product-Page-Bona-Fide-Product-Page-Bullets', width: 209, height: 482 },
};
