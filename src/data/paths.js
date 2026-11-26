/* Links that work whether the site is at a domain root or in a sub-folder
   (GitHub Pages serves a project at /<repository-name>/).
   English sits at the root, Malay under /ms/. */
const base = import.meta.env.BASE_URL.replace(/\/$/, '');

export const paths = (lang) => {
  const home = lang === 'ms' ? `${base}/ms/` : `${base}/`;
  return { home, quote: `${home}quote/` };
};
