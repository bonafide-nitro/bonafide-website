// Contact form build configuration (Issue #40 Block 11, reworked in Issue #172).
//
// Public build-time values only; nothing secret ever enters the build:
//   PUBLIC_CONTACT_FORM_ENDPOINT  same-origin PATH of the GoDaddy PHP handler (e.g. /contact-submit.php)
//   PUBLIC_CONTACT_FORM_MODE      "live" | "mock"   (unset => disabled)
//   VERCEL                        set by Vercel builds; a Vercel build can NEVER be live
//
// Resolution is fail-closed and yields one of three states:
//   disabled  no usable configuration, submission is off and the page says so truthfully
//   mock      demo mode, the browser simulates a result and makes no network request at all
//   live      the browser POSTs JSON to the same-origin endpoint path
// A full URL is never accepted as an endpoint, so the form cannot post cross-origin and a
// copy of the build served from another host (Vercel review) cannot reach the live handler.
const SAFE_PATH = /^\/(?:[A-Za-z0-9._~-]+\/)*[A-Za-z0-9._~-]+$/;

export const resolveContactEndpoint = (raw) => {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!value || value.includes('..') || !SAFE_PATH.test(value)) return null;
  return value;
};

export const resolveContactConfig = ({ endpoint, mode, vercel } = {}) => {
  const m = typeof mode === 'string' ? mode.trim().toLowerCase() : '';
  if (m === 'mock') return { state: 'mock', endpoint: null };
  if (m === 'live' && !vercel) {
    const path = resolveContactEndpoint(endpoint);
    if (path) return { state: 'live', endpoint: path };
  }
  return { state: 'disabled', endpoint: null };
};

export const CONTACT_CATEGORIES = [
  ['consumer', 'Consumer'],
  ['retailer', 'Retailer'],
  ['distributor', 'Distributor'],
  ['co-packer', 'Co-packer'],
];
