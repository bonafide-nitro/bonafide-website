// Redirect/do-not-generate pattern helpers. `*` = anything, `<slug>` = one path segment,
// `{...}` = a template placeholder (anything).
const esc = (s) => s.replace(/[.+?^$()|[\]\\]/g, '\\$&');

export const patternToRegExp = (pattern) =>
  new RegExp(
    '^' +
      pattern
        .split(/(\*|<slug>|\{[^}]*\})/)
        .map((part) => (part === '*' || /^\{/.test(part) ? '.*' : part === '<slug>' ? '[^/]+' : esc(part)))
        .join('') +
      '$',
  );

export const hasPlaceholder = (s) => /[*<{]/.test(s);
