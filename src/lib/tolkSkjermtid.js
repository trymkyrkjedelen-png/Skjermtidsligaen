// Tolker teksten fra et skjermbilde av Skjermtid på iPhone (norsk eller engelsk).
// Input: tekstlinjer i leserekkefølge med høyden på teksten i piksler.
// Totalen er den største teksten på siden, f.eks. «4 t 12 min» eller «4h 12m».

import { leggTilDager } from './dato.js';

// Fjern aksenter, så «går», «gär» og «gar» blir like
const vask = (s) =>
  s
    .toLowerCase()
    .replace(/[øö]/g, 'o')
    .replace(/[æä]/g, 'a')
    .replace(/å/g, 'a')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

// Vanlige OCR-feil i tall: O→0, l/I/|→1
const fiksTall = (s) =>
  s
    .replace(/(\d)[oO]/g, '$10')
    .replace(/\b[oO](\d)/g, '0$1')
    .replace(/(^|\s)[lI|](\d)/g, '$11$2')
    .replace(/(^|\s)[il|](?=\s*m(in)?\b)/g, '$11'); // «12h im» → «12h 1m»

const TID =
  /(?:(\d{1,2})\s*(?:t|h|hr|hrs|time|timer|hours?)\.?)?\s*(?:(\d{1,2})\s*(?:min|m|minutter|minutes?)\.?)?/;
const BARE_TID = new RegExp(`^\\s*${TID.source}\\s*$`);

export function lesTid(tekst) {
  const m = fiksTall(vask(tekst)).replace(/[^\w\s.]/g, ' ').match(BARE_TID);
  if (!m || (m[1] == null && m[2] == null)) return null;
  const t = Number(m[1] ?? 0);
  const min = Number(m[2] ?? 0);
  if (t > 24 || min > 59 || t * 60 + min > 1440) return null;
  return t * 60 + min;
}

// Indeks = getDay(); «.» tåler at OCR leser ø/å feil
const UKEDAGER = [/s.ndag|sunday/, /mandag|monday/, /tirsdag|tuesday/, /onsdag|wednesday/, /torsdag|thursday/, /fredag|friday/, /l.rdag|saturday/];
const MANEDER = ['jan', 'feb', 'mar', 'apr', 'ma[iy]', 'jun', 'jul', 'aug', 'sep', 'o[kc]t', 'nov', 'de[sc]'];

function finnDato(tekst, idag) {
  const t = vask(tekst);
  if (/\bi\s*dag\b|\btoday\b/.test(t)) return idag;
  if (/\bi\s*g.r\b|\byesterday\b/.test(t)) return leggTilDager(idag, -1);

  // «19. okt.» / «okt 19» / «19 oct»
  for (let i = 0; i < 12; i++) {
    const m = t.match(new RegExp(`\\b(\\d{1,2})\\.?\\s*${MANEDER[i]}\\w*|\\b${MANEDER[i]}\\w*\\.?\\s*(\\d{1,2})\\b`));
    if (m) {
      const dag = Number(m[1] ?? m[2]);
      if (dag < 1 || dag > 31) continue;
      const ar = Number(idag.slice(0, 4));
      let kandidat = `${ar}-${String(i + 1).padStart(2, '0')}-${String(dag).padStart(2, '0')}`;
      if (kandidat > idag) kandidat = `${ar - 1}${kandidat.slice(4)}`;
      return kandidat;
    }
  }

  // Ukedag: siste gang det var den dagen (iPhone viser «I går» for i går, så minst 2 dager siden)
  for (let i = 0; i < 7; i++) {
    if (UKEDAGER[i].test(t)) {
      for (let n = 1; n <= 7; n++) {
        const d = leggTilDager(idag, -n);
        if (new Date(d + 'T12:00').getDay() === i) return d;
      }
    }
  }
  return null;
}

// «▼ 12 % fra i går» er en sammenligning, ikke datoen for skjermbildet
const erSammenligning = (tekst) => /%|\bfra\b|\bfrom\b/.test(vask(tekst));

// Linjen rett over totalen: datoen («I dag, 19. okt.») eller «Daglig gjennomsnitt»
export function erOverskrift(tekst) {
  if (erSammenligning(tekst)) return false;
  return /gjennomsnitt|average/.test(vask(tekst)) || finnDato(tekst, '2000-01-01') != null;
}

export function tolkSkjermtid(linjer, idag) {
  let beste = null;
  linjer.forEach((linje, i) => {
    const minutter = lesTid(linje.tekst);
    if (minutter == null || !/\d/.test(linje.tekst)) return;
    if (!beste || linje.hoyde > beste.hoyde * 1.15) beste = { minutter, hoyde: linje.hoyde, indeks: i };
  });

  const alt = linjer.map((l) => l.tekst).join('\n');
  const erSnitt = /gjennomsnitt|average/.test(vask(alt));

  // Datoen står like over totalen; let oppover fra den, og så i resten av teksten
  let dato = null;
  if (beste) {
    for (let i = beste.indeks; i >= Math.max(0, beste.indeks - 4) && !dato; i--) {
      if (!erSammenligning(linjer[i].tekst)) dato = finnDato(linjer[i].tekst, idag);
    }
  }
  for (const l of linjer) {
    if (dato) break;
    if (!erSammenligning(l.tekst)) dato = finnDato(l.tekst, idag);
  }

  return { minutter: beste?.minutter ?? null, dato, erSnitt };
}
