// Resolves a registered external commerce link to its exact evidenced href. Unknown ids throw at
// build time: a page can never render a commerce destination that is not in src/data/commerce.yaml.
import { loadCommerce } from './data.mjs';

export const commerceHref = (id, commerce = loadCommerce()) => {
  const link = commerce.links[id];
  if (!link) throw new Error(`unknown commerce link id: ${id}`);
  return link.href;
};

// A destination evidenced as dead (`knownDead: true`) is kept in the registry as evidence but pages must not
// offer it as a clickable purchase link.
export const commerceIsKnownDead = (id, commerce = loadCommerce()) => {
  const link = commerce.links[id];
  if (!link) throw new Error(`unknown commerce link id: ${id}`);
  return link.knownDead === true;
};
