// Rangering: lavest snitt per registrerte dag vinner.
// Den som har registrert flest dager vinner ved likt snitt.

export function lagTabell(medlemmer, registreringer) {
  const perBruker = new Map(medlemmer.map((m) => [m.uid, []]));
  for (const r of registreringer) perBruker.get(r.uid)?.push(r.minutter);

  const rader = medlemmer.map((m) => {
    const liste = perBruker.get(m.uid) ?? [];
    const sum = liste.reduce((a, b) => a + b, 0);
    return {
      ...m,
      dager: liste.length,
      sum,
      snitt: liste.length ? sum / liste.length : null,
    };
  });

  const med = rader
    .filter((r) => r.dager > 0)
    .sort((a, b) => a.snitt - b.snitt || b.dager - a.dager || a.navn.localeCompare(b.navn, 'nb'));
  const uten = rader.filter((r) => r.dager === 0).sort((a, b) => a.navn.localeCompare(b.navn, 'nb'));

  let plass = 0;
  let forrige = null;
  med.forEach((r, i) => {
    if (forrige === null || Math.round(r.snitt) !== Math.round(forrige)) plass = i + 1;
    r.plass = plass;
    forrige = r.snitt;
  });
  return { rangert: med, uregistrert: uten };
}

// Antall dager på rad (bakover fra i dag eller i går) med registrering
export function rekke(datoer, idag, leggTilDager) {
  const sett = new Set(datoer);
  let d = sett.has(idag) ? idag : leggTilDager(idag, -1);
  let n = 0;
  while (sett.has(d)) {
    n++;
    d = leggTilDager(d, -1);
  }
  return n;
}
