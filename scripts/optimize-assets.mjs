import fs from 'node:fs';
import sharp from 'sharp';
await sharp('public/images/atelier-hero.png').webp({quality:86}).toFile('public/images/atelier-hero.webp');
for(const p of ['src/app/page.tsx','src/app/our-story/page.tsx'])fs.writeFileSync(p,fs.readFileSync(p,'utf8').replaceAll('/images/atelier-hero.png','/images/atelier-hero.webp'));
