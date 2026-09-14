import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const layout = readFileSync(new URL('../src/components/Layout.tsx', import.meta.url), 'utf8');

assert.match(layout, /md:hidden/, 'mobile menu trigger must be visible below the md breakpoint');
assert.match(layout, /aria-expanded=\{mobileMenuOpen\}/, 'mobile trigger must expose expanded state');
assert.match(layout, /aria-controls="primary-navigation"/, 'mobile trigger must reference the primary navigation');
assert.match(layout, /max-h-\[calc\(100vh-5\.5rem\)\] overflow-y-auto/, 'mobile menu must stay within the viewport and scroll when needed');
assert.match(layout, /setMobileMenuOpen\(false\);\s*onNavigate\(page\);/, 'navigation must close the mobile menu after selecting a destination');
assert.match(layout, /hidden flex-wrap items-center justify-end gap-2 md:flex/, 'desktop navigation must remain hidden on mobile and visible from md upward');

console.log('mobile menu responsive contract: ok');
