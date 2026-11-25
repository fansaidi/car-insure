import { defineConfig } from 'astro/config';

// The GitHub Pages workflow sets these; locally the site runs at the root.
export default defineConfig({
  site: process.env.SITE_URL || undefined,
  base: process.env.BASE_PATH || '/',
});
