// Demomodus: alt lagres i nettleseren, med noen påfunnede venner å konkurrere mot.
// Brukes automatisk når Firebase ikke er satt opp.
import { iDag, leggTilDager } from '../lib/dato.js';
import { nyKode, renKode } from '../lib/kode.js';

const NOKKEL = 'skjermtidsligaen-demo-v1';
const vent = (ms = 150) => new Promise((r) => setTimeout(r, ms));

const VENNER = [
  { uid: 'v1', navn: 'Ingrid', snitt: 140 },
  { uid: 'v2', navn: 'Magnus', snitt: 260 },
  { uid: 'v3', navn: 'Sofie', snitt: 195 },
  { uid: 'v4', navn: 'Henrik', snitt: 320 },
];

function seed() {
  const brukere = Object.fromEntries(VENNER.map((v) => [v.uid, { uid: v.uid, navn: v.navn }]));
  const registreringer = {};
  const idag = iDag();
  for (const v of VENNER) {
    for (let i = 1; i <= 45; i++) {
      if (Math.random() < 0.12) continue; // noen glemmer å registrere
      const dato = leggTilDager(idag, -i);
      const minutter = Math.max(15, Math.round(v.snitt + (Math.random() - 0.5) * v.snitt * 0.8));
      registreringer[`${v.uid}_${dato}`] = { uid: v.uid, dato, minutter };
    }
    if (Math.random() < 0.6) {
      registreringer[`${v.uid}_${idag}`] = { uid: v.uid, dato: idag, minutter: Math.round(v.snitt * (0.5 + Math.random() * 0.6)) };
    }
  }
  const ligaer = {
    demo: { id: 'demo', navn: 'Vennegjengen', kode: 'DEMO42', eier: 'v1', medlemmer: VENNER.map((v) => v.uid) },
  };
  return { brukere, kontoer: {}, registreringer, ligaer, innlogget: null };
}

function last() {
  try {
    const s = JSON.parse(localStorage.getItem(NOKKEL));
    if (s) return s;
  } catch {}
  return seed();
}

export function lagDemoBackend() {
  let tilstand = last();
  let lyttere = [];
  const lagre = () => {
    try {
      localStorage.setItem(NOKKEL, JSON.stringify(tilstand));
    } catch {}
  };
  const meg = () => tilstand.innlogget && tilstand.brukere[tilstand.innlogget];
  const varsle = () => {
    const b = meg();
    const u = b && { uid: b.uid, navn: b.navn, epost: b.epost };
    lyttere.forEach((cb) => cb(u));
  };
  const krevInnlogget = () => {
    if (!meg()) throw { code: 'session_not_found' };
    return meg().uid;
  };
  function loggInnSom(uid) {
    tilstand.innlogget = uid;
    // Nye brukere havner automatisk i demoligaen
    const liga = tilstand.ligaer.demo;
    if (liga && !liga.medlemmer.includes(uid)) liga.medlemmer.push(uid);
    lagre();
    varsle();
  }

  return {
    demo: true,

    vedAuth(cb) {
      lyttere.push(cb);
      setTimeout(() => cb(meg() ? { uid: meg().uid, navn: meg().navn, epost: meg().epost } : null), 0);
      return () => (lyttere = lyttere.filter((l) => l !== cb));
    },

    async registrer({ navn, epost, passord }) {
      await vent();
      const e = epost.trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(e)) throw { code: 'email_address_invalid' };
      if (passord.length < 6) throw { code: 'weak_password' };
      if (tilstand.kontoer[e]) throw { code: 'user_already_exists' };
      const uid = 'u' + Date.now();
      tilstand.kontoer[e] = { uid, passord };
      tilstand.brukere[uid] = { uid, navn, epost: e };
      loggInnSom(uid);
      return { bekreftEpost: false };
    },

    async loggInn({ epost, passord }) {
      await vent();
      const konto = tilstand.kontoer[epost.trim().toLowerCase()];
      if (!konto || konto.passord !== passord) throw { code: 'invalid_credentials' };
      loggInnSom(konto.uid);
    },

    async loggInnGoogle() {
      await vent();
      const e = 'demo.google@example.com';
      if (!tilstand.kontoer[e]) {
        tilstand.kontoer[e] = { uid: 'google-demo', passord: null };
        tilstand.brukere['google-demo'] = { uid: 'google-demo', navn: 'Google-bruker', epost: e };
      }
      loggInnSom('google-demo');
    },

    async tilbakestillPassord() {
      await vent();
    },

    async endrePassord(passord) {
      if (passord.length < 6) throw { code: 'weak_password' };
      const b = meg();
      if (b?.epost) tilstand.kontoer[b.epost].passord = passord;
      lagre();
    },

    // Ingen andre skriver i demomodus
    vedEndringer() {
      return () => {};
    },

    async loggUt() {
      tilstand.innlogget = null;
      lagre();
      varsle();
    },

    async oppdaterNavn(navn) {
      tilstand.brukere[krevInnlogget()].navn = navn;
      lagre();
      varsle();
    },

    async lagreRegistrering(dato, minutter) {
      const uid = krevInnlogget();
      tilstand.registreringer[`${uid}_${dato}`] = { uid, dato, minutter };
      lagre();
    },

    async slettRegistrering(dato) {
      delete tilstand.registreringer[`${krevInnlogget()}_${dato}`];
      lagre();
    },

    async mineRegistreringer(fra, til) {
      const uid = krevInnlogget();
      return Object.values(tilstand.registreringer).filter((r) => r.uid === uid && r.dato >= fra && r.dato <= til);
    },

    async mineLigaer() {
      await vent(80);
      const uid = krevInnlogget();
      return Object.values(tilstand.ligaer)
        .filter((l) => l.medlemmer.includes(uid))
        .sort((a, b) => a.navn.localeCompare(b.navn, 'nb'));
    },

    async opprettLiga(navn) {
      const uid = krevInnlogget();
      const liga = { id: 'l' + Date.now(), navn, kode: nyKode(), eier: uid, medlemmer: [uid] };
      tilstand.ligaer[liga.id] = liga;
      lagre();
      return liga;
    },

    async blimedILiga(kode) {
      await vent();
      const uid = krevInnlogget();
      const liga = Object.values(tilstand.ligaer).find((l) => l.kode === renKode(kode));
      if (!liga) throw { code: 'liga/ukjent-kode' };
      if (!liga.medlemmer.includes(uid)) liga.medlemmer.push(uid);
      lagre();
      return liga;
    },

    async forlatLiga(id) {
      const uid = krevInnlogget();
      const liga = tilstand.ligaer[id];
      if (liga) liga.medlemmer = liga.medlemmer.filter((m) => m !== uid);
      lagre();
    },

    async ligaData(liga, fra, til) {
      await vent(80);
      const fersk = tilstand.ligaer[liga.id] ?? liga;
      const medlemmer = fersk.medlemmer.map((uid) => tilstand.brukere[uid]).filter(Boolean).map(({ uid, navn }) => ({ uid, navn }));
      const registreringer = Object.values(tilstand.registreringer).filter(
        (r) => fersk.medlemmer.includes(r.uid) && r.dato >= fra && r.dato <= til,
      );
      return { medlemmer, registreringer };
    },

    nullstillDemo() {
      tilstand = seed();
      lagre();
      varsle();
    },
  };
}
