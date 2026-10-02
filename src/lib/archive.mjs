// Archive listings for /blog/, the News category and the author archive (Block 9, Issue #36).
// Membership, order, titles and dates are exactly the live public archive evidence in the
// ZANETA_DECISION on Issue #36 (page 1 = 10 posts, page 2 = 5 posts). Nothing is inferred.
export const PAGE1 = [
  { path: '/a-touch-of-vanilla-to-your-nitro-coffee/', title: 'A Touch of Vanilla to Your Nitro Coffee', date: '2020-10-06', datetxt: 'Oct 6, 2020' },
  { path: '/3-cups-of-coffee-a-day-why-it-can-be-good-for-the-health/', title: '3 Cups of Coffee a Day: Why It Can Be Good for the Health', date: '2020-09-01', datetxt: 'Sep 1, 2020', upd: 'Aug 24, 2022' },
  { path: '/how-ambient-stable-coffee-kegs-help-you-save-more-money/', title: 'How Ambient Stable Coffee Kegs Help You Save More Money', date: '2020-08-22', datetxt: 'Aug 22, 2020', upd: 'Aug 24, 2020' },
  { path: '/hot-nitro-coffee/', title: 'Hot Nitro Coffee', date: '2020-08-03', datetxt: 'Aug 3, 2020', upd: 'Aug 4, 2020' },
  { path: '/nitro-coffee-in-time-of-covid-19-pandemic-how-safe-is-it/', title: 'Nitro Coffee in Time of COVID-19 Pandemic How Safe is it', date: '2020-07-27', datetxt: 'Jul 27, 2020', upd: 'May 18, 2022' },
  { path: '/what-is-nitro-cold-brew-coffee/', title: 'What is Nitro cold brew coffee', date: '2020-07-21', datetxt: 'Jul 21, 2020', upd: 'Aug 3, 2020' },
  { path: '/cold-brew-coffee-concentrate-bag-in-box-versus-cold-brew-in-kegs/', title: 'Cold Brew Bag In Box Coffee', date: '2020-01-02', datetxt: 'Jan 2, 2020', upd: 'Jan 12, 2026' },
  { path: '/nitro-coffee-health-benefits/', title: 'NITRO COFFEE HEALTH BENEFITS', date: '2018-06-14', datetxt: 'Jun 14, 2018', upd: 'May 18, 2022' },
  { path: '/is-coffee-healthy/', title: 'IS COFFEE HEALTHY', date: '2018-05-08', datetxt: 'May 8, 2018', upd: 'Feb 5, 2020' },
  { path: '/coffee-trends-dominate-2018/', title: 'COFFEE TRENDS THAT WILL DOMINATE IN 2018', date: '2018-03-22', datetxt: 'Mar 22, 2018', upd: 'Nov 16, 2018' },
];
export const PAGE2 = [
  { path: '/coffee-doesnt-produce-cancer-says-leading-american-scientist/', title: '“COFFEE DOESN’T PRODUCE CANCER” says leading American Scientist', date: '2018-02-13', datetxt: 'Feb 13, 2018', upd: 'Nov 16, 2018' },
  { path: '/nitro-coffee-future/', title: 'NITRO COFFEE IS THE FUTURE', date: '2018-01-19', datetxt: 'Jan 19, 2018', upd: 'Nov 16, 2018' },
  { path: '/healthy-benefits-drinking-nitro-coffee-nitro-coffee-healthy/', title: 'HEALTHY BENEFITS OF DRINKING NITRO COFFEE, IS NITRO COFFEE HEALTHY?', date: '2017-12-27', datetxt: 'Dec 27, 2017', upd: 'Nov 16, 2018' },
  { path: '/stability-kegs-nitro-coffee/', title: 'STABILITY KEGS NITRO COFFEE', date: '2017-12-01', datetxt: 'Dec 1, 2017', upd: 'Nov 16, 2018' },
  { path: '/coffee-on-tap-is-the-future/', title: 'COFFEE “ON TAP” IS THE FUTURE', date: '2017-12-01', datetxt: 'Dec 1, 2017', upd: 'Oct 11, 2023' },
];
// The category and author archives list the same two evidenced pages as /blog/.
export const BLOG = { base: '/blog/', label: 'Blog' };
export const CATEGORY = { base: '/category/news-nitro-coffee-and-nitro-tea/', label: 'Category: News Nitro Coffee and Nitro Tea' };
export const AUTHOR = { base: '/author/admin/', label: 'Author: John Goerke' };
export const pageUrl = (base, n) => (n === 1 ? base : `${base}page/${n}/`);
