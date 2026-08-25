import { defineConfig } from 'vite';

declare const process: { cwd: () => string };

const publicEntries = ['problems', 'solutions', 'mapa', 'about', 'contact', 'privacy', 'terms', 'lgpd'];
const entryPath = (path: string) => `${process.cwd()}/${path}`;

export default defineConfig({
  base: '/',
  build: {
    rollupOptions: {
      input: Object.fromEntries([
        ['main', entryPath('index.html')],
        ...publicEntries.map((path) => [path, entryPath(`${path}/index.html`)]),
      ]),
    },
  },
});
