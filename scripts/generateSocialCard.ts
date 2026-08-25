import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const sourcePath = resolve(root, 'assets/social-card.png.base64');
const destinationPath = resolve(root, 'public/social-card.png');
const encoded = readFileSync(sourcePath, 'utf8');
const compact = encoded.replace(/\s/g, '');

if (!compact || !/^[A-Za-z0-9+/]+={0,2}$/.test(compact) || compact.length % 4 !== 0) {
  throw new Error('assets/social-card.png.base64 não contém Base64 válido.');
}

const image = Buffer.from(compact, 'base64');
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
if (!image.subarray(0, 8).equals(pngSignature)) {
  throw new Error('A imagem social decodificada não é um PNG válido.');
}
if (image.readUInt32BE(16) !== 1200 || image.readUInt32BE(20) !== 630) {
  throw new Error('A imagem social deve possuir dimensões de 1200 × 630 pixels.');
}

mkdirSync(resolve(root, 'public'), { recursive: true });
writeFileSync(destinationPath, image);
console.log(`Imagem social gerada em public/social-card.png (${image.byteLength} bytes).`);
