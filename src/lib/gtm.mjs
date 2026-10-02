// Google Tag Manager configuration (Block 13, Issue #44).
// The container ID is supplied ONLY as a public build-time value, PUBLIC_GTM_ID. A GTM container
// ID is configuration, not a secret. Nothing is committed and no ID is guessed or recovered: a
// missing or malformed value yields `null` and the layout emits no GTM markup at all.
const GTM_ID = /^GTM-[A-Z0-9]{4,12}$/;

export const resolveGtmId = (raw) => {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  return GTM_ID.test(value) ? value : null;
};
