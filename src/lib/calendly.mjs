// Calendly booking link configuration (Block 12, Issue #42).
// The scheduling URL is supplied ONLY as a public build-time value, PUBLIC_CALENDLY_URL.
// A Calendly public scheduling URL is configuration, not a secret. Nothing is committed and no
// URL is guessed: a missing or unusable value yields `null` and the page renders a disabled,
// non-linking booking action.
export const resolveCalendlyUrl = (raw) => {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    const host = url.hostname.toLowerCase();
    if (host !== 'calendly.com' && !host.endsWith('.calendly.com')) return null;
    if (url.pathname.replace(/\/+/g, '') === '') return null;
    return url.href;
  } catch {
    return null;
  }
};
