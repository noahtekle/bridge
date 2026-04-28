import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  site: 'https://bridge-stack.pages.dev',
  integrations: [tailwind({ applyBaseStyles: false })],
  output: 'static',
});
