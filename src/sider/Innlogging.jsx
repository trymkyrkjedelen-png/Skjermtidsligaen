import { useState } from 'react';
import { backend, feilmelding } from '../backend/index.js';
import { Ikon } from '../komponenter/Ikon.jsx';

export default function Innlogging({ demo, harInvitasjon }) {
  const [modus, setModus] = useState('logg-inn'); // logg-inn | ny | glemt
  const [navn, setNavn] = useState('');
  const [epost, setEpost] = useState('');
  const [passord, setPassord] = useState('');
  const [feil, setFeil] = useState('');
  const [info, setInfo] = useState('');
  const [jobber, setJobber] = useState(false);

  async function utfor(fn) {
    setFeil('');
    setJobber(true);
    try {
      await fn();
    } catch (e) {
      setFeil(feilmelding(e));
    } finally {
      setJobber(false);
    }
  }

  function send(e) {
    e.preventDefault();
    setInfo('');
    if (modus === 'ny') {
      if (!navn.trim()) return setFeil('Skriv inn et navn vennene dine kjenner deg igjen på.');
      utfor(async () => {
        const { bekreftEpost } = await backend.registrer({ navn: navn.trim(), epost: epost.trim(), passord });
        if (bekreftEpost) {
          setModus('logg-inn');
          setInfo(`Nesten ferdig! Vi har sendt en e-post til ${epost.trim()}. Trykk på lenken i den for å bekrefte kontoen.`);
        }
      });
    } else if (modus === 'glemt') {
      utfor(async () => {
        await backend.tilbakestillPassord(epost.trim());
        setInfo('Hvis det finnes en konto med denne adressen, har vi sendt deg en e-post med lenke for å lage nytt passord.');
      });
    } else {
      utfor(() => backend.loggInn({ epost: epost.trim(), passord }));
    }
  }

  const byttTil = (m) => {
    setModus(m);
    setFeil('');
    setInfo('');
  };

  return (
    <div className="innlogging">
      <div className="innlogging-hode">
        <span className="logo-merke stor">
          <Ikon navn="mobil" />
        </span>
        <h1>Skjermtidsligaen</h1>
        <p>Konkurrer med vennene dine om minst skjermtid. Den som bruker mobilen minst, vinner.</p>
      </div>

      {harInvitasjon && <div className="melding info">Du er invitert til en liga! Logg inn eller opprett konto for å bli med.</div>}
      {demo && (
        <div className="melding demo">
          Demomodus: data lagres bare i denne nettleseren. Du kan finne på hvilken som helst e-post.
        </div>
      )}

      <div className="kort">
        {modus !== 'glemt' && (
          <div className="segment" role="tablist">
            <button role="tab" aria-selected={modus === 'logg-inn'} className={modus === 'logg-inn' ? 'aktiv' : ''} onClick={() => byttTil('logg-inn')}>
              Logg inn
            </button>
            <button role="tab" aria-selected={modus === 'ny'} className={modus === 'ny' ? 'aktiv' : ''} onClick={() => byttTil('ny')}>
              Ny konto
            </button>
          </div>
        )}
        {modus === 'glemt' && (
          <>
            <h2>Glemt passord</h2>
            <p className="dempet">Skriv inn e-postadressen din, så sender vi deg en lenke.</p>
          </>
        )}

        <form onSubmit={send} className="skjema">
          {modus === 'ny' && (
            <label>
              Navn
              <input value={navn} onChange={(e) => setNavn(e.target.value)} autoComplete="nickname" maxLength={30} placeholder="F.eks. Kari" />
            </label>
          )}
          <label>
            E-post
            <input type="email" value={epost} onChange={(e) => setEpost(e.target.value)} autoComplete="email" inputMode="email" required />
          </label>
          {modus !== 'glemt' && (
            <label>
              Passord
              <input
                type="password"
                value={passord}
                onChange={(e) => setPassord(e.target.value)}
                autoComplete={modus === 'ny' ? 'new-password' : 'current-password'}
                minLength={6}
                required
              />
              {modus === 'ny' && <small>Minst 6 tegn.</small>}
            </label>
          )}

          {feil && <div className="melding feil" role="alert">{feil}</div>}
          {info && <div className="melding ok">{info}</div>}

          <button className="knapp primar" disabled={jobber}>
            {jobber ? 'Vent litt …' : modus === 'ny' ? 'Opprett konto' : modus === 'glemt' ? 'Send lenke' : 'Logg inn'}
          </button>
        </form>

        {modus === 'logg-inn' && (
          <button className="lenke" onClick={() => byttTil('glemt')}>
            Glemt passordet?
          </button>
        )}
        {modus === 'glemt' && (
          <button className="lenke" onClick={() => byttTil('logg-inn')}>
            Tilbake til innlogging
          </button>
        )}

        {modus !== 'glemt' && (
          <>
            <div className="skille">
              <span>eller</span>
            </div>
            <button
              className="knapp google"
              onClick={() => {
                setInfo('');
                utfor(() => backend.loggInnGoogle());
              }}
              disabled={jobber}
            >
              <Ikon navn="google" /> Fortsett med Google
            </button>
          </>
        )}
      </div>
    </div>
  );
}
