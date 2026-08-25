import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const publicEntries = ['problems', 'solutions', 'mapa', 'about', 'contact', 'privacy', 'terms', 'lgpd'];
const generatedEntries = publicEntries.filter((path) => existsSync(resolve(import.meta.dirname, path, 'index.html')));

export default defineConfig({
  base: '/',
  build: {
    rollupOptions: {
      input: Object.fromEntries([
        ['main', resolve(import.meta.dirname, 'index.html')],
        ...generatedEntries.map((path) => [path, resolve(import.meta.dirname, path, 'index.html')]),
      ]),
    },
  },
});
