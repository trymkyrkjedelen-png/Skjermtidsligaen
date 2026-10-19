// Leser skjermtid fra et skjermbilde, helt i nettleseren (ingenting lastes opp).
// Tesseract (OCR) og språkdata lastes først når noen faktisk bruker funksjonen.
import { lesMedArbeider } from './ocrKjerne.js';

let arbeider = null;

async function hentArbeider(fremdrift) {
  if (!arbeider) {
    const { createWorker } = await import('tesseract.js');
    if (import.meta.env.VITE_SPRAKFIL_ENDELSE) await forhandslastSprak();
    // Filene kopieres inn i public/tesseract av scripts/kopier-tesseract.js
    const sti = new URL('tesseract/', location.href).href;
    arbeider = createWorker(['nor', 'eng'], 1, {
      workerPath: sti + 'worker.min.js',
      corePath: sti,
      langPath: sti,
      logger: (m) => m.status === 'recognizing text' && fremdrift?.(m.progress),
    }).catch((e) => {
      arbeider = null;
      throw e;
    });
  }
  return arbeider;
}

// Noen verter (f.eks. Claude-artifacts) serverer ikke .gz-filer. Da legges språkfilene ut med en annen
// endelse, og vi legger dem i Tesseracts egen hurtigbuffer (IndexedDB) før arbeideren starter.
async function forhandslastSprak() {
  const { get, set } = await import('idb-keyval');
  const sti = new URL('tesseract/', location.href).href;
  for (const sprak of ['nor', 'eng']) {
    const nokkel = `./${sprak}.traineddata`;
    if (await get(nokkel).catch(() => null)) continue;
    const svar = await fetch(`${sti}${sprak}.traineddata${import.meta.env.VITE_SPRAKFIL_ENDELSE}`);
    if (!svar.ok) throw new Error(`Fant ikke språkfilen for ${sprak}`);
    await set(nokkel, new Uint8Array(await svar.arrayBuffer()));
  }
}

// Gråtoner, og snu fargene hvis bildet er i mørk modus (OCR liker mørk tekst på lys bakgrunn)
async function forbered(fil) {
  const bilde = await createImageBitmap(fil);
  const skala = Math.min(1, 1400 / bilde.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bilde.width * skala);
  canvas.height = Math.round(bilde.height * skala);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bilde, 0, 0, canvas.width, canvas.height);
  bilde.close?.();

  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = data.data;
  let sum = 0;
  for (let i = 0; i < px.length; i += 4) {
    const g = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
    px[i] = px[i + 1] = px[i + 2] = g;
    sum += g;
  }
  if (sum / (px.length / 4) < 110) {
    for (let i = 0; i < px.length; i += 4) px[i] = px[i + 1] = px[i + 2] = 255 - px[i];
  }
  ctx.putImageData(data, 0, 0);
  return canvas;
}

export async function lesSkjermbilde(fil, idag, fremdrift) {
  const [w, canvas] = await Promise.all([hentArbeider(fremdrift), forbered(fil)]);
  const beskjaer = (topp, bunn, skala) => {
    const stripe = document.createElement('canvas');
    stripe.width = Math.round(canvas.width * skala);
    stripe.height = Math.round((bunn - topp) * skala);
    const ctx = stripe.getContext('2d');
    ctx.scale(skala, skala);
    ctx.drawImage(canvas, 0, -topp);
    return stripe;
  };
  return lesMedArbeider(w, canvas, beskjaer, idag);
}
