// Invitasjonskoder uten tegn som er lette å forveksle (0/O, 1/I/L)
const TEGN = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function nyKode(lengde = 6) {
  const tall = crypto.getRandomValues(new Uint32Array(lengde));
  return Array.from(tall, (n) => TEGN[n % TEGN.length]).join('');
}

export function renKode(s) {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, '');
}
