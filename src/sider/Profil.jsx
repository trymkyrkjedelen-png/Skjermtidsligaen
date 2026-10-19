import { useState } from 'react';
import { backend, feilmelding } from '../backend/index.js';

export default function Profil({ bruker, demo, nyttPassord, ferdigMedPassord }) {
  const [navn, setNavn] = useState(bruker.navn);
  const [status, setStatus] = useState(null);
  const [passord, setPassord] = useState('');
  const [passordStatus, setPassordStatus] = useState(null);
  const [jobber, setJobber] = useState(false);
  const [bekreftNullstill, setBekreftNullstill] = useState(false);

  async function lagre(e) {
    e.preventDefault();
    if (!navn.trim()) return setStatus({ type: 'feil', tekst: 'Navnet kan ikke være tomt.' });
    setJobber(true);
    try {
      await backend.oppdaterNavn(navn.trim());
      setStatus({ type: 'ok', tekst: 'Navnet er oppdatert.' });
    } catch (err) {
      setStatus({ type: 'feil', tekst: feilmelding(err) });
    } finally {
      setJobber(false);
    }
  }

  async function byttPassord(e) {
    e.preventDefault();
    setJobber(true);
    try {
      await backend.endrePassord(passord);
      setPassord('');
      setPassordStatus({ type: 'ok', tekst: 'Passordet er endret.' });
      ferdigMedPassord();
    } catch (err) {
      setPassordStatus({ type: 'feil', tekst: feilmelding(err) });
    } finally {
      setJobber(false);
    }
  }

  return (
    <section>
      <h1 className="sidetittel">Profil</h1>

      {nyttPassord && <div className="melding info">Velg et nytt passord nedenfor.</div>}

      <form className="kort skjema" onSubmit={lagre}>
        <label>
          Visningsnavn
          <input value={navn} onChange={(e) => setNavn(e.target.value)} maxLength={30} />
          <small>Dette er navnet vennene dine ser i tabellen.</small>
        </label>
        <label>
          E-post
          <input value={bruker.epost ?? ''} disabled />
        </label>
        {status && <div className={'melding ' + status.type}>{status.tekst}</div>}
        <button className="knapp primar" disabled={jobber || navn.trim() === bruker.navn}>
          Lagre
        </button>
      </form>

      <form className="kort skjema" onSubmit={byttPassord}>
        <label>
          {nyttPassord ? 'Nytt passord' : 'Bytt passord'}
          <input
            type="password"
            value={passord}
            onChange={(e) => setPassord(e.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
            autoFocus={nyttPassord}
          />
          <small>Minst 6 tegn.</small>
        </label>
        {passordStatus && <div className={'melding ' + passordStatus.type}>{passordStatus.tekst}</div>}
        <button className="knapp" disabled={jobber || passord.length < 6}>
          Lagre nytt passord
        </button>
      </form>

      <div className="kort">
        <h2>Slik fungerer det</h2>
        <ol className="regler">
          <li>Legg inn skjermtiden din hver dag (du kan rette opp de siste 7 dagene).</li>
          <li>Bare de du deler en liga med, kan se skjermtiden din.</li>
          <li>I dag-tabellen rangeres alle etter dagens skjermtid.</li>
          <li>Uke- og månedstabellen bruker snittet per registrerte dag. Lavest snitt vinner.</li>
          <li>Ved likt snitt vinner den som har registrert flest dager.</li>
        </ol>
      </div>

      <button className="knapp" onClick={() => backend.loggUt()}>
        Logg ut
      </button>
      {demo && (
        <button
          className="lenke fare"
          onClick={() => (bekreftNullstill ? backend.nullstillDemo() : setBekreftNullstill(true))}
        >
          {bekreftNullstill ? 'Trykk igjen for å slette alle demodata' : 'Nullstill demodata'}
        </button>
      )}
    </section>
  );
}
