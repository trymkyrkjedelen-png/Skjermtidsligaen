import { useEffect, useState } from 'react';
import { backend, feilmelding } from '../backend/index.js';
import { Ikon } from '../komponenter/Ikon.jsx';

function invitasjonslenke(kode) {
  return `${location.origin}${location.pathname}?bli-med=${kode}`;
}

async function del(liga, settKopiert) {
  const lenke = invitasjonslenke(liga.kode);
  const tekst = `Bli med i «${liga.navn}» på Skjermtidsligaen! Koden er ${liga.kode}.`;
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Skjermtidsligaen', text: tekst, url: lenke });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }
  try {
    await navigator.clipboard.writeText(`${tekst} ${lenke}`);
    settKopiert(liga.id);
    setTimeout(() => settKopiert(null), 2000);
  } catch {
    settKopiert(`feil:${liga.id}`);
  }
}

export default function Ligaer({ bruker, ligaer, oppdater, invitasjon, ferdigMedInvitasjon, visTabell }) {
  const [nyttNavn, setNyttNavn] = useState('');
  const [kode, setKode] = useState(invitasjon ?? '');
  const [feil, setFeil] = useState('');
  const [melding, setMelding] = useState('');
  const [jobber, setJobber] = useState(false);
  const [kopiert, setKopiert] = useState(null);
  const [bekreftForlat, setBekreftForlat] = useState(null); // id til ligaen som venter på bekreftelse

  useEffect(() => {
    if (invitasjon) setKode(invitasjon);
  }, [invitasjon]);

  async function utfor(fn) {
    setFeil('');
    setMelding('');
    setJobber(true);
    try {
      await fn();
      await oppdater();
    } catch (e) {
      setFeil(feilmelding(e));
    } finally {
      setJobber(false);
    }
  }

  const opprett = (e) => {
    e.preventDefault();
    if (!nyttNavn.trim()) return setFeil('Gi ligaen et navn.');
    utfor(async () => {
      const liga = await backend.opprettLiga(nyttNavn.trim());
      setNyttNavn('');
      setMelding(`«${liga.navn}» er opprettet. Del koden ${liga.kode} med vennene dine!`);
    });
  };

  const blimed = (e) => {
    e.preventDefault();
    if (!kode.trim()) return setFeil('Skriv inn en kode.');
    utfor(async () => {
      const liga = await backend.blimedILiga(kode);
      setKode('');
      ferdigMedInvitasjon();
      setMelding(`Du er nå med i «${liga.navn}».`);
    });
  };

  const forlat = (liga) => {
    // Første trykk ber om bekreftelse, andre trykk forlater
    if (bekreftForlat !== liga.id) return setBekreftForlat(liga.id);
    setBekreftForlat(null);
    utfor(() => backend.forlatLiga(liga.id));
  };

  return (
    <section>
      <h1 className="sidetittel">Ligaer</h1>

      {feil && <div className="melding feil" role="alert">{feil}</div>}
      {melding && <div className="melding ok" role="status">{melding}</div>}

      {ligaer === null ? (
        <div className="spinner midt" aria-label="Laster" />
      ) : (
        ligaer.length > 0 && (
          <ul className="liga-liste">
            {ligaer.map((l) => (
              <li key={l.id} className="kort liga">
                <button className="liga-hode" onClick={() => visTabell(l.id)}>
                  <strong>{l.navn}</strong>
                  <small>
                    {l.medlemmer.length} {l.medlemmer.length === 1 ? 'deltaker' : 'deltakere'}
                    {l.eier === bruker.uid && ' · du opprettet denne'}
                  </small>
                </button>
                <div className="liga-kode">
                  <span>
                    Kode: <code>{l.kode}</code>
                  </span>
                  <button className="knapp liten" onClick={() => del(l, setKopiert)}>
                    <Ikon navn={kopiert === l.id ? 'hake' : 'del'} width="16" height="16" />
                    {kopiert === l.id ? 'Kopiert!' : 'Inviter'}
                  </button>
                </div>
                {kopiert === `feil:${l.id}` && (
                  <p className="dempet invitasjon-tekst">
                    Kopier og send denne: Bli med i «{l.navn}» på Skjermtidsligaen! Koden er {l.kode}. {invitasjonslenke(l.kode)}
                  </p>
                )}
                <button className="lenke fare" onClick={() => forlat(l)} disabled={jobber}>
                  {bekreftForlat === l.id ? 'Trykk igjen for å forlate (du kan bli med igjen med koden)' : 'Forlat ligaen'}
                </button>
              </li>
            ))}
          </ul>
        )
      )}

      <form className="kort" onSubmit={blimed}>
        <h2>Bli med i en liga</h2>
        <p className="dempet">Skriv inn koden du har fått fra en venn.</p>
        <div className="rad-skjema">
          <input
            value={kode}
            onChange={(e) => setKode(e.target.value.toUpperCase())}
            placeholder="F.eks. K7M2QX"
            maxLength={8}
            autoCapitalize="characters"
            autoComplete="off"
            className="kode-felt"
            aria-label="Ligakode"
          />
          <button className="knapp primar" disabled={jobber}>
            Bli med
          </button>
        </div>
      </form>

      <form className="kort" onSubmit={opprett}>
        <h2>Opprett ny liga</h2>
        <p className="dempet">Du får en kode som vennene dine kan bruke for å bli med.</p>
        <div className="rad-skjema">
          <input value={nyttNavn} onChange={(e) => setNyttNavn(e.target.value)} placeholder="F.eks. Klasse 10B" maxLength={40} aria-label="Navn på ligaen" />
          <button className="knapp primar" disabled={jobber}>
            Opprett
          </button>
        </div>
      </form>
    </section>
  );
}
