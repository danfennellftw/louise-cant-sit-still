import { defineConfig } from 'vite';
import { existsSync, readdirSync } from 'node:fs';

// Only probe for environment GLBs that actually ship, so missing ones don't 404 on every set change.
const envDir = 'public/environments';
const envGlbs = existsSync(envDir) ? readdirSync(envDir).filter((f) => f.endsWith('.glb')).map((f) => f.replace(/\.glb$/, '')) : [];

export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 900 },
  define: { __ENV_GLBS__: JSON.stringify(envGlbs) },
});
