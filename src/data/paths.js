/* Links that work whether the site is at a domain root or in a sub-folder
   (GitHub Pages serves a project at /<repository-name>/). */
const base = import.meta.env.BASE_URL.replace(/\/$/, '');

export const home = `${base}/`;
export const quote = `${base}/quote/`;
