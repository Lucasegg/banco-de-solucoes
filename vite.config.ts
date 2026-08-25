import { defineConfig } from 'vite';

const publicEntries = ['problems', 'solutions', 'mapa', 'about', 'contact', 'privacy', 'terms', 'lgpd'];
const entryUrl = (path: string) => new URL(path, import.meta.url).pathname;

export default defineConfig({
  base: '/',
  build: {
    rollupOptions: {
      input: Object.fromEntries([
        ['main', entryUrl('index.html')],
        ...publicEntries.map((path) => [path, entryUrl(`${path}/index.html`)]),
      ]),
    },
  },
});
