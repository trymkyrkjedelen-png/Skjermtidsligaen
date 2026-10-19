import { useEffect, useRef, useState } from 'react';
import { backend, feilmelding } from '../backend/index.js';
import { formaterMinutter, iDag, kortDag, leggTilDager, pentDato } from '../lib/dato.js';
import { lesSkjermbilde } from '../lib/skjermbilde.js';

const DAGER_TILBAKE = 7;

export default function Registrer({ onLagret, gaTilTabell }) {
  const idag = iDag();
  const datoer = Array.from({ length: DAGER_TILBAKE }, (_, i) => leggTilDager(idag, -i));
  const [dato, setDato] = useState(idag);
  const [eksisterende, setEksisterende] = useState(null); // { dato: minutter }
  const [timer, setTimer] = useState('');
  const [min, setMin] = useState('');
  const [status, setStatus] = useState(null); // { type, tekst }
  const [jobber, setJobber] = useState(false);
  const [leser, setLeser] = useState(null); // null eller fremdrift 0–1
  const filvelger = useRef(null);
  const forslag = useRef(null); // tid lest fra skjermbilde, for en annen dag enn den som var valgt

  useEffect(() => {
    backend
      .mineRegistreringer(datoer.at(-1), idag)
      .then((liste) => setEksisterende(Object.fromEntries(liste.map((r) => [r.dato, r.minutter]))))
      .catch(() => setEksisterende({}));
  }, []);

  function vis(v) {
    setTimer(v != null ? String(Math.floor(v / 60)) : '');
    setMin(v != null ? String(v % 60) : '');
  }

  const lastet = eksisterende !== null;
  useEffect(() => {
    if (!lastet) return;
    if (forslag.current?.dato === dato) {
      vis(forslag.current.minutter);
      forslag.current = null;
      return;
    }
    vis(eksisterende[dato]);
    setStatus(null);
  }, [dato, lastet]);

  async function vedSkjermbilde(e) {
    const fil = e.target.files?.[0];
    e.target.value = '';
    if (!fil) return;
    setStatus(null);
    setLeser(0);
    try {
      const svar = await lesSkjermbilde(fil, idag, setLeser);
      if (svar.erSnitt) {
        setStatus({ type: 'feil', tekst: 'Dette ser ut som et daglig snitt for hele uka. Trykk på «Dag» øverst i Skjermtid, og ta et nytt skjermbilde.' });
      } else if (svar.minutter == null) {
        setStatus({ type: 'feil', tekst: 'Fant ikke skjermtiden i bildet. Sjekk at totalen (f.eks. «3 t 24 min») synes øverst, eller skriv den inn selv.' });
      } else if (svar.dato && !datoer.includes(svar.dato)) {
        setStatus({ type: 'feil', tekst: `Skjermbildet er fra ${pentDato(svar.dato).toLowerCase()}. Du kan bare registrere de siste ${DAGER_TILBAKE} dagene.` });
      } else {
        const d = svar.dato ?? dato;
        const tekst = svar.dato
          ? `Fant ${formaterMinutter(svar.minutter)} for ${pentDato(d).toLowerCase()}. Sjekk at det stemmer, og trykk Lagre.`
          : `Fant ${formaterMinutter(svar.minutter)}, men ikke datoen. Sjekk at riktig dag er valgt over, og trykk Lagre.`;
        setStatus({ type: 'ok', tekst });
        if (d === dato) vis(svar.minutter);
        else {
          forslag.current = { dato: d, minutter: svar.minutter };
          setDato(d);
        }
      }
    } catch {
      setStatus({ type: 'feil', tekst: 'Klarte ikke å lese bildet. Sjekk nettforbindelsen og prøv igjen, eller skriv inn tiden selv.' });
    } finally {
      setLeser(null);
    }
  }

  const t = parseInt(timer || '0', 10);
  const m = parseInt(min || '0', 10);
  const totalt = t * 60 + m;
  const gyldig = (timer !== '' || min !== '') && t >= 0 && m >= 0 && m < 60 && totalt <= 24 * 60;

  function juster(delta) {
    const ny = Math.min(24 * 60, Math.max(0, totalt + delta));
    setTimer(String(Math.floor(ny / 60)));
    setMin(String(ny % 60));
  }

  async function lagre(e) {
    e.preventDefault();
    if (!gyldig) {
      setStatus({ type: 'feil', tekst: totalt > 24 * 60 ? 'Et døgn har bare 24 timer 🙂' : 'Skriv inn timer og minutter.' });
      return;
    }
    setJobber(true);
    try {
      await backend.lagreRegistrering(dato, totalt);
      setEksisterende((x) => ({ ...x, [dato]: totalt }));
      setStatus({ type: 'ok', lagret: true, tekst: `Lagret ${formaterMinutter(totalt)} for ${pentDato(dato).toLowerCase()}.` });
      onLagret();
    } catch (err) {
      setStatus({ type: 'feil', tekst: feilmelding(err) });
    } finally {
      setJobber(false);
    }
  }

  async function slett() {
    setJobber(true);
    try {
      await backend.slettRegistrering(dato);
      setEksisterende((x) => {
        const { [dato]: _, ...rest } = x;
        return rest;
      });
      vis(null);
      setStatus(null);
      onLagret();
    } catch (err) {
      setStatus({ type: 'feil', tekst: feilmelding(err) });
    } finally {
      setJobber(false);
    }
  }

  return (
    <section>
      <h1 className="sidetittel">Registrer skjermtid</h1>

      <div className="dag-velger" role="tablist" aria-label="Velg dag">
        {datoer.map((d) => (
          <button key={d} role="tab" aria-selected={d === dato} className={'dag' + (d === dato ? ' aktiv' : '')} onClick={() => setDato(d)}>
            <span>{d === idag ? 'I dag' : kortDag(d)}</span>
            <strong>{Number(d.slice(8))}</strong>
            {eksisterende?.[d] != null && <i className="prikk" aria-label="registrert" />}
          </button>
        ))}
      </div>

      <div className="kort skjermbilde">
        <input ref={filvelger} type="file" accept="image/*" hidden onChange={vedSkjermbilde} />
        <button type="button" className="knapp primar" onClick={() => filvelger.current.click()} disabled={leser !== null}>
          {leser !== null ? `Leser skjermbildet … ${Math.round(leser * 100)} %` : '📷 Les av skjermbilde'}
        </button>
        <ol className="steg">
          <li>
            Åpne <strong>Innstillinger → Skjermtid → Se all aktivitet</strong>
          </li>
          <li>
            Velg <strong>Dag</strong>, og bla til riktig dag hvis det ikke er i dag
          </li>
          <li>Ta skjermbilde (sideknappen + volum opp), og velg det her</li>
        </ol>
        <p className="forklaring">Bildet leses på mobilen din og lastes ikke opp noe sted. Første gang tar det litt ekstra tid.</p>
      </div>

      <form className="kort" onSubmit={lagre}>
        <h2>{pentDato(dato)}</h2>
        <div className="tid-inndata">
          <label>
            <input type="number" inputMode="numeric" min="0" max="24" value={timer} onChange={(e) => setTimer(e.target.value)} placeholder="0" aria-label="Timer" />
            <span>timer</span>
          </label>
          <label>
            <input type="number" inputMode="numeric" min="0" max="59" value={min} onChange={(e) => setMin(e.target.value)} placeholder="0" aria-label="Minutter" />
            <span>min</span>
          </label>
        </div>
        <div className="hurtig">
          <button type="button" className="knapp liten" onClick={() => juster(-15)}>
            −15 min
          </button>
          <button type="button" className="knapp liten" onClick={() => juster(15)}>
            +15 min
          </button>
        </div>

        {status && <div className={'melding ' + status.type} role="status">{status.tekst}</div>}

        <button className="knapp primar" disabled={jobber || !eksisterende}>
          {eksisterende?.[dato] != null ? 'Oppdater' : 'Lagre'}
        </button>
        {eksisterende?.[dato] != null && (
          <button type="button" className="lenke fare" onClick={slett} disabled={jobber}>
            Slett registreringen
          </button>
        )}
        {status?.lagret && (
          <button type="button" className="lenke" onClick={gaTilTabell}>
            Se tabellen →
          </button>
        )}
      </form>

      <p className="forklaring midttekst-liten">Du kan registrere eller rette tiden for de siste {DAGER_TILBAKE} dagene.</p>
    </section>
  );
}
