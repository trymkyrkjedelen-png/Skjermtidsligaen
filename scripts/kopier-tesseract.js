// Kopierer lesemotoren (Tesseract) og språkfilene inn i public/, så appen ikke er avhengig av en CDN.
// Kjøres automatisk før `npm run dev` og `npm run build`.
import { copyFileSync, mkdirSync } from 'node:fs';

const mål = 'public/tesseract';
mkdirSync(mål, { recursive: true });
const filer = [
  'tesseract.js/dist/worker.min.js',
  'tesseract.js-core/tesseract-core-lstm.wasm.js',
  'tesseract.js-core/tesseract-core-simd-lstm.wasm.js',
  '@tesseract.js-data/nor/4.0.0_best_int/nor.traineddata.gz',
  '@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz',
];
for (const f of filer) copyFileSync(`node_modules/${f}`, `${mål}/${f.split('/').pop()}`);
