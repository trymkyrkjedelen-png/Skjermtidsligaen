// Datohjelpere. Alle datoer lagres som 'YYYY-MM-DD' i lokal tid.

export function tilNokkel(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dag = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dag}`;
}

export function fraNokkel(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function iDag() {
  return tilNokkel(new Date());
}

export function leggTilDager(nokkel, n) {
  const d = fraNokkel(nokkel);
  d.setDate(d.getDate() + n);
  return tilNokkel(d);
}

// Mandag som første ukedag
export function ukestart(nokkel) {
  const d = fraNokkel(nokkel);
  const forskyvning = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - forskyvning);
  return tilNokkel(d);
}

export function manedstart(nokkel) {
  return nokkel.slice(0, 8) + '01';
}

export function periode(type, nokkel = iDag()) {
  if (type === 'dag') return { fra: nokkel, til: nokkel };
  if (type === 'uke') return { fra: ukestart(nokkel), til: leggTilDager(ukestart(nokkel), 6) };
  const fra = manedstart(nokkel);
  const d = fraNokkel(fra);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  return { fra, til: tilNokkel(d) };
}

export function datoerMellom(fra, til) {
  const ut = [];
  for (let d = fra; d <= til; d = leggTilDager(d, 1)) ut.push(d);
  return ut;
}

const dagNavn = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];
const manedNavn = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];

export function pentDato(nokkel) {
  if (nokkel === iDag()) return 'I dag';
  if (nokkel === leggTilDager(iDag(), -1)) return 'I går';
  const d = fraNokkel(nokkel);
  return `${dagNavn[d.getDay()]} ${d.getDate()}. ${manedNavn[d.getMonth()]}`;
}

export function kortDag(nokkel) {
  return dagNavn[fraNokkel(nokkel).getDay()].slice(0, 3);
}

export function manedTekst(nokkel) {
  const d = fraNokkel(nokkel);
  return `${manedNavn[d.getMonth()]} ${d.getFullYear()}`;
}

export function ukenummer(nokkel) {
  const d = fraNokkel(nokkel);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const uke1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - uke1) / 86400000 - 3 + ((uke1.getDay() + 6) % 7)) / 7);
}

export function formaterMinutter(min) {
  if (min == null) return '–';
  const t = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (t === 0) return `${m} min`;
  if (m === 0) return `${t} t`;
  return `${t} t ${m} min`;
}
