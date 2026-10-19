import { useEffect, useState } from 'react';
import { backend } from '../backend/index.js';
import { formaterMinutter, iDag, leggTilDager, manedTekst, pentDato, periode, ukenummer } from '../lib/dato.js';
import { lagTabell } from '../lib/poeng.js';
import { Ikon } from '../komponenter/Ikon.jsx';

const PERIODER = [
  { id: 'dag', navn: 'I dag' },
  { id: 'uke', navn: 'Uke' },
  { id: 'maned', navn: 'Måned' },
];

function flytt(type, dato, retning) {
  if (type === 'dag') return leggTilDager(dato, retning);
  if (type === 'uke') return leggTilDager(dato, 7 * retning);
  const [y, m] = dato.split('-').map(Number);
  const d = new Date(y, m - 1 + retning, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function periodeTekst(type, p) {
  if (type === 'dag') return pentDato(p.fra);
  if (type === 'uke') return `Uke ${ukenummer(p.fra)}`;
  return manedTekst(p.fra).replace(/^./, (c) => c.toUpperCase());
}

function initialer(navn) {
  return navn
    .split(/\s+/)
    .map((d) => d[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function Tabell({ bruker, ligaer, aktivLiga, velgLiga, versjon, gaTil }) {
  const [type, setType] = useState('uke');
  const [dato, setDato] = useState(iDag());
  const [data, setData] = useState(null);
  const [feil, setFeil] = useState(false);

  const p = periode(type, dato);
  const erNa = p.til >= iDag();

  useEffect(() => {
    if (!aktivLiga) return;
    let aktiv = true;
    setData(null);
    setFeil(false);
    backend
      .ligaData(aktivLiga, p.fra, p.til)
      .then((d) => aktiv && setData(lagTabell(d.medlemmer, d.registreringer)))
      .catch(() => aktiv && setFeil(true));
    return () => {
      aktiv = false;
    };
  }, [aktivLiga?.id, aktivLiga?.medlemmer?.length, p.fra, p.til, versjon]);

  if (ligaer === null) return <div className="spinner midt" aria-label="Laster" />;

  if (ligaer.length === 0) {
    return (
      <section className="tom">
        <Ikon navn="gruppe" width="48" height="48" />
        <h2>Du er ikke med i noen liga ennå</h2>
        <p>Opprett en liga og del koden med vennene dine, eller bli med i en som allerede finnes.</p>
        <button className="knapp primar" onClick={() => gaTil('ligaer')}>
          Kom i gang
        </button>
      </section>
    );
  }

  const minRad = data?.rangert.find((r) => r.uid === bruker.uid);
  const manglerIDag = data && type === 'dag' && dato === iDag() && !minRad;

  return (
    <section>
      {ligaer.length > 1 ? (
        <div className="liga-velger" role="tablist" aria-label="Velg liga">
          {ligaer.map((l) => (
            <button key={l.id} role="tab" aria-selected={l.id === aktivLiga.id} className={'brikke' + (l.id === aktivLiga.id ? ' aktiv' : '')} onClick={() => velgLiga(l.id)}>
              {l.navn}
            </button>
          ))}
        </div>
      ) : (
        <h1 className="sidetittel">{aktivLiga.navn}</h1>
      )}

      <div className="segment">
        {PERIODER.map((x) => (
          <button
            key={x.id}
            className={type === x.id ? 'aktiv' : ''}
            onClick={() => {
              setType(x.id);
              setDato(iDag());
            }}
          >
            {x.navn}
          </button>
        ))}
      </div>

      <div className="periode-nav">
        <button className="ikonknapp" onClick={() => setDato(flytt(type, dato, -1))} aria-label="Forrige periode">
          <Ikon navn="venstre" />
        </button>
        <span>{periodeTekst(type, p)}</span>
        <button className="ikonknapp" onClick={() => setDato(flytt(type, dato, 1))} disabled={erNa} aria-label="Neste periode">
          <Ikon navn="hoyre" />
        </button>
      </div>

      {manglerIDag && (
        <button className="melding info klikkbar" onClick={() => gaTil('registrer')}>
          Du har ikke registrert skjermtid i dag. Trykk her for å legge den inn.
        </button>
      )}

      {feil && <div className="melding feil">Kunne ikke hente tabellen. Sjekk nettforbindelsen.</div>}
      {!data && !feil && <div className="spinner midt" aria-label="Laster" />}

      {data && (
        <>
          {data.rangert.length === 0 ? (
            <p className="dempet midttekst">Ingen har registrert skjermtid i denne perioden ennå.</p>
          ) : (
            <ol className="tabell">
              {data.rangert.map((r) => (
                <li key={r.uid} className={'rad' + (r.uid === bruker.uid ? ' meg' : '') + (r.plass <= 3 ? ` topp${r.plass}` : '')}>
                  <span className="plass">{r.plass <= 3 ? ['🥇', '🥈', '🥉'][r.plass - 1] : r.plass}</span>
                  <span className="avatar">{initialer(r.navn)}</span>
                  <span className="navn">
                    {r.navn}
                    {r.uid === bruker.uid && <em> (deg)</em>}
                    {type !== 'dag' && (
                      <small>
                        {r.dager} {r.dager === 1 ? 'dag' : 'dager'} registrert
                      </small>
                    )}
                  </span>
                  <span className="tid">
                    {formaterMinutter(r.snitt)}
                    {type !== 'dag' && <small>snitt per dag</small>}
                  </span>
                </li>
              ))}
            </ol>
          )}

          {data.uregistrert.length > 0 && (
            <div className="uregistrert">
              <h3>Ikke registrert</h3>
              <p>{data.uregistrert.map((r) => r.navn + (r.uid === bruker.uid ? ' (deg)' : '')).join(', ')}</p>
            </div>
          )}

          {type !== 'dag' && <p className="forklaring">Rangeringen bygger på snittet per dag du har registrert. Lavest snitt vinner.</p>}
        </>
      )}
    </section>
  );
}
