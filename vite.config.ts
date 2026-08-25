import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const publicEntries = ['problems', 'solutions', 'mapa', 'about', 'contact', 'privacy', 'terms', 'lgpd'];

export default defineConfig({
  base: '/',
  build: {
    rollupOptions: {
      input: Object.fromEntries([
        ['main', resolve(import.meta.dirname, 'index.html')],
        ...publicEntries.map((path) => [path, resolve(import.meta.dirname, path, 'index.html')]),
      ]),
    },
  },
});
