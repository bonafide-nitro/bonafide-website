// Provider-agnostic contact form configuration (Block 11, Issue #40).
// The hosted form provider is supplied ONLY as a public build-time value,
// PUBLIC_CONTACT_FORM_ENDPOINT. Nothing vendor-specific or secret lives in the repo.
// A missing or unusable value yields `null`, and the page then renders a disabled,
// non-sending form instead of posting to an invented destination.
export const resolveContactEndpoint = (raw) => {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
};
